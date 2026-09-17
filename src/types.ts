export interface Point {
  lat: number;
  lng: number;
}
export interface Fix extends Point {
  accuracy: number;
  timestamp: number;
}
export type Habitat =
  | 'ocean'
  | 'water'
  | 'lake'
  | 'river'
  | 'wetland'
  | 'wood'
  | 'grassland'
  | 'scrub'
  | 'farmland'
  | 'built-up'
  | 'coast'
  | 'open-ground'
  | 'unknown';
export interface Photo {
  url: string;
  attribution: string;
  license: string;
  sourceUrl: string;
}
export interface Species {
  source?: { provider: 'GBIF' | 'OBIS'; key: number; url: string };
  id: number;
  scientificName: string;
  commonName: string;
  alternativeNames: string[];
  group: string;
  rank: string;
  photo?: Photo;
  family?: string;
}
export interface Candidate {
  species: Species;
  count: number;
  sources?: { provider: 'iNaturalist' | 'GBIF' | 'OBIS'; count: number; url: string }[];
}
export interface Source {
  id: string;
  title: string;
  url: string;
  revisionUrl?: string;
  license?: string;
  licenseUrl?: string;
  attribution?: string;
}
export interface Story {
  taxonId: number;
  tags: string[];
  summary: string | null;
  humanEdibility?: 'yes' | 'no' | 'unknown';
  edibilityNote?: string | null;
  reviewStatus: string;
  sources: Source[];
}
export interface Sighting extends Point {
  retractedAt?: number;
  achievements?: { id: string; label: string }[];
  id: string;
  taxonId: number;
  timestamp: number;
  cell: string;
  wasInCandidateSet: boolean;
  candidateSetAvailable: boolean;
  accuracy: number;
  species: Species;
  photo?: Blob;
  identification?: { model: string; similarity: number; scope: string };
}
export interface CandidateSet {
  sourceWarnings?: string[];
  key: string;
  cell: string;
  habitat: Habitat;
  centre: Point;
  radius: number;
  total: number;
  candidates: Candidate[];
  fetchedAt: number;
  complete: boolean;
}
export interface VisitedCell {
  cell: string;
  firstVisitedAt: number;
  lastVisitedAt: number;
  taxonIds: number[];
}
export interface Settings {
  id: 'preferences';
  interests: string[];
  wanted?: number[];
}
export interface HabitatNote {
  habitats: Habitat[];
  evidence: { section: string; quote: string; sourceUrl: string }[];
}
export interface RankedCandidate extends Candidate {
  seasonLabel?: string;
  story?: Story;
  score: number;
  affinity: boolean;
  seen: boolean;
}

export interface SeasonRecord {
  key: string;
  taxonId: number;
  cell: string;
  months: number[];
  fetchedAt: number;
  radius: number;
}
export interface EmbeddingRecord {
  key: string;
  taxonId?: number;
  model: string;
  vector: number[];
  source: string;
  savedAt: number;
}
export interface RangeSet {
  key: string;
  species: Species[];
  fetchedAt: number;
  complete: boolean;
  referencePack?: string;
}
