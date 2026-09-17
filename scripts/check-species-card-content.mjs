import { chromium, devices } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const content = JSON.parse(await readFile('stories/pt/plants.cli.json', 'utf8'));
const manual = JSON.parse(await readFile('stories/pt/plants.manual.json', 'utf8'));
const catalogue = [
  ...JSON.parse(await readFile('config/generated/country-catalogue.json', 'utf8')),
  ...JSON.parse(await readFile('config/generated/catalogue.json', 'utf8')),
];
const speciesById = new Map(catalogue.map((s) => [s.id, s]));
const imported = JSON.parse(await readFile(`${content.sourceRun}/card-import.json`, 'utf8'));
assert.equal(content.stories.length, imported.count);
assert.deepEqual(content.stories.map((s) => s.taxonId), imported.taxonIds);
const manualImport = JSON.parse(await readFile(`${manual.sourceRun}/card-import.json`, 'utf8'));
assert.deepEqual(manual.stories.map((s) => s.taxonId), manualImport.taxonIds);
const stories = [...new Map([...content.stories, ...manual.stories].map((s) => [s.taxonId, s])).values()];
const sampleOffset = Number(process.argv[3] ?? 0);
assert(Number.isInteger(sampleOffset) && sampleOffset >= 0 && sampleOffset < stories.length);
const samplePool = stories.slice(sampleOffset);
const samples = ['yes', 'no', 'unknown'].map((status) =>
  samplePool.find((s) => s.humanEdibility === status && s.summary && speciesById.has(s.taxonId)),
);
samples.push(samplePool.find((s) => s.summary === null && speciesById.has(s.taxonId)));
// Optional explicit IDs exercise recovered cards as well as the generic samples.
for (const tid of (process.argv[4] ?? '').split(',').filter(Boolean).map(Number)) {
  const story = stories.find((s) => s.taxonId === tid);
  assert(story && speciesById.has(tid), `Missing requested card ${tid}`);
  if (!samples.includes(story)) samples.push(story);
}
assert(samples.every(Boolean));
const url = process.argv[2] ?? 'http://localhost:4175';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Fieldbook/ }).first().click();
  const checked = [];
  for (const story of samples) {
    const species = speciesById.get(story.taxonId);
    await page.getByLabel('Search your fieldbook').fill(species.scientificName);
    await page.getByRole('button', { name: `${species.commonName} · not yet collected`, exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    if (story.summary) {
      const paragraph = dialog.locator('article.story-prose > p:not(.food-use-note)').first();
      assert.equal(await paragraph.textContent(), story.summary);
      assert(await paragraph.isVisible(), 'Summary must be visibly rendered, not just present in the DOM');
      await paragraph.scrollIntoViewIfNeeded();
    } else {
      assert(await dialog.locator('.reference-facts').isVisible());
      assert.equal(await dialog.locator('article.story-prose > p:not(.food-use-note)').count(), 0);
    }
    assert.equal(await dialog.locator('.species-badges').getByText('Edible', { exact: true }).count(), story.humanEdibility === 'yes' ? 1 : 0);
    const food = dialog.locator('article.story-prose > p.food-use-note');
    assert.equal(await food.count(), story.edibilityNote ? 1 : 0);
    if (story.edibilityNote) {
      assert.equal(await food.textContent(), story.edibilityNote);
      assert(await food.isVisible());
    }
    assert.equal(await dialog.getByRole('region', { name: 'Human food use' }).count(), 0);
    assert.equal(await dialog.getByText(/^(Human food use documented|Human food use not established|Reported inedible or poisonous when eaten)$/).count(), 0);
    assert.equal(await dialog.locator('.source-details, .source-link, .season-strip').count(), 0);
    const map = dialog.getByRole('button', { name: 'Where to find it', exact: true });
    assert(await map.isVisible());
    assert.equal((await map.textContent()).trim(), '');
    const star = dialog.getByRole('button', { name: 'I’d like to find this', exact: true });
    assert(await star.isVisible());
    assert.equal((await star.textContent()).trim(), '');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    checked.push({ taxonId: story.taxonId, name: species.scientificName, status: story.humanEdibility, nullSummary: story.summary === null });
    if (checked.length === 1) {
      await mkdir('artifacts', { recursive: true });
      await page.screenshot({ path: `artifacts/species-card-${url.startsWith('https:') ? 'live' : 'local'}.png` });
    }
    await page.getByRole('button', { name: 'Close species', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Sources & image credits', { exact: true }).click();
  await page.getByLabel('Search species credits').fill(speciesById.get(samples[0].taxonId).scientificName);
  for (const source of samples[0].sources) {
    assert(await page.locator(`a[href="${source.url}"]`).count() > 0);
    if (source.revisionUrl) assert(await page.locator(`a[href="${source.revisionUrl}"]`).count() > 0);
  }
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Fieldbook/ }).first().click();
  const offlineStory = samples.find((s) => s.summary);
  const offlineSpecies = speciesById.get(offlineStory.taxonId);
  await page.getByLabel('Search your fieldbook').fill(offlineSpecies.scientificName);
  await page.getByRole('button', { name: `${offlineSpecies.commonName} · not yet collected`, exact: true }).click();
  assert.equal(await page.getByRole('dialog').locator('article.story-prose > p').first().textContent(), offlineStory.summary);
  await writeFile(`artifacts/species-card-${url.startsWith('https:') ? 'live' : 'local'}-checks.json`, JSON.stringify({ url, importedCount: stories.length, checked, offlineReloadChecked: true }, null, 2));
  console.log(`PASS: ${url}: summary, Edible badge, plain food-use paragraph, preserved qualifications, null-summary fallback, credits and mobile layout across ${samples.length} species cards; offline reload passed.`);
} finally {
  await context.close();
  await browser.close();
}
