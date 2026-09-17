from copy import deepcopy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from scripts.review_stories import validate


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        text = "Example plant.\n\n== Ecology ==\nAnts carry its seeds."
        url = "https://en.wikipedia.org/wiki/Example_plant"
        rights = "https://creativecommons.org/licenses/by-sa/4.0/"
        wiki = {"language": "en", "rights": {"url": rights}, "page": {
            "extract": text, "canonicalurl": url, "lastrevid": 42}}
        (self.root / "source.json").write_text(json.dumps({"wikipediaArticle": wiki}))
        source = {"id": "example", "title": "Example plant", "url": url,
                  "revisionId": 42, "revisionUrl": "https://en.wikipedia.org/w/index.php?oldid=42",
                  "license": "CC-BY-SA-4.0", "licenseUrl": rights,
                  "attribution": "Wikipedia contributors", "adaptation": "Rewritten."}
        self.package = {"schemaVersion": 1, "country": "test", "group": "test", "stories": [
            {"taxonId": 1, "summary": "Ants help this plant spread by carrying its seeds.",
             "tags": [], "reviewStatus": "draft", "sources": [source]}]}
        self.review = {"schemaVersion": 1, "country": "test", "group": "test", "coverage": [
            {"taxonId": 1, "status": "draft", "sourceScope": "linked-species", "evidence": [
                {"sourceId": "example", "rawFile": "source.json", "rawField": "wikipediaArticle",
                 "extractSha256": hashlib.sha256(text.encode()).hexdigest(),
                 "passages": [{"section": "Ecology", "text": "Ants carry its seeds."}]}]},
            {"taxonId": 2, "status": "needs_research", "reason": "The linked source is missing."}]}
        self.records = {1: {}, 2: {}}

    def check(self, package=None, review=None):
        return validate(package or self.package, review or self.review, self.records, self.root)

    def test_valid_draft_and_research_gap_are_both_accounted_for(self):
        stories, coverage = self.check()
        self.assertEqual(set(stories), {1})
        self.assertEqual(set(coverage), {1, 2})

    def test_missing_or_duplicate_coverage_is_rejected(self):
        review = deepcopy(self.review)
        review["coverage"].pop()
        with self.assertRaisesRegex(ValueError, "every manifest taxon"):
            self.check(review=review)
        review["coverage"].append(deepcopy(review["coverage"][0]))
        with self.assertRaisesRegex(ValueError, "Duplicate coverage"):
            self.check(review=review)

    def test_paraphrase_cannot_be_passed_off_as_verbatim_evidence(self):
        self.review["coverage"][0]["evidence"][0]["passages"][0]["text"] = "Bees carry its seeds."
        with self.assertRaisesRegex(ValueError, "not verbatim"):
            self.check()

    def test_changed_source_requires_another_evidence_review(self):
        path = self.root / "source.json"
        raw = json.loads(path.read_text())
        raw["wikipediaArticle"]["page"]["extract"] += "\nNew material."
        path.write_text(json.dumps(raw))
        with self.assertRaisesRegex(ValueError, "Source changed"):
            self.check()

    def test_wrong_revision_and_missing_attribution_are_rejected(self):
        package = deepcopy(self.package)
        package["stories"][0]["sources"][0]["revisionUrl"] = "https://en.wikipedia.org/w/index.php?oldid=1"
        with self.assertRaisesRegex(ValueError, "Wrong revision"):
            self.check(package=package)
        self.package["stories"][0]["sources"][0]["attribution"] = ""
        with self.assertRaisesRegex(ValueError, "Missing attribution"):
            self.check()

    def test_unresolved_lookalike_and_placeholder_story_are_rejected(self):
        package = deepcopy(self.package)
        package["stories"][0]["tags"] = ["lookalike-of:999"]
        with self.assertRaisesRegex(ValueError, "Unresolved lookalike"):
            self.check(package=package)
        self.package["stories"][0]["summary"] = " "
        with self.assertRaisesRegex(ValueError, "Empty story"):
            self.check()


if __name__ == "__main__":
    unittest.main()
