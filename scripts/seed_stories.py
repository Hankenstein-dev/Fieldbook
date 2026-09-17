#!/usr/bin/env python3
"""Fetch a reproducible story-review corpus. No curated summaries or approved tags are generated."""

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import hashlib
import json
from pathlib import Path
import re
import statistics
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlencode, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
INAT = "https://api.inaturalist.org/v1"
USER_AGENT = "FieldbookSeed/0.1 (personal biodiversity research; developer Hankenstein)"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def now():
    return datetime.now(timezone.utc).isoformat()


def batches(values, size):
    for start in range(0, len(values), size):
        yield values[start:start + size]


def retry_delay(value, attempt):
    """Respect both forms of Retry-After; exponential backoff otherwise."""
    if value:
        try:
            return max(0, float(value))
        except ValueError:
            try:
                return max(0, parsedate_to_datetime(value).timestamp() - time.time())
            except (TypeError, ValueError, OverflowError):
                pass
    return 2 ** (attempt + 1)


class Client:
    def __init__(self, cache, offline=False, refresh=False):
        self.cache = cache
        self.offline = offline
        self.refresh = refresh
        self.last_request = 0
        self.network_requests = 0
        self.cache_hits = 0

    def get(self, base, params):
        url = base + "?" + urlencode(sorted(params.items()))
        path = self.cache / (hashlib.sha256(url.encode()).hexdigest() + ".json")
        if path.exists() and not self.refresh:
            result = read_json(path)
            if result.get("url") != url:
                raise RuntimeError(f"Cache URL mismatch: {path}")
            self.cache_hits += 1
            return result
        if self.offline:
            raise RuntimeError(f"Offline cache miss: {url}")
        for attempt in range(4):
            time.sleep(max(0, 1.1 - (time.monotonic() - self.last_request)))
            self.last_request = time.monotonic()
            self.network_requests += 1
            try:
                request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
                with urlopen(request, timeout=45) as response:
                    data = json.load(response)
                if "error" in data:
                    raise RuntimeError(f"API error at {url}: {data['error']}")
                if "warnings" in data:
                    print(f"API warning: {data['warnings']}", file=sys.stderr)
                result = {"url": url, "fetchedAt": now(), "data": data}
                write_json(path, result)
                return result
            except HTTPError as error:
                if error.code not in (429, 500, 502, 503, 504) or attempt == 3:
                    raise RuntimeError(f"HTTP {error.code}: {url}") from error
                delay = retry_delay(error.headers.get("Retry-After"), attempt)
            except (URLError, TimeoutError, ConnectionError) as error:
                if attempt == 3:
                    raise RuntimeError(f"Network failure at {url}: {error}") from error
                delay = retry_delay(None, attempt)
            print(f"Retrying in {delay:.0f}s: {base}", file=sys.stderr, flush=True)
            time.sleep(delay)


def species_counts(client, country, group, language, count):
    rows, sources, seen = [], [], set()
    page, total = 1, None
    while len(rows) < count:
        result = client.get(INAT + "/observations/species_counts", {
            "place_id": country["iNatPlaceId"], "iconic_taxa": ",".join(group["iconicTaxa"]),
            "locale": language, "page": page, "per_page": 200,
        })
        sources.append({key: result[key] for key in ("url", "fetchedAt")})
        data = result["data"]
        total = data["total_results"]
        incoming = data["results"]
        if not incoming:
            if len(rows) < min(count, total):
                raise RuntimeError("Species-count pagination ended before the reported total")
            break
        before = len(rows)
        for row in incoming:
            if row["taxon"]["id"] not in seen:
                seen.add(row["taxon"]["id"])
                rows.append(row)
        if len(rows) == before:
            raise RuntimeError("Species-count pagination made no progress")
        if len(rows) >= total:
            break
        page += 1
    # The endpoint orders by local observation count; keep ties deterministic in the fetched set.
    rows.sort(key=lambda row: (-row["count"], row["taxon"]["id"]))
    return rows[:count], sources, total


def wikipedia_title(url):
    parts = urlsplit(url or "")
    if not re.fullmatch(r"[a-z-]+\.wikipedia\.org", parts.hostname or ""):
        return None
    if not parts.path.startswith("/wiki/"):
        return None
    return parts.hostname.split(".")[0], unquote(parts.path[6:]).replace("_", " ")


def resolve_pages(data, titles):
    query = data["query"]
    aliases = {}
    for field in ("normalized", "converted", "redirects"):
        aliases.update({item["from"]: item["to"] for item in query.get(field, [])})
    pages = {page["title"]: page for page in query["pages"]}
    result = {}
    for title in titles:
        canonical, visited = title, set()
        while canonical in aliases and canonical not in visited:
            visited.add(canonical)
            canonical = aliases[canonical]
        if canonical not in pages:
            raise RuntimeError(f"Wikipedia returned no page result for {title}")
        result[title] = pages[canonical]
    return result


def fetch_summaries(client, taxa, full_article=False):
    by_language = defaultdict(set)
    for taxon in taxa.values():
        target = wikipedia_title(taxon.get("wikipedia_url"))
        if target:
            by_language[target[0]].add(target[1])
    summaries = {}
    for language, title_set in sorted(by_language.items()):
        # TextExtracts permits only one non-intro extract per request.
        for titles in batches(sorted(title_set), 1 if full_article else 20):
            params = {
                "action": "query", "format": "json", "formatversion": 2,
                "prop": "extracts|info|pageprops", "inprop": "url", "ppprop": "disambiguation",
                "explaintext": 1, "exlimit": 1 if full_article else 20, "redirects": 1,
                "meta": "siteinfo", "siprop": "rightsinfo", "titles": "|".join(titles),
            }
            if not full_article:
                params["exintro"] = 1
            result = client.get(f"https://{language}.wikipedia.org/w/api.php", params)
            if "continue" in result["data"]:
                raise RuntimeError("Unexpected Wikipedia continuation; refusing incomplete summaries")
            pages = resolve_pages(result["data"], titles)
            for title, page in pages.items():
                status = "ok"
                if "missing" in page or "invalid" in page:
                    status = "missing"
                elif "disambiguation" in page.get("pageprops", {}):
                    status = "disambiguation"
                elif not page.get("extract", "").strip():
                    status = "empty"
                summaries[(language, title)] = {
                    "status": status, "language": language, "requestedTitle": title,
                    "sourceUrl": result["url"], "fetchedAt": result["fetchedAt"],
                    "rights": result["data"]["query"].get("rightsinfo"), "page": page,
                }
            if not full_article or len(summaries) % 10 == 0 or len(summaries) == sum(map(len, by_language.values())):
                kind = "full articles" if full_article else "introductions"
                print(f"Wikipedia: {len(summaries)}/{sum(map(len, by_language.values()))} {kind}", flush=True)
    return summaries


def article_sections(text):
    """Keep exact section text for reading and evidence, including the introduction."""
    headings = list(re.finditer(r"(?m)^(={2,6})\s*(.*?)\s*\1\s*$", text))
    sections = [{"heading": "Introduction", "level": 1,
                 "text": text[:headings[0].start()] if headings else text}]
    for index, match in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(text)
        sections.append({"heading": match[2], "level": len(match[1]), "text": text[match.end():end]})
    return sections


def narrative_sections(text):
    # Reference titles and external-link labels are not claims about the plant.
    excluded = {"references", "bibliography", "further reading", "external links", "see also", "notes",
                "footnotes", "sources", "other sources", "sources cited", "citations", "gallery", "photos"}
    excluded_level = None
    for section in article_sections(text):
        if excluded_level is not None and section["level"] <= excluded_level:
            excluded_level = None
        if section["heading"].casefold() in excluded:
            excluded_level = section["level"] if excluded_level is None else min(excluded_level, section["level"])
        if excluded_level is None:
            yield section


def narrative_text(text):
    return "\n\n".join(section["text"] for section in narrative_sections(text))


def needs_scope_review(taxon, wiki):
    if wiki["status"] != "ok":
        return False
    name = taxon["name"].casefold()
    page = wiki["page"]
    # A genus page may validly cover a single species, but this needs a human check.
    return (" " in name and page["title"].casefold() == name.split()[0]) or name not in page["extract"].casefold()


def keyword_matches(text, keyword_config):
    # These are literal cues, not assertions: "not edible" still requires human review.
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", text) if part.strip()]
    matches = []
    for tag, keywords in keyword_config.items():
        for keyword in keywords:
            pattern = re.compile(r"\b" + r"\s+".join(map(re.escape, keyword.split())) + r"\b", re.I)
            for sentence in sentences:
                occurrences = len(pattern.findall(sentence))
                if occurrences:
                    matches.append({"candidateTag": tag, "keyword": keyword,
                                    "sentence": sentence, "occurrences": occurrences})
    return matches


def analyse(records, settings, languages, source_key="wikipedia"):
    words, statuses, summary_languages = [], Counter(), Counter()
    names = Counter()
    keyword_taxa, keyword_occurrences, tag_taxa = Counter(), Counter(), Counter()
    thin, no_cues, wrong_language = [], [], []
    for record in records:
        taxon, wiki = record["taxon"], record[source_key]
        statuses[wiki["status"]] += 1
        for language in languages:
            if record["names"].get(language):
                names[language] += 1
        matches = []
        if wiki["status"] == "ok":
            text = wiki["page"]["extract"]
            size = len(text.split())
            words.append(size)
            summary_languages[wiki["language"]] += 1
            if size < settings["thinSummaryWords"]:
                thin.append(taxon["id"])
            if wiki["language"] == settings["summaryLanguage"]:
                matches = keyword_matches(narrative_text(text) if source_key == "wikipediaArticle" else text,
                                          settings["keywords"])
                if not matches:
                    no_cues.append(taxon["id"])
            else:
                wrong_language.append(taxon["id"])
        record["articleKeywordMatches" if source_key == "wikipediaArticle" else "keywordMatches"] = matches
        keyword_taxa.update({match["keyword"] for match in matches})
        tag_taxa.update({match["candidateTag"] for match in matches})
        for match in matches:
            keyword_occurrences[match["keyword"]] += match["occurrences"]
    return {
        "taxa": len(records), "summaryStatus": dict(statuses), "summaryLanguages": dict(summary_languages),
        "nameCoverage": {language: names[language] for language in languages},
        "summaryWords": {"minimum": min(words, default=0), "median": statistics.median(words) if words else 0,
                         "maximum": max(words, default=0)},
        "thinSummaryThresholdWords": settings["thinSummaryWords"], "thinSummaryTaxonIds": thin,
        "noKeywordTaxonIds": no_cues, "keywordLanguageSkippedTaxonIds": wrong_language,
        "candidateTags": {tag: tag_taxa[tag] for tag in settings["keywords"]},
        "keywords": {keyword: {"taxa": keyword_taxa[keyword], "occurrences": keyword_occurrences[keyword]}
                     for keywords in settings["keywords"].values() for keyword in keywords},
        "note": "Keyword cues only; not verified tags or claims. Thin means short, not necessarily uninteresting.",
    }


def positive_int(value):
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be at least 1")
    return parsed


def main(argv=None):
    settings = read_json(ROOT / "config/seed.json")
    countries = read_json(ROOT / "config/countries.json")
    groups = read_json(ROOT / "config/groups.json")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--country", choices=countries, default=settings["country"])
    parser.add_argument("--group", choices=groups, default=settings["group"])
    parser.add_argument("--count", type=positive_int, default=settings["count"])
    parser.add_argument("--output", type=Path, help="Override the selected corpus directory")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--offline", action="store_true", help="Replay cached HTTP responses; never use the network")
    mode.add_argument("--refresh", action="store_true", help="Refetch all responses for this run")
    args = parser.parse_args(argv)
    country, group = countries[args.country], groups[args.group]
    output = args.output or ROOT / "data/raw" / args.country / args.group
    client = Client(output / "_http", offline=args.offline, refresh=args.refresh)
    languages = list(dict.fromkeys([settings["summaryLanguage"], country["locale"]]))
    rows, sources, total = species_counts(client, country, group, settings["summaryLanguage"], args.count)
    print(f"Selected {len(rows)} of {total} taxa by local observation count", flush=True)
    taxa, taxon_sources = {}, {}
    for batch in batches([row["taxon"]["id"] for row in rows], 30):
        result = client.get(INAT + "/taxa/" + ",".join(map(str, batch)), {
            "all_names": "true", "locale": settings["summaryLanguage"],
            "preferred_place_id": country["iNatPlaceId"],
        })
        for taxon in result["data"]["results"]:
            taxa[taxon["id"]] = taxon
            taxon_sources[taxon["id"]] = {key: result[key] for key in ("url", "fetchedAt")}
        if any(taxon_id not in taxa for taxon_id in batch):
            raise RuntimeError("iNaturalist taxon detail response omitted a selected taxon")
        print(f"iNaturalist: {len(taxa)}/{len(rows)} taxon records", flush=True)
    summaries = fetch_summaries(client, taxa)
    articles = fetch_summaries(client, taxa, full_article=True)
    records = []
    for rank, row in enumerate(rows, 1):
        taxon = taxa[row["taxon"]["id"]]
        target = wikipedia_title(taxon.get("wikipedia_url"))
        names = {language: list(dict.fromkeys(name["name"] for name in taxon.get("names", [])
                 if name.get("locale", "").split("-")[0] == language and name.get("is_valid", True)))
                 for language in languages}
        records.append({
            "schemaVersion": 2, "rank": rank, "observationCount": row["count"],
            "speciesCountRecord": row, "taxonSource": taxon_sources[taxon["id"]], "taxon": taxon,
            "names": names, "wikipedia": summaries[target] if target else {
                "status": "no_link" if not taxon.get("wikipedia_url") else "unsupported_link",
                "sourceUrl": taxon.get("wikipedia_url"),
            },
            "wikipediaArticle": articles[target] if target else {
                "status": "no_link" if not taxon.get("wikipedia_url") else "unsupported_link",
                "sourceUrl": taxon.get("wikipedia_url"),
            },
        })
    report = analyse(records, settings, languages)
    report["articles"] = analyse(records, settings, languages, source_key="wikipediaArticle")
    report["articles"]["sourceScopeReviewTaxonIds"] = [
        record["taxon"]["id"] for record in records if needs_scope_review(record["taxon"], record["wikipediaArticle"])
    ]
    for record in records:
        write_json(output / f"{record['taxon']['id']}.json", record)
    manifest = {
        "schemaVersion": 2, "generatedAt": now(), "country": args.country, "group": args.group,
        "countryConfig": country, "groupConfig": group, "seedConfig": settings,
        "requestedCount": args.count, "availableTaxa": total, "speciesCountSources": sources,
        "taxonIds": [record["taxon"]["id"] for record in records],
        "summaryMethod": "Complete Wikipedia introductory extract (exintro), not the full article or iNaturalist preview.",
        "articleMethod": "Full Wikipedia plain-text extract, without exintro, exchars or exsentences. Preserve section headings; exclude backmatter from keyword matching only.",
    }
    write_json(output / "manifest.json", manifest)
    write_json(output / "report.json", report)
    print(f"\nSaved {len(records)} taxon records to {output}")
    print(f"Summary status: {report['summaryStatus']}")
    print(f"Words: {report['summaryWords']}; thin (<{settings['thinSummaryWords']} words): {len(report['thinSummaryTaxonIds'])}")
    print(f"Name coverage: {report['nameCoverage']}")
    print(f"Taxa without keyword cues: {len(report['noKeywordTaxonIds'])}")
    print("Keyword tally (taxa / occurrences):")
    for keyword, counts in report["keywords"].items():
        print(f"  {keyword}: {counts['taxa']} / {counts['occurrences']}")
    print(f"Candidate tag tally (unverified): {report['candidateTags']}")
    full = report["articles"]
    print(f"\nFull articles: {full['summaryStatus']}; words: {full['summaryWords']}")
    print(f"Full-article keyword tally: {full['keywords']}")
    print(f"Full-article candidate tags: {full['candidateTags']}")
    print(f"Full articles without keyword cues: {len(full['noKeywordTaxonIds'])}")
    print(f"Source-scope review needed: {len(full['sourceScopeReviewTaxonIds'])} taxa")
    print(f"HTTP requests: {client.network_requests}; cache hits: {client.cache_hits}")
    print("Ready for source review and summary drafting. No stories file generated.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError, ValueError, KeyError) as error:
        print(f"Seed failed: {error}", file=sys.stderr)
        sys.exit(1)
