#!/usr/bin/env python3
"""Retain configured GBIF botanical checklist descriptions, without LLM processing."""
import argparse
import json
from pathlib import Path

try:
    from .collect_plant_sources import ROOT, SourceClient, digest, name_key, read_json, write_json
except ImportError:
    from collect_plant_sources import ROOT, SourceClient, digest, name_key, read_json, write_json


def collect(client, dataset, output):
    key = dataset["key"]
    metadata = client.get(f"https://api.gbif.org/v1/dataset/{key}", {})
    write_json(output / key / "metadata.json", metadata)
    records, offset, sources = {}, 0, []
    while True:
        envelope = client.get("https://api.gbif.org/v1/species/search", {"datasetKey": key, "limit": 100, "offset": offset})
        write_json(output / key / f"page-{offset}.json", envelope)
        sources.append({field: envelope[field] for field in ("url", "fetchedAt")})
        data = envelope["data"]
        before = len(records)
        for row in data["results"]:
            if row["datasetKey"] != key:
                raise RuntimeError("GBIF returned a record from an unexpected dataset")
            records[row["key"]] = row
        if data.get("endOfRecords"):
            if len(records) != data["count"]:
                raise RuntimeError("GBIF dataset count changed or pagination is incomplete")
            break
        if len(records) == before:
            raise RuntimeError("GBIF pagination made no progress")
        offset += data["limit"]
    return metadata, records, sources


def build_index(catalogue, dataset, metadata, records):
    names = {}
    for row in catalogue:
        names.setdefault(name_key(row["scientificName"]), []).append(row)
    index = {}
    for record in records.values():
        if not any(item.get("description", "").strip() for item in record.get("descriptions", [])):
            continue
        for taxon in names.get(name_key(record.get("canonicalName", "")), []):
            if record.get("rank", "").casefold() != taxon["rank"].casefold():
                continue
            index.setdefault(str(taxon["id"]), []).append({
                "provider": "GBIF", "datasetKey": dataset["key"], "datasetTitle": metadata["data"]["title"],
                "usageKey": record["key"], "canonicalName": record["canonicalName"],
                "scope": dataset["scope"], "match": "exact_canonical_name_and_rank", "reviewStatus": "unreviewed",
                "license": metadata["data"].get("license"), "citation": metadata["data"].get("citation"),
                "sourceUrl": f"https://www.gbif.org/species/{record['key']}",
                "path": f"supplementary/gbif/{dataset['key']}/records/{record['key']}.json",
                "recordSha256": digest(json.dumps(record, sort_keys=True, ensure_ascii=False)),
            })
    return index


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=ROOT / "config/source-collection.json")
    parser.add_argument("--offline", action="store_true")
    args = parser.parse_args()
    settings, seed = read_json(args.config), read_json(ROOT / "config/seed.json")
    corpus = ROOT / settings["output"].format(**seed)
    output = corpus / "supplementary/gbif"
    catalogue = [row for row in read_json(ROOT / settings["catalogue"]) if row["group"] == seed["group"]]
    client = SourceClient(output / "_http", offline=args.offline)
    index, reports = {}, []
    for dataset in settings.get("gbifDatasets", []):
        metadata, records, sources = collect(client, dataset, output)
        for key, record in records.items():
            write_json(output / dataset["key"] / "records" / f"{key}.json", record)
        matched = build_index(catalogue, dataset, metadata, records)
        for taxon_id, values in matched.items():
            index.setdefault(taxon_id, []).extend(values)
        reports.append({"datasetKey": dataset["key"], "records": len(records), "matchedCatalogueTaxa": len(matched),
                        "descriptionRecords": sum(bool(r.get("descriptions")) for r in records.values()), "sources": sources})
        print(f"Botanical source: {len(records)} records; {len(matched)} catalogue taxa matched", flush=True)
    write_json(output / "index.json", index)
    write_json(output / "report.json", {"datasets": reports, "matchedCatalogueTaxa": len(index),
                                        "note": "Exact name and rank matches only; no inferred synonym or subspecies matches. All source claims remain unreviewed."})


if __name__ == "__main__":
    main()
