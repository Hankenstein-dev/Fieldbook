import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from scripts.collect_plant_sources import (SourceClient, article_record, cached_taxonomy, digest,
                                          make_record, query_pages, source_scope,
                                          fetch_historical_sources, historical_names, needs_fallback, retained_articles, validate_collection, write_json)


class SourceCollectionTests(unittest.TestCase):
    def test_historical_name_pass_retains_evidence_and_resumes_without_taxonomy_requests(self):
        catalogue = [{"id": 1, "scientificName": "Current name", "rank": "species"}]
        taxon = {"id": 1, "name": "Current name", "names": [{"name": "Old name", "locale": "sci", "is_valid": False}]}
        class FakeClient:
            def get(self, url, params):
                return {"url": url, "fetchedAt": "original-date", "data": {"results": [taxon]}}
        def initial():
            return {1: {("en", "Current name")}}, {("en", "Current name"): {"status": "missing", "title": "Current name"}}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            targets, articles = initial()
            with patch("scripts.collect_plant_sources.fetch_articles"):
                evidence = fetch_historical_sources(FakeClient(), catalogue, targets, articles, {}, output, 50, ["en", "pt"])
            self.assertIn(("en", "Old name"), targets[1])
            self.assertEqual(json.loads((output / evidence[1]["path"]).read_text())["taxon"], taxon)
            targets, articles = initial()
            with patch.object(FakeClient, "get", side_effect=AssertionError("network forbidden")):
                with patch("scripts.collect_plant_sources.fetch_articles"):
                    self.assertEqual(fetch_historical_sources(FakeClient(), catalogue, targets, articles, {}, output, 50, ["en", "pt"]), evidence)

    def test_historical_name_candidates_include_invalid_scientific_names_but_not_common_names(self):
        taxon = {"name": "Current name", "names": [
            {"name": "Current name", "locale": "sci", "is_valid": True},
            {"name": "Old name", "lexicon": "scientific-names", "is_valid": False},
            {"name": "Alternate spelling", "locale": "sci", "is_valid": False},
            {"name": "Common nickname", "locale": "en", "is_valid": True}]}
        self.assertEqual(historical_names(taxon), ["Alternate spelling", "Old name"])

    def test_maxlag_retry_does_not_mistake_request_parameter_for_error_code(self):
        with patch("scripts.collect_plant_sources.Client.get", side_effect=RuntimeError("HTTP 404: https://example.org?maxlag=5")) as request:
            with patch("scripts.collect_plant_sources.time.sleep") as sleep:
                with self.assertRaisesRegex(RuntimeError, "HTTP 404"):
                    SourceClient(Path("/unused")).get("https://example.org", {"maxlag": 5})
                self.assertEqual(request.call_count, 1)
                sleep.assert_not_called()
        expected = {"data": "success"}
        with patch("scripts.collect_plant_sources.Client.get", side_effect=[RuntimeError("API error: {'code': 'maxlag'}"), expected]):
            with patch("scripts.collect_plant_sources.time.sleep"):
                self.assertEqual(SourceClient(Path("/unused")).get("https://example.org", {}), expected)

    def test_revision_fetch_merges_continuation_and_redirects_without_truncation(self):
        class FakeClient:
            def get(self, base, params):
                self.assertions(params)
                if "llcontinue" not in params:
                    return {"url": base, "fetchedAt": "first", "data": {
                        "continue": {"llcontinue": "next", "continue": "||"},
                        "query": {"redirects": [{"from": "Old name", "to": "New name"}],
                                  "rightsinfo": {"text": "CC BY-SA"}, "pages": [{
                                      "title": "New name", "pageid": 1, "revisions": [{
                                          "revid": 99, "slots": {"main": {"content": "Whole article\n== References ==\n{{cite journal|title=Evidence}}"}}}]}]}}}
                return {"url": base, "fetchedAt": "second", "data": {"query": {"pages": [{
                    "title": "New name", "pageid": 1, "langlinks": [{"lang": "pt", "title": "Nome"}]}]}}}

            def assertions(self, params):
                assert params["rvslots"] == "main"
                assert "content" in params["rvprop"]
                assert not any(key in params for key in ("rvsection", "exintro", "exchars", "rvlimit"))

        pages, rights, requests = query_pages(FakeClient(), "en", ["Old name"], "pt")
        article = article_record("en", "Old name", pages["Old name"], rights, requests)
        self.assertEqual(article["revisionId"], 99)
        self.assertIn("{{cite journal|title=Evidence}}", article["wikitext"])
        self.assertEqual(article["contentSha256"], digest(article["wikitext"]))
        self.assertEqual(article["languageLinks"][0]["title"], "Nome")
        self.assertEqual(len(article["requests"]), 2)

    def test_missing_disambiguation_and_hidden_content_are_not_available(self):
        for page, status in [({"title": "Absent", "missing": True}, "missing"),
                             ({"title": "Ambiguous", "pageprops": {"disambiguation": ""}}, "disambiguation"),
                             ({"title": "Hidden", "revisions": [{"revid": 1}]}, "empty")]:
            self.assertEqual(article_record("en", page["title"], page, {}, [])["status"], status)

    def test_genus_redirect_is_not_species_coverage(self):
        taxon = {"scientificName": "Solanum chenopodioides"}
        article = {"status": "available", "title": "Solanum"}
        self.assertEqual(source_scope(taxon, article), "broader_taxon_page")
        article["title"] = "Solanum chenopodioides"
        self.assertEqual(source_scope(taxon, article), "title_matches_scientific_name")
        article["title"] = "A common name"
        self.assertEqual(source_scope(taxon, article), "needs_taxon_review")

    def test_fallback_runs_for_missing_or_broader_pages_but_not_matched_botanical_sources(self):
        taxon = {"scientificName": "Solanum chenopodioides"}
        target = ("en", "Solanum chenopodioides")
        articles = {target: {"status": "available", "title": "Solanum"}}
        self.assertTrue(needs_fallback(taxon, {target}, articles, []))
        self.assertFalse(needs_fallback(taxon, {target}, articles, [{"source": "Botanical description"}]))
        articles[target]["title"] = "Solanum chenopodioides"
        self.assertFalse(needs_fallback(taxon, {target}, articles, []))

    def test_cached_provider_records_preserve_original_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            taxon = {"id": 1, "name": "Example plant", "wikipedia_url": None}
            write_json(path / "response.json", {"url": "https://example.org", "fetchedAt": "yesterday",
                                                 "data": {"results": [{"taxon": taxon}, {"taxon": {"id": 2}}]}})
            result = cached_taxonomy([{"id": 1}], [path])
            self.assertEqual(set(result), {1})
            self.assertEqual(result[1]["taxon"], taxon)
            self.assertEqual(result[1]["fetchedAt"], "yesterday")
            self.assertEqual(result[1]["sourceUrl"], "https://example.org")

    def test_collection_validation_detects_altered_evidence_and_incomplete_runs(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            taxon = {"id": 1, "scientificName": "Example plant", "rank": "species"}
            raw = {"taxon": {"id": 1, "name": "Example plant"}}
            raw["recordSha256"] = digest(json.dumps(raw["taxon"], sort_keys=True, ensure_ascii=False))
            article = article_record("en", "Example plant", {"title": "Example plant", "pageid": 1,
                                     "revisions": [{"revid": 5, "slots": {"main": {"content": "Original evidence"}}}]},
                                     {"text": "CC BY-SA"}, [{"url": "https://example.org", "fetchedAt": "today"}])
            record = make_record(taxon, raw, {("en", "Example plant")}, {("en", "Example plant"): article}, output)
            article_path = output / record["sources"][0]["path"]
            write_json(article_path, article)
            self.assertEqual(retained_articles(output), {("en", "Example plant"): article})
            write_json(output / "taxa/1.json", record)
            write_json(output / "manifest.json", {"collectionComplete": True, "taxonIds": [1]})
            write_json(output / "report.json", {"taxa": 1, "coverage": {"article_title_matched": 1}, "articleLookups": 1})
            validate_collection(output)
            article["wikitext"] = "Changed evidence"
            write_json(article_path, article)
            with self.assertRaisesRegex(RuntimeError, "hash mismatch"):
                validate_collection(output)
            with self.assertRaisesRegex(RuntimeError, "hash mismatch"):
                retained_articles(output)
            write_json(output / "manifest.json", {"collectionComplete": False, "taxonIds": [1]})
            with self.assertRaisesRegex(RuntimeError, "incomplete"):
                validate_collection(output)


if __name__ == "__main__":
    unittest.main()
