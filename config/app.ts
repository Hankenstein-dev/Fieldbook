import countries from './countries.json';
import groups from './groups.json';
import seed from './seed.json';
import stories from '../stories/pt/plants.json';
import cliStories from '../stories/pt/plants.cli/index';
import manualStories from '../stories/pt/plants.manual.json';
import catalogue from './generated/catalogue.json';
import starter from './generated/starter.json';
import maps from './generated/maps.json';
import affinity from './habitat-affinities.json';
import type { CandidateSet, HabitatNote, Species, Story } from '../src/types';

export interface Country {
  name: string;
  iNatPlaceId: number;
  locale: string;
  start: { lat: number; lng: number };
  bbox: number[];
}
export interface Group {
  sourceTaxa?: { kingdom?: string; class?: string; phylum?: string }[];
  gbifKingdomKeys?: number[];
  label: string;
  singular: string;
  iconicTaxa: string[];
  rankingWeight: number;
  notabilityStrategy: string;
  ignoreList: number[];
}
export const countryId = seed.country;
export const country = (countries as Record<string, Country>)[countryId];
export const groupConfig = groups as Record<string, Group>;
export const defaultInterests = [seed.group];
export const storyIndex = new Map<number, Story>(
  ([...stories.stories, ...cliStories.stories, ...manualStories.stories] as Story[]).map((s) => [s.taxonId, s]),
);
export const referenceSpecies = catalogue as Species[];
export const starterSet = starter as CandidateSet;
export const mapConfig = maps;
export const habitatNotes = affinity as Record<string, HabitatNote>;
export const apiConfig = {
  base: 'https://api.inaturalist.org/v1',
  locale: 'en',
  requestInterval: 1100,
  cacheDays: 14,
};
