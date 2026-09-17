import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.seed_stories import (Client, analyse, article_sections, fetch_summaries,
                                 keyword_matches, narrative_text, needs_scope_review,
                                 resolve_pages, species_counts, wikipedia_title)


class SeedTests(unittest.TestCase):
    def test_full_article_fetch_does_not_request_intro_or_length_limit(self):
        class FakeClient:
            def get(self, base, params):
                assert not any(key in params for key in ("exintro", "exchars", "exsentences"))
                assert params["exlimit"] == 1
                assert "|" not in params["titles"]
                return {"url": base, "fetchedAt": "test", "data": {"query": {"pages": [
                    {"title": params["titles"], "extract": "Intro.\n\n== Uses ==\nUsed to make dye."}
                ]}}}
        result = fetch_summaries(FakeClient(), {1: {"wikipedia_url": "https://en.wikipedia.org/wiki/Example"}}, True)
        self.assertIn("Used to make dye", result[("en", "Example")]["page"]["extract"])

    def test_article_analysis_keeps_body_cues_and_skips_reference_titles(self):
        text = "Intro.\n\n== Uses ==\nThe roots produce a dye.\n=== History ===\nUsed to make ink.\n== References ==\nPoisonous plants book."
        self.assertEqual([s["heading"] for s in article_sections(text)],
                         ["Introduction", "Uses", "History", "References"])
        self.assertIn("Used to make ink.", narrative_text(text))
        self.assertNotIn("Poisonous", narrative_text(text))
        record = {"taxon": {"id": 1}, "names": {}, "wikipediaArticle": {
            "status": "ok", "language": "en", "page": {"extract": text}}}
        settings = {"summaryLanguage": "en", "thinSummaryWords": 60,
                    "keywords": {"cultural": ["used to make"], "toxic": ["poisonous"]}}
        report = analyse([record], settings, [], "wikipediaArticle")
        self.assertEqual(report["candidateTags"], {"cultural": 1, "toxic": 0})
        self.assertEqual(record["articleKeywordMatches"][0]["sentence"], "Used to make ink.")

    def test_broad_genus_pages_require_source_scope_review(self):
        wiki = {"status": "ok", "page": {"title": "Example", "extract": "Example one is a species."}}
        self.assertTrue(needs_scope_review({"name": "Example one"}, wiki))
        wiki["page"]["title"] = "Example one"
        self.assertFalse(needs_scope_review({"name": "Example one"}, wiki))

    def test_backmatter_subsections_are_excluded_until_next_peer_heading(self):
        text = "Intro.\n== Sources ==\n=== Books ===\nToxic plants.\n==== Volume 1 ====\nEdible roots.\n== Ecology ==\nPollinated by bees.\n== Gallery ==\nMedicinal plants."
        result = narrative_text(text)
        self.assertIn("Pollinated by bees.", result)
        for word in ("Toxic", "Edible", "Medicinal"):
            self.assertNotIn(word, result)

    def test_wikipedia_link_decodes_title_and_rejects_other_hosts(self):
        self.assertEqual(wikipedia_title("http://en.wikipedia.org/wiki/Rosa_%C3%97_alba#Uses"),
                         ("en", "Rosa × alba"))
        self.assertIsNone(wikipedia_title("https://en.wikipedia.org.example.com/wiki/Rosa"))
        self.assertIsNone(wikipedia_title(None))

    def test_redirect_chain_and_missing_page(self):
        page = {"title": "Accepted name", "extract": "A useful introduction."}
        missing = {"title": "Absent", "missing": True}
        data = {"query": {
            "normalized": [{"from": "Old_name", "to": "Old name"}],
            "redirects": [{"from": "Old name", "to": "Accepted name"}],
            "pages": [page, missing],
        }}
        self.assertEqual(resolve_pages(data, ["Old_name", "Absent"]), {"Old_name": page, "Absent": missing})
        with self.assertRaisesRegex(RuntimeError, "no page result"):
            resolve_pages(data, ["Unexpected"])

    def test_keyword_boundaries_and_negation_keep_original_evidence(self):
        text = "The roots are inedible. The fruit is not edible. It was USED TO MAKE baskets."
        matches = keyword_matches(text, {"edible": ["edible"], "cultural": ["used to make"]})
        self.assertEqual(len(matches), 2)
        self.assertEqual(matches[0]["sentence"], "The fruit is not edible.")
        self.assertEqual(matches[1]["sentence"], "It was USED TO MAKE baskets.")

    def test_tally_counts_taxa_once_but_all_keyword_occurrences(self):
        record = {"taxon": {"id": 1}, "names": {"en": ["Example"]}, "wikipedia": {
            "status": "ok", "language": "en", "page": {"extract": "Edible seeds. Edible leaves."}}}
        missing = {"taxon": {"id": 2}, "names": {}, "wikipedia": {"status": "no_link"}}
        settings = {"summaryLanguage": "en", "thinSummaryWords": 60, "keywords": {"edible": ["edible"]}}
        report = analyse([record, missing], settings, ["en", "pt"])
        self.assertEqual(report["keywords"]["edible"], {"taxa": 1, "occurrences": 2})
        self.assertEqual(report["candidateTags"], {"edible": 1})
        self.assertEqual(report["thinSummaryTaxonIds"], [1])
        self.assertEqual(report["summaryStatus"], {"ok": 1, "no_link": 1})
        self.assertEqual(report["nameCoverage"], {"en": 1, "pt": 0})

    def test_pagination_uses_reported_total_not_short_page_length(self):
        class FakeClient:
            def get(self, base, params):
                page = params["page"]
                ids = [1, 2] if page == 1 else [2, 3]
                return {"url": str(page), "fetchedAt": "test", "data": {
                    "total_results": 3, "results": [{"taxon": {"id": value}, "count": 10 - value} for value in ids]}}
        rows, sources, total = species_counts(FakeClient(), {"iNatPlaceId": 1}, {"iconicTaxa": ["Example"]}, "en", 3)
        self.assertEqual([row["taxon"]["id"] for row in rows], [1, 2, 3])
        self.assertEqual(len(sources), 2)
        self.assertEqual(total, 3)

    def test_failed_request_is_not_cached_and_offline_never_connects(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory)
            with patch("scripts.seed_stories.urlopen") as network:
                with self.assertRaisesRegex(RuntimeError, "Offline cache miss"):
                    Client(cache, offline=True).get("https://example.org", {})
                network.assert_not_called()
                network.return_value.__enter__.return_value.read.return_value = json.dumps({"error": "bad request"})
                with self.assertRaisesRegex(RuntimeError, "API error"):
                    Client(cache).get("https://example.org", {})
                self.assertEqual(list(cache.iterdir()), [])

    def test_successful_response_replays_from_cache_without_network(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch("scripts.seed_stories.urlopen") as network:
                network.return_value.__enter__.return_value.read.return_value = '{"results": []}'
                expected = Client(Path(directory)).get("https://example.org", {"page": 1})
            with patch("scripts.seed_stories.urlopen", side_effect=AssertionError("network forbidden")):
                self.assertEqual(Client(Path(directory), offline=True).get("https://example.org", {"page": 1}), expected)


if __name__ == "__main__":
    unittest.main()
