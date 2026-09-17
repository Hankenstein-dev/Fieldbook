import tempfile
from pathlib import Path
import unittest

from scripts.collect_botanical_sources import build_index, collect


class BotanicalSourceTests(unittest.TestCase):
    def test_only_exact_names_and_ranks_with_descriptions_are_linked(self):
        dataset = {"key": "dataset", "scope": "Mainland; historical assessment"}
        metadata = {"data": {"title": "Botanical source", "license": "CC0"}}
        catalogue = [{"id": 1, "scientificName": "Example plant", "rank": "species"},
                     {"id": 2, "scientificName": "Example", "rank": "genus"}]
        records = {1: {"key": 1, "canonicalName": "Example plant", "rank": "SPECIES", "descriptions": [{"description": "Habitat evidence"}]},
                   2: {"key": 2, "canonicalName": "Example plant minor", "rank": "SUBSPECIES", "descriptions": [{"description": "Subspecies only"}]},
                   3: {"key": 3, "canonicalName": "Example", "rank": "GENUS", "descriptions": []}}
        result = build_index(catalogue, dataset, metadata, records)
        self.assertEqual(set(result), {"1"})
        self.assertEqual(result["1"][0]["scope"], dataset["scope"])
        self.assertEqual(result["1"][0]["license"], "CC0")

    def test_hybrid_marker_is_not_discarded_during_matching(self):
        dataset = {"key": "dataset", "scope": "Test"}
        metadata = {"data": {"title": "Source", "license": "CC0"}}
        catalogue = [{"id": 1, "scientificName": "Example × plant", "rank": "species"}]
        records = {1: {"key": 1, "canonicalName": "Example plant", "rank": "SPECIES", "descriptions": [{"description": "Evidence"}]}}
        self.assertEqual(build_index(catalogue, dataset, metadata, records), {})

    def test_dataset_collection_checks_total_and_saves_original_pages(self):
        class FakeClient:
            def get(self, url, params):
                if "dataset/" in url:
                    data = {"title": "Source"}
                else:
                    offset = params["offset"]
                    data = {"count": 2, "limit": 1, "endOfRecords": offset == 1,
                            "results": [{"key": offset + 1, "datasetKey": "example"}]}
                return {"url": url, "fetchedAt": "original-date", "data": data}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            metadata, records, sources = collect(FakeClient(), {"key": "example"}, output)
            self.assertEqual(set(records), {1, 2})
            self.assertEqual(len(sources), 2)
            self.assertTrue((output / "example/page-1.json").exists())


if __name__ == "__main__":
    unittest.main()
