import { useMemo, useState } from 'react';
import { referenceSpecies, storyIndex } from '../../config/app';
import { countryCatalogue } from '../../config/countryCatalogue';
import { imageForSpecies } from '../../config/appearance';

const species = [
  ...new Map([...countryCatalogue, ...referenceSpecies].map((s) => [s.id, s])).values(),
];

export default function SourceCredits() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(20);
  const matches = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return open
      ? species.filter((s) =>
          [s.commonName, s.scientificName, ...s.alternativeNames].some((name) =>
            name.toLocaleLowerCase().includes(text),
          ),
        )
      : [];
  }, [open, query]);
  return (
    <section>
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>Sources &amp; image credits</summary>
        {open && (
          <>
            <p>
              Species notes are summarised and rewritten for Fieldbook. Wikipedia adaptations use{' '}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
              . Images are also credited in the photo viewer.
            </p>
            <label className="search-box">
              <input
                aria-label="Search species credits"
                placeholder="Find a species…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setLimit(20);
                }}
              />
            </label>
            {matches.slice(0, limit).map((s) => {
              const story = storyIndex.get(s.id),
                image = imageForSpecies(s);
              return (
                <article key={s.id} className="source-details">
                  <h3>{s.commonName}</h3>
                  <p>{s.scientificName}</p>
                  {story && (
                    <ul>
                      {story.sources.map((source) => (
                        <li key={source.id}>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                          {source.attribution && ` · ${source.attribution}`}
                          {source.revisionUrl && (
                            <>
                              {' '}
                              ·{' '}
                              <a href={source.revisionUrl} target="_blank" rel="noreferrer">
                                Source revision
                              </a>
                            </>
                          )}
                          {source.licenseUrl && (
                            <>
                              {' '}
                              ·{' '}
                              <a href={source.licenseUrl} target="_blank" rel="noreferrer">
                                Source licence
                              </a>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {image && (
                    <p>
                      Image:{' '}
                      <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                        {image.attribution}
                      </a>{' '}
                      · {image.license.toUpperCase()}.
                    </p>
                  )}
                  <p>
                    Records and taxonomy:{' '}
                    <a
                      href={s.source?.url ?? `https://www.inaturalist.org/taxa/${s.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {s.source?.provider ?? 'iNaturalist'} contributors
                    </a>
                    .
                  </p>
                </article>
              );
            })}
            {!matches.length && <p>No matching species.</p>}
            {matches.length > limit && (
              <button className="text-button" onClick={() => setLimit(limit + 20)}>
                Show more credits
              </button>
            )}
          </>
        )}
      </details>
    </section>
  );
}
