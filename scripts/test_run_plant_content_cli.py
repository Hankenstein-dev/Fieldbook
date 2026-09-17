import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

import run_plant_content_cli as runner


def packet(tid):
    return {'taxonId': tid, 'scientificName': f'Plant {tid}',
            'sources': [{'passages': [{'id': f's1:p{tid}', 'text': 'A plant with leaves.'}]}]}


def output(tid):
    return {'taxonId': tid, 'summary': 'A plant with leaves.', 'humanEdibility': 'unknown',
            'edibilityNote': None, 'evidence': {'summary': [f's1:p{tid}'], 'humanEdibility': []}}


class BatchTests(unittest.TestCase):
    def test_quota_stops_before_next_attempt_and_retains_failure(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            ids = list(range(1, 21))
            manifest = {'count': 20, 'taxonIds': ids, 'batchSize': 10, 'timeoutSeconds': 300,
                        'batches': [{'id': 'batch-0001', 'taxonIds': ids[:10]},
                                    {'id': 'batch-0002', 'taxonIds': ids[10:]}]}
            for tid in ids:
                runner.write(base/f'{tid}-source.json', {'input': packet(tid)})
            def fake(*args, **kwargs):
                kwargs['stdout'].write(json.dumps({'type': 'error', 'message': "You've hit your usage limit."})+'\n')
                kwargs['stdout'].write(json.dumps({'type': 'turn.failed', 'error': {'message': "You've hit your usage limit."}})+'\n')
                return SimpleNamespace(returncode=1)
            with patch.object(runner, 'BASE', base), patch.object(runner.subprocess, 'run', side_effect=fake) as call:
                with self.assertRaisesRegex(SystemExit, 'provider account refusal'):
                    runner.run_batches(manifest, 20, 'prompt', ['codex'], {})
                self.assertEqual(call.call_count, 1)
            self.assertFalse((base/'batch-0002-attempt.json').exists())
            self.assertFalse((base/'11-result.json').exists())
            self.assertEqual(runner.read(base/'report.json')['failedCount'], 10)
            self.assertIsNone(runner.read(base/'batch-0001-result.json')['usage'])
            self.assertIn('usage limit', runner.read(base/'pause.json')['reason'])
            self.assertEqual((base/'batch-0001-output.txt').read_text().strip(), '')
            self.assertIsNone(runner.account_refusal([{'type': 'item.completed', 'item': {'type': 'agent_message', 'text': 'quota'}}]))

    def test_mapping_and_individual_validation(self):
        rows = [output(2), output(1)]
        checked = runner.decode_batch(json.dumps(rows), [packet(1), packet(2)])
        self.assertTrue(all(error is None for _, error in checked))
        self.assertEqual(checked[0][0]['evidence']['summary'], ['s1:p1'])
        rows[0]['evidence']['summary'] = ['s1:p1']
        checked = runner.decode_batch(json.dumps(rows), [packet(1), packet(2)])
        self.assertIsNone(checked[0][1])
        self.assertEqual(checked[1][1], 'Evidence IDs')

    def test_missing_duplicate_unknown_ids_and_non_json(self):
        for raw in ['plain text', '{}', json.dumps([output(1)]),
                    json.dumps([output(1), output(1)]), json.dumps([output(1), output(3)])]:
            with self.subTest(raw=raw):
                self.assertTrue(all(error for _, error in runner.decode_batch(raw, [packet(1), packet(2)])))

    def test_limits(self):
        self.assertEqual(runner.sentences('A plant. Both forms occur here. Subsp. exigua has tubercled seeds, while subsp. merinoi has grooves.'), 3)
        for replacement in [{'summary': 'One. Two. Three. Four.'}, {'summary': 'word '*76},
                            {'edibilityNote': 'word '*31}, {'summary': 'First.\n\nSecond.'}]:
            row = {**output(1), **replacement}
            self.assertIsNotNone(runner.decode_batch(json.dumps([row]), [packet(1)])[0][1])

    def test_execution_usage_malformed_timeout_and_resume(self):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            ids = list(range(1, 22))
            prompt = runner.PROMPT.read_text().rstrip('\n')
            manifest = {'count': 21, 'taxonIds': ids, 'model': runner.MODEL, 'reasoning': 'high',
                        'batchSize': 10, 'timeoutSeconds': 300,
                        'promptSha256': hashlib.sha256(prompt.encode()).hexdigest(),
                        'batches': [{'id': f'batch-{i//10+1:04d}', 'taxonIds': ids[i:i+10]} for i in range(0, 21, 10)]}
            runner.write(base/'manifest.json', manifest)
            (base/'prompt.txt').write_text(prompt+'\n')
            for tid in ids:
                runner.write(base/f'{tid}-source.json', {'input': packet(tid)})
            calls = []

            def fake(command, **kwargs):
                if 'login' in command:
                    return SimpleNamespace(returncode=0, stdout='ChatGPT', stderr='')
                plants = json.loads(kwargs['input'].split('\n\nPLANT INFORMATION\n')[1])
                calls.append(plants)
                self.assertEqual(kwargs['timeout'], 300)
                self.assertIn('request_max_retries=0', ' '.join(command))
                kwargs['stdout'].write(json.dumps({'type': 'turn.started'})+'\n')
                if len(calls) == 3:
                    raise subprocess.TimeoutExpired(command, 300)
                raw = json.dumps([output(p['taxonId']) for p in plants]) if len(calls) == 1 else 'Not JSON'
                events = [{'type': 'item.completed', 'item': {'type': 'agent_message', 'text': raw}},
                          {'type': 'turn.completed', 'usage': {'input_tokens': 100, 'cached_input_tokens': 50,
                                                              'output_tokens': 20, 'reasoning_output_tokens': 0}}]
                kwargs['stdout'].write('\n'.join(json.dumps(e) for e in events))
                return SimpleNamespace(returncode=0)

            with patch.object(sys, 'argv', ['runner', '--output', folder]), \
                 patch.object(runner.shutil, 'which', return_value='codex'), \
                 patch.object(runner.subprocess, 'run', side_effect=fake), \
                 patch.object(runner, 'BASE', base):
                runner.main()
                before = (base/'batch-0001-result.json').read_bytes()
                (base/'1-result.json').unlink()
                runner.main()
                self.assertEqual((base/'batch-0001-result.json').read_bytes(), before)
                self.assertTrue((base/'1-result.json').exists())
            self.assertEqual([len(p) for p in calls], [10, 10, 1])
            report = runner.read(base/'report.json')
            self.assertEqual(report['generationCallCount'], 3)
            self.assertEqual(report['validatedCount'], 10)
            self.assertEqual(report['failedCount'], 11)
            self.assertEqual(report['missingUsageCount'], 1)
            self.assertEqual(report['usage']['input_tokens'], 200)
            self.assertEqual((base/'batch-0002-output.txt').read_text().strip(), 'Not JSON')
            self.assertEqual((base/'outputs.html').read_text().count('<article>'), 21)


if __name__ == '__main__':
    unittest.main()
