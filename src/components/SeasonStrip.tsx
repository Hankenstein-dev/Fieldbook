import { useEffect, useState } from 'react';
import type { Point, SeasonRecord } from '../types';
import { seasonalRecords, seasonSummary } from '../depth/seasons';
export default function SeasonStrip({ taxonId, point }: { taxonId: number; point: Point }) {
  const [data, setData] = useState<SeasonRecord | null>(null),
    [error, setError] = useState(''),
    [stale, setStale] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    seasonalRecords(taxonId, point)
      .then((r) => {
        if (active) {
          setData(r.data);
          setStale(r.stale);
        }
      })
      .catch(() => {
        if (active) setError('Seasonal records are unavailable for this spot.');
      });
    return () => {
      active = false;
    };
  }, [taxonId, point.lat, point.lng]);
  if (error) return <p className="small-note">{error}</p>;
  if (!data) return <p className="small-note">Loading seasonal records…</p>;
  const summary = seasonSummary(data.months, new Date().getMonth()),
    max = Math.max(1, ...data.months);
  return (
    <section className="season-section">
      <h2>Through the year</h2>
      <p>{summary.label}</p>
      <div className="season-strip" aria-label="Nearby observation counts by month">
        {data.months.map((n, i) => (
          <div
            key={i}
            title={`${new Date(2000, i).toLocaleString('en', { month: 'long' })}: ${n} records`}
          >
            <span style={{ height: `${Math.max(2, (n / max) * 60)}px` }} />
            <small>{new Date(2000, i).toLocaleString('en', { month: 'short' })}</small>
            <small>{n}</small>
          </div>
        ))}
      </div>
      <details className="source-details">
        <summary>Seasonal records{stale ? ' · saved' : ''}</summary>
        <p>
          {summary.total} observations · {data.radius} km · all years
        </p>
      </details>
    </section>
  );
}
