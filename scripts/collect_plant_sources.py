#!/usr/bin/env python3
"""Collect original sources for every configured catalogue taxon, without an LLM.

Run again to resume; --offline reconstructs the corpus using only cached responses.
The curated seed and its revision-pinned evidence are never modified.
"""

import argparse
from collections import Counter, defaultdict
import csv
import hashlib
import json
from pathlib import Path
import re
import sys
import time
from urllib.parse import quote

try:
    from .seed_stories import ROOT, Client, INAT, batches, read_json, resolve_pages, wikipedia_title, write_json
except ImportError:
    from seed_stories import ROOT, Client, INAT, batches, read_json, resolve_pages, wikipedia_title, write_json


def digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def path_ref(path):
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def cached_taxonomy(catalogue, directories):
    """Retain the actual provider record and its retrieval provenance, not a reconstruction."""
    selected = {row["id"] for row in catalogue}
    result = {}
    for directory in directories:
        for path in sorted(directory.glob("*.json")):
            envelope = read_json(path)
            for row in envelope.get("data", {}).get("results", []):
                taxon = row.get("taxon", row)
                if taxon.get("id") in selected and taxon["id"] not in result:
                    result[taxon["id"]] = {
                        "taxon": taxon, "sourceUrl": envelope["url"],
                        "fetchedAt": envelope["fetchedAt"], "retainedFrom": path_ref(path),
                        "recordSha256": digest(json.dumps(taxon, sort_keys=True, ensure_ascii=False)),
                    }
    return result


class SourceClient(Client):
    def get(self, base, params):
        for attempt in range(5):
            try:
                return super().get(base, params)
            except RuntimeError as error:
                if self.offline or "'code': 'maxlag'" not in str(error) or attempt == 4:
                    raise
                time.sleep(min(60, 5 * 2 ** attempt))


def query_pages(client, language, titles, linked_language):
    """Fetch full revision source in batches, including every continuation page."""
    params = {
        "action": "query", "format": "json", "formatversion": 2,
        "prop": "revisions|info|pageprops|langlinks", "rvprop": "ids|timestamp|content|sha1",
        "rvslots": "main", "inprop": "url", "ppprop": "disambiguation|wikibase_item",
        "redirects": 1, "titles": "|".join(titles), "meta": "siteinfo",
        "siprop": "rightsinfo", "maxlag": 5, "lllang": linked_language, "lllimit": "max",
    }
    merged = {"pages": [], "normalized": [], "converted": [], "redirects": []}
    pages, requests, continuation, seen = {}, [], {}, set()
    while True:
        response = client.get(f"https://{language}.wikipedia.org/w/api.php", {**params, **continuation})
        requests.append({key: response[key] for key in ("url", "fetchedAt")})
        query = response["data"]["query"]
        for key in ("normalized", "converted", "redirects"):
            merged[key].extend(query.get(key, []))
        if "rightsinfo" in query:
            merged["rightsinfo"] = query["rightsinfo"]
        for page in query.get("pages", []):
            previous = pages.setdefault(page["title"], {})
            for key, value in page.items():
                if key in ("revisions", "langlinks"):
                    previous.setdefault(key, []).extend(x for x in value if x not in previous.get(key, []))
                else:
                    previous[key] = value
        continuation = response["data"].get("continue")
        if not continuation:
            break
        marker = json.dumps(continuation, sort_keys=True)
        if marker in seen:
            raise RuntimeError("Wikipedia continuation made no progress")
        seen.add(marker)
    merged["pages"] = list(pages.values())
    return resolve_pages({"query": merged}, titles), merged.get("rightsinfo"), requests


def article_record(language, requested_title, page, rights, requests):
    revision = next(iter(page.get("revisions", [])), {})
    slot = revision.get("slots", {}).get("main", {})
    content = slot.get("content", "")
    if "missing" in page or "invalid" in page:
        status = "missing"
    elif "disambiguation" in page.get("pageprops", {}):
        status = "disambiguation"
    elif not content.strip():
        status = "empty"
    else:
        status = "available"
    return {
        "provider": "Wikipedia", "language": language, "requestedTitle": requested_title,
        "status": status, "title": page["title"], "pageId": page.get("pageid"),
        "url": page.get("fullurl", f"https://{language}.wikipedia.org/wiki/{quote(page['title'].replace(' ', '_'))}"),
        "revisionId": revision.get("revid"), "revisionTimestamp": revision.get("timestamp"),
        "revisionUrl": f"https://{language}.wikipedia.org/w/index.php?oldid={revision['revid']}" if revision.get("revid") else None,
        "contentFormat": slot.get("contentformat"), "contentModel": slot.get("contentmodel"),
        "contentSha256": digest(content), "wikitext": content, "rights": rights,
        "attribution": "Wikipedia contributors", "requests": requests,
        "wikidataId": page.get("pageprops", {}).get("wikibase_item"),
        "languageLinks": page.get("langlinks", []),
    }


def name_key(value):
    return re.sub(r"\s+", " ", value.replace("_", " ")).strip().casefold()


def source_scope(taxon, article):
    """A match is a routing hint, never botanical verification or approved evidence."""
    if article["status"] != "available":
        return "unavailable"
    name, title = name_key(taxon["scientificName"]), name_key(article["title"])
    if name == title:
        return "title_matches_scientific_name"
    if " " in name and title == name.split()[0]:
        return "broader_taxon_page"
    return "needs_taxon_review"


def needs_fallback(taxon, targets, articles, botanical_sources):
    if botanical_sources:
        return False
    return not any(articles[target]["status"] == "available" and
                   source_scope(taxon, articles[target]) != "broader_taxon_page" for target in targets)


def fetch_articles(client, targets, articles, output, batch_size, languages):
    by_language = defaultdict(list)
    for language, title in sorted(targets - articles.keys()):
        by_language[language].append(title)
    total = sum(map(len, by_language.values()))
    completed = 0
    for language, titles in sorted(by_language.items()):
        other = next((item for item in languages if item != language), languages[0])
        for batch in batches(titles, batch_size):
            pages, rights, requests = query_pages(client, language, batch, other)
            for title, page in pages.items():
                article = article_record(language, title, page, rights, requests)
                articles[(language, title)] = article
                write_json(output / "articles" / language / f"{digest(title)}.json", article)
            completed += len(batch)
            print(f"Wikipedia sources: {completed}/{total} this pass; {len(articles)} total lookups", flush=True)


def retained_articles(output):
    articles = {}
    for path in sorted((output / "articles").glob("*/*.json")):
        article = read_json(path)
        if path.stem != digest(article["requestedTitle"]) or path.parent.name != article["language"]:
            raise RuntimeError(f"Article identity mismatch: {path}")
        if digest(article["wikitext"]) != article["contentSha256"]:
            raise RuntimeError(f"Article hash mismatch: {path}")
        articles[(article["language"], article["requestedTitle"])] = article
    return articles


def historical_names(taxon):
    # Historical/misapplied names are search candidates, not accepted equivalences.
    return sorted({item["name"] for item in taxon.get("names", [])
                   if (item.get("locale") == "sci" or item.get("lexicon") == "scientific-names")
                   and item.get("name") and name_key(item["name"]) != name_key(taxon["name"])})


def fetch_historical_sources(client, catalogue, targets, articles, botanical_index, output, batch_size, languages):
    pending = [row for row in catalogue if needs_fallback(row, targets[row["id"]], articles, botanical_index.get(str(row["id"]))) ]
    details, evidence = {}, {}
    for row in pending:
        path = output / "name-lookups" / f"{row['id']}.json"
        if path.exists():
            details[row["id"]] = read_json(path)
    missing = [row["id"] for row in pending if row["id"] not in details]
    for batch in batches(missing, 30):
        response = client.get(INAT + "/taxa/" + ",".join(map(str, batch)), {"all_names": "true", "locale": languages[0]})
        for taxon in response["data"]["results"]:
            if taxon["id"] not in batch:
                raise RuntimeError("Unexpected taxon returned during historical-name lookup")
            detail = {"taxon": taxon, "sourceUrl": response["url"], "fetchedAt": response["fetchedAt"],
                      "recordSha256": digest(json.dumps(taxon, sort_keys=True, ensure_ascii=False))}
            details[taxon["id"]] = detail
            write_json(output / "name-lookups" / f"{taxon['id']}.json", detail)
        if any(taxon_id not in details for taxon_id in batch):
            raise RuntimeError("Taxon omitted during historical-name lookup")
        print(f"Historical-name records: {len(details)}/{len(pending)}", flush=True)
    additional = set()
    for row in pending:
        detail = details[row["id"]]
        if detail["taxon"]["id"] != row["id"] or digest(json.dumps(detail["taxon"], sort_keys=True, ensure_ascii=False)) != detail["recordSha256"]:
            raise RuntimeError(f"Historical-name evidence mismatch: {row['id']}")
        own = {(languages[0], name) for name in historical_names(detail["taxon"])}
        # Include the current provider link too; the original catalogue snapshot may be older.
        linked = wikipedia_title(detail["taxon"].get("wikipedia_url"))
        if linked:
            own.add(linked)
        own.add((languages[0], detail["taxon"]["name"]))
        targets[row["id"]].update(own)
        additional.update(own)
        evidence[row["id"]] = {"path": f"name-lookups/{row['id']}.json", "recordSha256": detail["recordSha256"],
                                "note": "Provider-associated scientific names are lookup candidates; historical or misapplied names require taxonomic review."}
    fetch_articles(client, additional, articles, output, batch_size, languages)
    return evidence


def make_record(taxon, taxonomy, targets, articles, output, botanical_sources=None, name_lookup=None):
    sources = []
    for language, title in sorted(targets):
        article = articles[(language, title)]
        sources.append({
            "provider": "Wikipedia", "language": language, "requestedTitle": title,
            "title": article["title"], "status": article["status"], "scope": source_scope(taxon, article),
            "path": f"articles/{language}/{digest(title)}.json", "url": article["url"],
            "revisionId": article["revisionId"], "contentSha256": article["contentSha256"],
        })
    available = [source for source in sources if source["status"] == "available"]
    matched = [source for source in available if source["scope"] == "title_matches_scientific_name"]
    status = "article_title_matched" if matched else "articles_need_scope_review" if available else "taxonomy_only"
    result = {
        "schemaVersion": 1, "taxonId": taxon["id"], "scientificName": taxon["scientificName"],
        "rank": taxon["rank"], "catalogueRecord": taxon, "taxonomy": taxonomy,
        "coverageStatus": status, "reviewStatus": "unreviewed", "sources": sources,
        "botanicalSources": botanical_sources or [],
        "sourceMaterialStatus": "taxon_matched_text" if matched or botanical_sources else
                                "text_needs_scope_review" if available else "taxonomy_only",
        "gap": "No article or matched botanical description found by configured lookups; additional sources or synonyms still needed."
               if not available and not botanical_sources else None,
    }
    if name_lookup:
        result["nameLookupSource"] = name_lookup
    return result


def validate_collection(output):
    manifest = read_json(output / "manifest.json")
    if not manifest.get("collectionComplete"):
        raise RuntimeError("Collection is incomplete; resume the collector")
    ids = manifest["taxonIds"]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Duplicate manifest taxon IDs")
    counts, material_counts, checked = Counter(), Counter(), set()
    for taxon_id in ids:
        record = read_json(output / "taxa" / f"{taxon_id}.json")
        if record["taxonId"] != taxon_id or record["taxonomy"]["taxon"]["id"] != taxon_id:
            raise RuntimeError(f"Taxon identity mismatch: {taxon_id}")
        raw = record["taxonomy"]
        if digest(json.dumps(raw["taxon"], sort_keys=True, ensure_ascii=False)) != raw["recordSha256"]:
            raise RuntimeError(f"Taxonomy hash mismatch: {taxon_id}")
        for source in record["sources"]:
            path = output / source["path"]
            if not path.resolve().is_relative_to((output / "articles").resolve()):
                raise RuntimeError(f"Invalid article path: {path}")
            article = read_json(path)
            if digest(article["wikitext"]) != article["contentSha256"]:
                raise RuntimeError(f"Article hash mismatch: {path}")
            if any(source[key] != article[key] for key in ("status", "contentSha256", "revisionId", "language", "requestedTitle")):
                raise RuntimeError(f"Article reference mismatch: {path}")
            if article["status"] == "available" and (not article["revisionId"] or not article["rights"] or not article["requests"]):
                raise RuntimeError(f"Missing article provenance: {path}")
            checked.add(source["path"])
        for source in record["botanicalSources"]:
            path = output / source["path"]
            if not path.resolve().is_relative_to((output / "supplementary").resolve()):
                raise RuntimeError(f"Invalid botanical source path: {path}")
            original = read_json(path)
            if digest(json.dumps(original, sort_keys=True, ensure_ascii=False)) != source["recordSha256"]:
                raise RuntimeError(f"Botanical source hash mismatch: {path}")
            if original["datasetKey"] != source["datasetKey"] or original["key"] != source["usageKey"]:
                raise RuntimeError(f"Botanical source identity mismatch: {path}")
            if name_key(original["canonicalName"]) != name_key(record["scientificName"]) or original["rank"].casefold() != record["rank"].casefold():
                raise RuntimeError(f"Botanical source taxon mismatch: {path}")
            metadata = read_json(output / "supplementary/gbif" / source["datasetKey"] / "metadata.json")
            if not source["license"] or source["license"] != metadata["data"].get("license"):
                raise RuntimeError(f"Missing or mismatched botanical source licence: {path}")
        if record.get("nameLookupSource"):
            source = record["nameLookupSource"]
            path = output / source["path"]
            if not path.resolve().is_relative_to((output / "name-lookups").resolve()):
                raise RuntimeError(f"Invalid name evidence path: {path}")
            detail = read_json(path)
            if detail["taxon"]["id"] != taxon_id or digest(json.dumps(detail["taxon"], sort_keys=True, ensure_ascii=False)) != source["recordSha256"]:
                raise RuntimeError(f"Historical-name evidence mismatch: {taxon_id}")
        expected = make_record(record["catalogueRecord"], raw,
                               {(s["language"], s["requestedTitle"]) for s in record["sources"]},
                               {(s["language"], s["requestedTitle"]): read_json(output / s["path"]) for s in record["sources"]}, output,
                               record["botanicalSources"], record.get("nameLookupSource"))
        if expected != record:
            raise RuntimeError(f"Stale taxon coverage: {taxon_id}")
        counts[record["coverageStatus"]] += 1
        material_counts[record["sourceMaterialStatus"]] += 1
    report = read_json(output / "report.json")
    if report["taxa"] != len(ids) or report["coverage"] != dict(counts) or report["articleLookups"] != len(checked):
        raise RuntimeError("Coverage report does not match retained sources")
    if report.get("sourceMaterialCoverage", dict(material_counts)) != dict(material_counts):
        raise RuntimeError("Combined source coverage does not match retained sources")
    print(f"Validated {len(ids)} taxa and {len(checked)} article lookups; no network or LLM calls", flush=True)


def write_coverage_csv(output, records):
    path = output / "coverage.csv"
    temporary = path.with_suffix(".csv.tmp")
    with temporary.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["taxon_id", "scientific_name", "rank", "source_material_status", "wikipedia_status",
                         "available_article_urls", "botanical_source_urls", "record_path"])
        for record in records:
            writer.writerow([record["taxonId"], record["scientificName"], record["rank"], record["sourceMaterialStatus"],
                             record["coverageStatus"], " | ".join(dict.fromkeys(s["url"] for s in record["sources"] if s["status"] == "available")),
                             " | ".join(s["sourceUrl"] for s in record["botanicalSources"]), f"taxa/{record['taxonId']}.json"])
    temporary.replace(path)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT / "config/source-collection.json")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--limit", type=int, help="Small reproducible pilot; use a separate --output directory")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--check", action="store_true", help="Validate retained files and hashes; never use the network")
    args = parser.parse_args(argv)
    settings, seed = read_json(args.config), read_json(ROOT / "config/seed.json")
    if args.limit is not None and (args.limit < 1 or not args.output):
        parser.error("--limit must be positive and requires a separate --output directory")
    catalogue_path = ROOT / settings["catalogue"]
    catalogue = [row for row in read_json(catalogue_path) if row["group"] == seed["group"]]
    if args.limit:
        catalogue = catalogue[:args.limit]
    if len({row['id'] for row in catalogue}) != len(catalogue) or not catalogue:
        raise RuntimeError("Catalogue must contain unique taxon IDs and must not be empty")
    output = args.output or ROOT / settings["output"].format(**seed)
    if args.check:
        validate_collection(output)
        return 0
    languages = settings["languages"]
    if len(languages) != 2 or not all(re.fullmatch(r"[a-z-]+", language) for language in languages):
        raise RuntimeError("Configure two Wikipedia languages")
    fallback_languages = settings.get("fallbackLanguages", [])
    if not all(re.fullmatch(r"[a-z-]+", language) for language in fallback_languages):
        raise RuntimeError("Invalid fallback Wikipedia language")
    batch_size = settings["batchSize"]
    if not 1 <= batch_size <= 50:
        raise RuntimeError("Wikipedia batchSize must be 1–50")
    client = SourceClient(output / "_http", offline=args.offline)
    taxonomy = cached_taxonomy(catalogue, [ROOT / directory for directory in settings["cachedTaxonomy"]])
    for batch in batches([row['id'] for row in catalogue if row['id'] not in taxonomy], 30):
        response = client.get(INAT + "/taxa/" + ",".join(map(str, batch)), {"locale": languages[0], "all_names": "true"})
        for taxon in response["data"]["results"]:
            taxonomy[taxon["id"]] = {"taxon": taxon, "sourceUrl": response["url"], "fetchedAt": response["fetchedAt"],
                                      "recordSha256": digest(json.dumps(taxon, sort_keys=True, ensure_ascii=False))}
    if any(row["id"] not in taxonomy for row in catalogue):
        raise RuntimeError("Missing taxonomy records; refusing to claim complete collection")
    manifest = {
        "schemaVersion": 1, "country": seed["country"], "group": seed["group"],
        "cataloguePath": path_ref(catalogue_path), "catalogueSha256": digest(catalogue_path.read_text()),
        "taxonIds": [row["id"] for row in catalogue], "settings": settings,
        "scope": "Every entry in the configured catalogue; not every plant worldwide.",
        "method": "Retained provider taxonomy and complete Wikipedia main-slot revision wikitext; exact scientific titles, linked pages, configured language fallbacks and provider-associated historical scientific names. Supplementary botanical descriptions are indexed separately. No LLM or prose generation.",
    }
    write_json(output / "manifest.json", {**manifest, "collectionComplete": False})
    print(f"Selected {len(catalogue)} taxa; retained taxonomy available for all", flush=True)
    targets = {}
    for row in catalogue:
        own = {(languages[0], row["scientificName"])}
        linked = wikipedia_title(taxonomy[row["id"]]["taxon"].get("wikipedia_url"))
        if linked:
            own.add(linked)
        targets[row["id"]] = own
    articles = retained_articles(output)
    print(f"Reusing {len(articles)} retained article lookups", flush=True)
    fetch_articles(client, set().union(*targets.values()), articles, output, batch_size, languages)
    secondary = set()
    for row in catalogue:
        own = targets[row["id"]]
        linked_targets = set()
        for target in own:
            for link in articles[target]["languageLinks"]:
                if link["lang"] in languages:
                    linked_targets.add((link["lang"], link["title"]))
        # Exact second-language lookup also covers missing or overly broad linked pages.
        if not any(source_scope(row, articles[target]) == "title_matches_scientific_name" for target in own):
            linked_targets.add((languages[1], row["scientificName"]))
        own.update(linked_targets)
        secondary.update(linked_targets)
    fetch_articles(client, secondary, articles, output, batch_size, languages)
    botanical_index_path = output / "supplementary/gbif/index.json"
    botanical_index = read_json(botanical_index_path) if botanical_index_path.exists() else {}
    for language in fallback_languages:
        fallback = set()
        for row in catalogue:
            own = targets[row["id"]]
            if needs_fallback(row, own, articles, botanical_index.get(str(row["id"]))):
                target = (language, row["scientificName"])
                own.add(target)
                fallback.add(target)
        fetch_articles(client, fallback, articles, output, batch_size, languages)
    name_evidence = fetch_historical_sources(client, catalogue, targets, articles, botanical_index, output, batch_size, languages) if settings.get("lookupHistoricalNames") else {}
    active_targets = set().union(*targets.values())
    articles = {target: articles[target] for target in sorted(active_targets)}
    records = [make_record(row, taxonomy[row["id"]], targets[row["id"]], articles, output,
                           botanical_index.get(str(row["id"]), []), name_evidence.get(row["id"])) for row in catalogue]
    for record in records:
        write_json(output / "taxa" / f"{record['taxonId']}.json", record)
    counts = Counter(record["coverageStatus"] for record in records)
    gaps = [{key: record[key] for key in ("taxonId", "scientificName", "rank", "coverageStatus", "sourceMaterialStatus", "gap")}
            for record in records if record["sourceMaterialStatus"] != "taxon_matched_text"]
    report = {
        "taxa": len(records), "ranks": dict(Counter(row["rank"] for row in catalogue)),
        "coverage": dict(counts), "articleLookups": len(articles),
        "sourceMaterialCoverage": dict(Counter(record["sourceMaterialStatus"] for record in records)),
        "taxaWithBotanicalDescriptions": sum(bool(record["botanicalSources"]) for record in records),
        "taxaWithHistoricalNameLookups": len(name_evidence),
        "uniqueAvailableArticles": len({(a['language'], a['pageId'], a['revisionId']) for a in articles.values() if a['status'] == 'available'}),
        "lookupOutcomes": dict(Counter(a["status"] for a in articles.values())),
        "availableArticlesByLanguage": dict(Counter(a["language"] for a in articles.values() if a["status"] == "available")),
        "unreviewed": len(records),
        "note": "Title matches are automated routing hints, not verified botanical claims. Taxonomy-only entries have source records but no narrative article. Wikitext retains references and templates; transcluded template bodies are not downloaded.",
        "gaps": gaps,
    }
    write_json(output / "report.json", report)
    write_coverage_csv(output, records)
    write_json(output / "manifest.json", {**manifest, "collectionComplete": True})
    print(json.dumps({key: value for key, value in report.items() if key != "gaps"}, indent=2), flush=True)
    print(f"Saved to {output}; requests {client.network_requests}; cache hits {client.cache_hits}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        print(f"Source collection failed: {error}", file=sys.stderr)
        sys.exit(1)
