#!/usr/bin/env python3
"""Validate authored stories and render reading/research copies, entirely offline."""

import argparse
from collections import Counter
import hashlib
from pathlib import Path
import re
import sys

if __package__:
    from .seed_stories import ROOT, read_json
else:
    from seed_stories import ROOT, read_json


def require(condition, message):
    if not condition:
        raise ValueError(message)


def indexed(items, label):
    ids = [item["taxonId"] for item in items]
    require(all(type(value) is int and value > 0 for value in ids), f"Invalid {label} taxon ID")
    require(len(set(ids)) == len(ids), f"Duplicate {label} taxon ID")
    return {item["taxonId"]: item for item in items}


def validate(package, review, records, root=ROOT):
    require(package["schemaVersion"] == review["schemaVersion"] == 1, "Unsupported story schema")
    for key in ("country", "group"):
        require(package[key] == review[key], f"Mismatched {key}")
    stories = indexed(package["stories"], "story")
    coverage = indexed(review["coverage"], "coverage")
    require(set(coverage) == set(records), "Coverage must account for every manifest taxon exactly once")
    require(set(stories) <= set(records), "Story outside the selected corpus")
    raw_cache = {}
    for taxon_id, entry in coverage.items():
        if entry["status"] == "needs_research":
            require(taxon_id not in stories and entry["reason"].strip(), f"Invalid research gap: {taxon_id}")
            continue
        require(entry["status"] in ("draft", "locked") and taxon_id in stories,
                f"Invalid coverage status: {taxon_id}")
        story = stories[taxon_id]
        require(story["reviewStatus"] == entry["status"], f"Review status mismatch: {taxon_id}")
        require(isinstance(story["summary"], str) and story["summary"].strip(), f"Empty story: {taxon_id}")
        require(not re.search(r"https?://|\[\d+\]|^>", story["summary"], re.M),
                f"Keep citations outside narrative: {taxon_id}")
        require(len(story["tags"]) == len(set(story["tags"])), f"Duplicate tag: {taxon_id}")
        for tag in story["tags"]:
            if tag.startswith("lookalike-of:"):
                target = tag.removeprefix("lookalike-of:")
                require(target.isdigit() and int(target) in records and int(target) != taxon_id,
                        f"Unresolved lookalike: {taxon_id}: {tag}")
            else:
                require(tag in {"edible", "toxic", "invasive", "cultural", "medicinal"},
                        f"Unknown tag: {taxon_id}: {tag}")
        source_ids = [source["id"] for source in story["sources"]]
        require(source_ids and len(source_ids) == len(set(source_ids)), f"Invalid sources: {taxon_id}")
        sources = {source["id"]: source for source in story["sources"]}
        require(set(sources) == {e["sourceId"] for e in entry["evidence"]},
                f"Source/evidence mismatch: {taxon_id}")
        require(entry.get("sourceScope"), f"Missing source-scope decision: {taxon_id}")
        for evidence in entry["evidence"]:
            source = sources[evidence["sourceId"]]
            require(source["url"].startswith("https://") and source["title"].strip(),
                    f"Invalid source link: {taxon_id}")
            path = (root / evidence["rawFile"]).resolve()
            require(path.is_relative_to(root.resolve()), f"Source outside repository: {path}")
            if path not in raw_cache:
                raw_cache[path] = read_json(path)
            raw = raw_cache[path]
            if "extractSha256" in evidence:
                wiki = raw[evidence["rawField"]] if evidence["rawField"] else raw
                page = wiki["page"]
                text = page["extract"]
                require(hashlib.sha256(text.encode()).hexdigest() == evidence["extractSha256"],
                        f"Source changed; review evidence before refreshing: {taxon_id}")
                require(source["url"] == page["canonicalurl"] and source["revisionId"] == page["lastrevid"],
                        f"Source revision mismatch: {taxon_id}")
                expected_revision = f'https://{wiki["language"]}.wikipedia.org/w/index.php?oldid={page["lastrevid"]}'
                require(source["revisionUrl"] == expected_revision, f"Wrong revision link: {taxon_id}")
                require(source["license"] == "CC-BY-SA-4.0" and source["licenseUrl"] == wiki["rights"]["url"]
                        and source["attribution"] == "Wikipedia contributors" and source["adaptation"],
                        f"Missing attribution: {taxon_id}")
            else:
                matches = [s for s in raw["sources"] if s["id"] == evidence["sourceId"]]
                require(len(matches) == 1, f"Missing additional source: {taxon_id}")
                additional = matches[0]
                require(taxon_id in additional["taxonIds"] and source["url"] == additional["url"],
                        f"Additional source mismatch: {taxon_id}")
                text = additional["quote"]
            require(evidence["passages"], f"Missing source passages: {taxon_id}")
            for passage in evidence["passages"]:
                require(passage["text"].strip() and passage["text"] in text,
                        f"Evidence is not verbatim source text: {taxon_id}: {passage['section']}")
    return stories, coverage


def name(record):
    return next(iter(record["names"].get("en", [])), record["taxon"]["name"])


def cell(text):
    return text.replace("|", "\\|").replace("\n", " ")


def render(package, review, records):
    country, group = package["country"], package["group"]
    stories = {s["taxonId"]: s for s in package["stories"]}
    coverage = {e["taxonId"]: e for e in review["coverage"]}
    prefix = f"stories-{country}-{group}"
    book = [f"# Plant stories — {country} / {group}", "",
            f"{len(stories)} authored stories from a {len(records)}-taxon corpus. "
            "Drafts remain for Tony's line-by-line review; the source material determines their length.", "",
            f"Edit the [authored JSON](../stories/{country}/{group}.json), then run "
            "`python3 scripts/review_stories.py` to rebuild this reading copy. "
            f"[Evidence and editorial notes](../stories/{country}/{group}.review.json) are separate from the prose. "
            f"[Research gaps]({prefix}-research.md) account for the rest of the corpus.", "",
            "Entries follow the corpus's national observation rank, which is not a claim that every plant occurs near you. "
            "Common names are source-provided and have not yet been chosen as a UI naming convention.", "",
            "The summaries adapt Wikipedia material under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). "
            "Source and revision links sit after each story. Additional checks are credited there too.", "",
            "## Find a plant", "", "| Plant | Scientific name |", "|---|---|"]
    for taxon_id in sorted(stories, key=lambda i: name(records[i]).casefold()):
        record = records[taxon_id]
        book.append(f"| [{cell(name(record))}](#taxon-{taxon_id}) | {cell(record['taxon']['name'])} |")
    for taxon_id, record in records.items():
        if taxon_id not in stories:
            continue
        story = stories[taxon_id]
        book.extend(["", f'<a id="taxon-{taxon_id}"></a>', "",
                     f"## {name(record)} — {record['taxon']['name']}", ""])
        portuguese = record["names"].get("pt", [])
        if portuguese:
            book.extend(["Portuguese names in source: " + "; ".join(portuguese), ""])
        book.extend([story["summary"], "", "Sources and attribution:", ""])
        for source in story["sources"]:
            line = f"- [{source['title']}]({source['url']})"
            if "revisionUrl" in source:
                line += (f" · [saved revision]({source['revisionUrl']}) · {source['attribution']} · "
                         f"[{source['license']}]({source['licenseUrl']}); summarised and rewritten.")
            book.append(line)
        book.extend(["", f"Editorial status: {story['reviewStatus']}. Tags: "
                     + (", ".join(story["tags"]) if story["tags"] else "none; natural-history story") + "."])
    gaps = [e for e in review["coverage"] if e["status"] == "needs_research"]
    counts = Counter(e["articleStatus"] for e in gaps)
    research = [f"# Story research gaps — {country} / {group}", "",
                f"{len(gaps)} of {len(records)} taxa have no curated story yet. "
                f"{counts['ok']} have an article needing richer or better-supported material; "
                f"{len(gaps) - counts['ok']} lack a usable linked English article.", "",
                "These are research outcomes, not judgments that the plants are uninteresting. "
                "They stay in the catalogue, identification and collection. No placeholder summary is supplied.", "",
                "Every available full article was assessed, including articles without keyword matches. "
                "For taxa without an iNaturalist Wikipedia link, an exact scientific-name lookup was also attempted; "
                "this does not rule out articles under other names or useful sources in other languages.", "",
                "The next research pass can use botanical floras, botanic gardens, local conservation bodies "
                "and primary research. Resolve genus/species scope before borrowing a claim.", "",
                "| Plant | Scientific name | Source outcome | Research needed |", "|---|---|---|---|"]
    for entry in gaps:
        taxon_id = entry["taxonId"]
        record = records[taxon_id]
        link = f"../data/raw/{country}/{group}/{taxon_id}.json"
        research.append(f"| [{cell(name(record))}]({link}) | {cell(record['taxon']['name'])} | "
                        f"{entry['articleStatus']} | {cell(entry['reason'])} |")
    return {f"{prefix}.md": "\n".join(book) + "\n",
            f"{prefix}-research.md": "\n".join(research) + "\n"}


def main():
    settings = read_json(ROOT / "config/seed.json")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--country", choices=read_json(ROOT / "config/countries.json"), default=settings["country"])
    parser.add_argument("--group", choices=read_json(ROOT / "config/groups.json"), default=settings["group"])
    parser.add_argument("--check", action="store_true", help="Validate and fail if generated documents are stale")
    args = parser.parse_args()
    raw = ROOT / "data/raw" / args.country / args.group
    manifest = read_json(raw / "manifest.json")
    records = {i: read_json(raw / f"{i}.json") for i in manifest["taxonIds"]}
    directory = ROOT / "stories" / args.country
    package = read_json(directory / f"{args.group}.json")
    review = read_json(directory / f"{args.group}.review.json")
    require(package["country"] == args.country and package["group"] == args.group, "Wrong story selection")
    stories, coverage = validate(package, review, records)
    for filename, content in render(package, review, records).items():
        target = ROOT / "docs" / filename
        if args.check:
            require(target.exists() and target.read_text(encoding="utf-8") == content, f"Stale reading copy: {target}")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
    print(f"Validated {len(stories)} stories; {len(coverage)} taxa accounted for; "
          f"{len(coverage) - len(stories)} research gaps. No network requests.")
    print("Structural checks verify provenance and file consistency, not the truth of botanical claims or Tony's approval.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Story review failed: {error}", file=sys.stderr)
        sys.exit(1)
