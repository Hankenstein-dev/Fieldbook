import { seasonSummary } from '../depth/summary';
import type { Candidate, Habitat, HabitatNote, RankedCandidate, Story } from '../types';
interface RankingGroup {
  notabilityStrategy: string;
  rankingWeight: number;
  ignoreList: number[];
}
export function rankCandidates(
  candidates: Candidate[],
  habitat: Habitat,
  stories: Map<number, Story>,
  notes: Record<string, HabitatNote>,
  seen: Set<number>,
  groups: Record<string, RankingGroup>,
  seasons: Record<number, number[]> = {},
  month = new Date().getMonth(),
): RankedCandidate[] {
  return candidates
    .map((candidate) => {
      const id = candidate.species.id,
        story = stories.get(id),
        affinity = notes[id]?.habitats.includes(habitat) ?? false;
      // Country source notes are a gentle habitat prior. They never gate the catalogue.
      const group = groups[candidate.species.group];
      const likelihood = Math.min(20, Math.log2(candidate.count + 1) * 2);
      const notability =
        group?.notabilityStrategy === 'stories' ? (story ? 80 : 0) + likelihood : likelihood * 4;
      const season = seasons[id] ? seasonSummary(seasons[id], month) : undefined;
      const score =
        notability * (group?.rankingWeight ?? 1) +
        (affinity ? 60 : 0) +
        (season?.bonus ?? 0) -
        (seen.has(id) ? 3 : 0) -
        (group?.ignoreList.includes(id) ? 12 : 0);
      return {
        ...candidate,
        story,
        affinity,
        seen: seen.has(id),
        seasonLabel: season?.label,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || a.species.id - b.species.id);
}
