import type { Sighting } from '../types';
export interface ProjectedSighting {
  sighting: Sighting;
  x: number;
  y: number;
}
export interface Cluster {
  taxonId: number;
  sightings: Sighting[];
  x: number;
  y: number;
}
export function clusterSightings(points: ProjectedSighting[], radius: number): Cluster[] {
  // Deterministic greedy clustering; join the first same-species centroid within the screen-space radius.
  const clusters: Cluster[] = [];
  for (const p of [...points].sort((a, b) => a.sighting.id.localeCompare(b.sighting.id))) {
    const cluster = clusters.find(
      (c) => c.taxonId === p.sighting.taxonId && Math.hypot(c.x - p.x, c.y - p.y) <= radius,
    );
    if (cluster) {
      const n = cluster.sightings.length;
      cluster.x = (cluster.x * n + p.x) / (n + 1);
      cluster.y = (cluster.y * n + p.y) / (n + 1);
      cluster.sightings.push(p.sighting);
    } else clusters.push({ taxonId: p.sighting.taxonId, sightings: [p.sighting], x: p.x, y: p.y });
  }
  return clusters;
}
