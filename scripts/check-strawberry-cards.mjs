import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const catalogue = JSON.parse(await readFile('config/generated/country-catalogue.json', 'utf8'));
const stories = new Map();
for (const path of ['stories/pt/plants.json', 'stories/pt/plants.cli.json', 'stories/pt/plants.manual.json']) {
  for (const story of JSON.parse(await readFile(path, 'utf8')).stories) stories.set(story.taxonId, story);
}
const url = process.argv[2] ?? 'http://localhost:4173';
const scope = url.startsWith('https:') ? 'live' : 'local';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Fieldbook/ }).first().click();
  await page.getByLabel('Search your fieldbook').fill('strawberry');
  const cards = page.getByRole('button', { name: / · not yet collected$/ });
  await cards.first().waitFor();
  assert.equal(await cards.count(), 11);
  const checked = [];
  for (let i = 0; i < 11; i++) {
    await cards.nth(i).click();
    const dialog = page.getByRole('dialog');
    const name = await dialog.locator('.latin').textContent();
    const species = catalogue.find((r) => r.scientificName === name);
    assert(species, `Unknown result: ${name}`);
    const story = stories.get(species.id);
    const paragraph = dialog.locator('.story-prose > p:not(.food-use-note)');
    assert.equal(await paragraph.count(), story?.summary ? 1 : 0);
    if (story?.summary) {
      assert.equal(await paragraph.textContent(), story.summary);
      assert(await paragraph.isVisible());
    } else {
      assert(await dialog.locator('.reference-facts').isVisible());
    }
    const edible = story?.humanEdibility === 'yes';
    assert.equal(await dialog.locator('.species-badges').getByText('Edible', { exact: true }).count(), edible ? 1 : 0);
    const food = dialog.locator('.story-prose > .food-use-note');
    assert.equal(await food.count(), story?.edibilityNote ? 1 : 0);
    if (story?.edibilityNote) assert.equal(await food.textContent(), story.edibilityNote);
    assert.equal(await dialog.getByText(/^(Human food use documented|Human food use not established)$/).count(), 0);
    checked.push({ taxonId: species.id, name, summary: Boolean(story?.summary), edible });
    if (species.id === 55366) await page.screenshot({ path: `artifacts/garden-strawberry-${scope}.png` });
    await page.getByRole('button', { name: 'Close species', exact: true }).click();
  }
  assert.equal(checked.filter((r) => r.summary).length, 11);
  assert.deepEqual(checked.filter((r) => !r.summary).map((r) => r.taxonId), []);
  await page.getByLabel('Search your fieldbook').fill('Fragaria × ananassa');
  await page.getByRole('button', { name: 'garden strawberry · not yet collected', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const star = dialog.getByRole('button', { name: 'I’d like to find this', exact: true });
  assert.equal((await star.textContent()).trim(), '');
  await star.click();
  const starred = dialog.getByRole('button', { name: 'On your look-out list', exact: true });
  await starred.waitFor();
  assert.equal(await starred.getAttribute('aria-pressed'), 'true');
  await starred.click();
  await star.waitFor();
  const map = dialog.getByRole('button', { name: 'Where to find it', exact: true });
  assert.equal((await map.textContent()).trim(), '');
  assert.equal(await dialog.locator('.season-section, .source-details, .source-link').count(), 0);
  await map.click();
  await page.locator('.where-panel').waitFor();
  await writeFile(`artifacts/strawberry-cards-${scope}.json`, JSON.stringify({ url, checked }, null, 2));
  console.log(`PASS: all 11 strawberry search results have summaries; badges and natural food-use paragraphs match saved content; icon-only map and star actions work.`);
} finally {
  await browser.close();
}
