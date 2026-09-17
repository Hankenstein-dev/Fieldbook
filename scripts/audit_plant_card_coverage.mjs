import { buildCollection, sortCollection } from '../src/collection/index.ts';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const read = async (path) => JSON.parse(await readFile(path, 'utf8'));
{
  const country = await read('config/generated/country-catalogue.json');
  const reference = await read('config/generated/catalogue.json');
  const seed = await read('config/seed.json');
  const sourceConfig = await read('config/source-collection.json');
  const sourceRoot = sourceConfig.output.replace('{country}', seed.country).replace('{group}', seed.group);
  const stories = new Map();
  for (const name of ['plants.json', 'plants.cli.json', 'plants.manual.json']) {
    for (const story of (await read(`stories/${seed.country}/${name}`)).stories) stories.set(story.taxonId, story);
  }
  const book = buildCollection([...country, ...reference], [], [], [seed.group], country.map((s) => s.id));
  const entries = sortCollection(book.entries, 'group');
  const rows = [];
  for (const { species } of entries) {
    const story = stories.get(species.id);
    const words = story?.summary?.trim().split(/\s+/).length ?? 0;
    const record = await read(`${sourceRoot}/taxa/${species.id}.json`);
    const sources = record.sources.filter((s) => s.status === 'available');
    const matched = sources.filter((s) => s.scope === 'title_matches_scientific_name');
    const route = words ? (words < 20 ? 'short_summary_review' : 'summary_present')
      : matched.length || record.botanicalSources.length ? 'existing_matched_source'
      : sources.length ? 'existing_source_identity_review'
      : 'retrieve_additional_sources';
    rows.push({ taxonId: species.id, name: species.scientificName, commonName: species.commonName,
      rank: species.rank, summaryWords: words, route,
      existingSources: sources.map(({ language, title, scope, path }) => ({ language, title, scope, path })),
      botanicalSources: record.botanicalSources,
      // No article fetched by the old collector is a search gap, not an absence finding.
      searchExhausted: false });
  }
  const tally = (items, key) => items.reduce((a, r) => { a[r[key]] = (a[r[key]] ?? 0) + 1; return a; }, {});
  const gaps = rows.filter((r) => r.summaryWords === 0);
  const alphabeticalCoverage = {};
  for (const row of rows) {
    const letter = row.commonName.normalize('NFD').replace(/\p{Diacritic}/gu, '').match(/[a-z]/i)?.[0].toUpperCase() ?? '#';
    const tally = alphabeticalCoverage[letter] ??= { total: 0, withSummary: 0, withoutSummary: 0 };
    tally.total++; tally[row.summaryWords ? 'withSummary' : 'withoutSummary']++;
  }
  const report = { generatedAt: new Date().toISOString(), basis: 'Actual buildCollection and sortCollection functions, current app content files; base catalogue without device-only additions. Live publication is verified separately.',
    totalVisibleEntries: book.total, withSummary: rows.length - gaps.length, withoutSummary: gaps.length,
    sourceAbsenceEstablished: 0, shortSummaryReviewCount: rows.filter((r) => r.route === 'short_summary_review').length,
    routes: tally(rows, 'route'), missingByRank: tally(gaps, 'rank'), alphabeticalCoverage,
    note: 'Presence and word counts are structural checks, not a claim of useful botanical completeness. Short summaries are review candidates, not automatically invalid.' };
  const base = process.argv[2] ?? 'data/analysis/plant-coverage-recovery-v1';
  await mkdir(base, { recursive: true });
  await writeFile(`${base}/coverage.json`, JSON.stringify(report, null, 2)+'\n');
  await writeFile(`${base}/recovery-queue.json`, JSON.stringify(rows.filter((r) => r.route !== 'summary_present'), null, 2)+'\n');
  await writeFile(`${base}/visible-cards.json`, JSON.stringify(rows.map(({ taxonId, name, commonName, rank, summaryWords }) => ({ taxonId, name, commonName, rank, summaryWords })), null, 2)+'\n');
  console.log(JSON.stringify(report, null, 2));
}
