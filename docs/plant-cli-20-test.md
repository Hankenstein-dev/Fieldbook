# Scripted 20-plant test

Twenty plants completed using the approved 251-token prompt and fresh Sol high CLI sessions under the existing ChatGPT login. Python supplied input, saved output, checked records and collected usage. No subagent tool calls or per-plant chat coordination were used.

**20 distinct sessions; one completed turn each; zero tool calls.** All outputs passed JSON/field, 75-word, three-sentence and evidence-pointer checks. These are structural checks, not proof of factual accuracy.

| Generation measurement | Result |
|---|---:|
| Input tokens, including cache | 168,221 |
| Cached input (included above) | 76,544 |
| Uncached input (included above) | 91,677 |
| Output tokens, including reasoning | 5,263 |
| Reasoning output (included above) | 3,428 |
| Total input + output | 173,484 |
| Saved request text, reference tokenizer | 20,039 |
| Saved output text, reference tokenizer | 1,721 |
| Mean input per plant | 8,411.0 |
| Mean paragraph words | 30.1 |
| Mean job duration | 9.7 seconds |
| Sum of CLI process durations | 194.8 seconds |
| First-job start to final completion | 226.0 seconds |

The wall interval includes the pause after the first job. An initial parser mistake treated a CLI feature warning as a tool event; the successful first output was recovered from its saved events, with no repeated generation. There were exactly 20 submitted jobs.

The earlier ten-call subagent comparison averaged 19,856.6 input tokens per plant; this run averages 8,411.0. However, these sample mixes differ, and cache reuse fell from roughly 89% to 45.5%. This is a reduction in processed input, not a verified reduction in subscription allowance. Codex's fixed instructions still account for most of the difference between saved request text and actual input.

The coordinating conversation's separate snapshot already contains **3,247,165 tokens** (3,211,392 cached input), including implementing/debugging this new runner and progress polling. Combined with generation, that is at least **3,420,649 tokens** through the snapshot. Later finalisation adds more. The 173,484 generation-token total must not be mistaken for all work in this chat. Future runs can launch this existing script from a terminal and avoid repeated coordinator turns; this setup cost is not required per plant.

## Quality scope

Five repeated cases were compared with their previously reviewed source passages; the other fifteen received structural checks and are reproduced below for review. The sample comprises those five cases plus fifteen randomly selected saved packets. It is not a random twenty-plant accuracy estimate.

The food qualifications were retained, and Rotheca avoided the earlier cultivar evergreen error. Blue mahoe still included the broad native-range claim despite source tension. The prompt is compact but does not eliminate source-handling issues.

## Outputs

### Dimorphotheca spectabilis

A plant endemic to KwaZulu-Natal Province, South Africa.

**EDIBLE: unknown**

Review note: Faithful short identity line; source remains too sparse for an interesting paragraph.

### Musa balbisiana

A wild banana species native to eastern South Asia, the eastern Indian subcontinent, northern Southeast Asia and southern China. Its lush leaves form upright clumps, and it has red to maroon flowers and blue-green fruit containing seeds.

**EDIBLE: yes**

Natural clones, including wild saba bananas, produce edible fruit; seeded fruit is considered inedible, while historical cooking and eating of wild bananas is only assumed.

Review note: Food note distinguishes edible natural clones, inedible seeded fruit and assumed historical use. The paragraph omits the supported cultivated-banana ancestry hook.

### Oxalis debilis

A perennial bulbous herb native to South America, large-flowered pink-sorrel now grows in temperate and tropical regions worldwide except Antarctica. In Europe, plants are sterile and reproduce only through bulbs; its leaves have a zesty, lemony flavour.

**EDIBLE: yes**

Flowers, leaves and roots are edible, but consumption in large amounts is discouraged because the plant contains oxalic acid.

Review note: Preserves edible parts and large-quantity qualification. Avoids inventing an elastic fruit capsule.

### Hibiscus elatus

A flowering tree native to Cuba, Jamaica, the US Virgin Islands and Puerto Rico, blue mahoe has broad green leaves and flowers that change from bright yellow through orange and red to crimson as they mature. Its polished wood is distinctive for its blue-green streaks.

**EDIBLE: unknown**

Review note: Retains the broad native-range claim from p2 despite tension with p9. The compressed prompt did not reproduce the longer prompt's more cautious origin selection in this run.

### Rotheca myricoides

A flowering shrub native to mountains from Eritrea to South Africa, Rotheca myricoides has asymmetrical flowers that vary from green and blue to mauve, white and blue. Its often velvety leaves release an unpleasant scent when crushed.

**EDIBLE: unknown**

Review note: Avoids applying cultivar evergreen habit to the species; no medicinal consumption is classified as human food.

### Jasminum mesnyi

Evergreen flowering shrub native to Vietnam and southern China. It has fragrant yellow flowers from spring into summer, potentially year-round in warmer climates, and a scrambling habit that can be trained as a slender climber.

**EDIBLE: unknown**

### Musschia aurea

Flowering plant endemic to the Madeira Islands, including Madeira and the Desertas. It grows on sea cliffs and rocky offshore islets.

**EDIBLE: unknown**

### Andryala arenaria

A flowering plant, its arenaria and parvipila subspecies are documented as native to mainland Portugal.

**EDIBLE: unknown**

### Tagetes lemmonii

Shrubby marigold native to Sonora and Sinaloa in northwestern Mexico and southern Arizona in the United States. It blooms from fall into spring, sometimes for up to 10 months, and its foliage smells pungent when disturbed.

**EDIBLE: unknown**

### Oxalis caprina

A short-stemmed South African plant, Goat's-foot has bluish flowers.

**EDIBLE: unknown**

### Encephalartos altensteinii

A palm-like cycad endemic to South Africa, it may be branched or unbranched, with straight or backward-curving leaves whose rigid, broad leaflets often have toothed edges. It bears greenish-yellow cones and scarlet seeds; the cones are poisonous to humans.

**EDIBLE: no**

The cones are poisonous to humans.

### Elymus farctus

Flowering grass with two subspecies documented as native in Portugal: subsp. farctus in mainland Portugal, and subsp. boreo-atlanticus in mainland Portugal and Madeira.

**EDIBLE: unknown**

### Salvia japonica

Annual plant native to several provinces in China and to Taiwan, Japanese purple sage has upright stems and terminal flower clusters. Its flowers range from reddish, purple and blue to white.

**EDIBLE: unknown**

### Aechmea recurvata

Plant species native to southern Brazil, Paraguay, Uruguay and northern Argentina. It is widely cultivated as an ornamental and has three recognized varieties.

**EDIBLE: unknown**

### Taraxacum officinale

A herbaceous perennial flowering plant native to Eurasia, the common dandelion has yellow flower heads that become round balls of silver-tufted fruit dispersed by wind. Its leaves, flowers and roots are sometimes used as food: leaves raw or cooked, flowers in wine, and baked, ground roots as a coffee substitute.

**EDIBLE: yes**

Leaves are eaten raw or cooked; flowers are used for wine; baked, ground roots have served as a coffee substitute.

### Streptocarpus saxorum

An evergreen flowering perennial native to Kenya and Tanzania, the false African violet often bears flowers nearly year-round. Its compact variety has received the Royal Horticultural Society’s Award of Garden Merit as a houseplant.

**EDIBLE: unknown**

### Cycas circinalis

A cycad native to southern India and Sri Lanka, it is reported in the wild only from southern India and is the only gymnosperm among Sri Lanka’s native flora. An unreferenced account says its poisonous seeds can be made into flour for tortillas, tamales, soup and porridge after at least five water soakings.

**EDIBLE: yes**

An unreferenced account says poisonous seeds are soaked at least five times, then dried and ground into flour used in several foods.

### Geranium reuteri

A large perennial flowering herb endemic to the Canary Islands, it has deeply divided leaves in a rosette from a woody base. It can form brilliant carpets on the floors of laurel forests and wax myrtle-tree heath scrub.

**EDIBLE: unknown**

### Delphinium halteratum

(Summary withheld)

**EDIBLE: unknown**

### Cinnamomum verum

A small evergreen tree native to Sri Lanka, Ceylon cinnamon has inner bark historically used as the spice cinnamon. It also bears distinctly scented greenish flowers and purple fruit containing one seed.

**EDIBLE: yes**

The inner bark is historically used as cinnamon spice and sold dried in sticks or ground into powder.

## Files and rerunning

- [Runner](../scripts/run_plant_content_cli.py)
- [Prompt](../config/plant-content-prompt-v3.txt)
- [Measurements and original parsed results](../data/analysis/plant-cli-20-v1/report.json)
- [Coordinator usage snapshot](../data/analysis/plant-cli-20-v1/coordinator-usage-snapshot.json)

The runner defaults to this twenty-plant test; a different prepared manifest can be selected with `--output` and `--limit`. Running `.venv/bin/python scripts/run_plant_content_cli.py --limit 20` again skips its completed records and makes no new model calls. Each request, raw output, source packet and CLI event log is saved in the run directory. App stories are unchanged.
