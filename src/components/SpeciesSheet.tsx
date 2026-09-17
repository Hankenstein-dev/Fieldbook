import { useEffect, useRef } from 'react';
import { Star, Check, Map as MapIcon, MapPin, X } from 'lucide-react';
import type { Candidate, Species, Story } from '../types';
import SpeciesImage from './SpeciesImage';
import { storyBadgeLabels } from '../../config/discovery';
interface Props {
  species: Species;
  wanted?: boolean;
  onWant?: () => void;
  achievements?: { id: string; label: string }[];
  story?: Story;
  candidate?: Candidate;
  seen: boolean;
  saving: boolean;
  message: string;
  interestLabel?: string;
  onEnableInterest: () => void;
  canLocate: boolean;
  onClose: () => void;
  onSave: () => void;
  onWhere?: () => void;
  onSightings?: () => void;
}
export default function SpeciesSheet({
  species,
  wanted,
  onWant,
  achievements = [],
  story,
  candidate,
  seen,
  saving,
  message,
  interestLabel,
  onEnableInterest,
  canLocate,
  onClose,
  onSave,
  onWhere,
  onSightings,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  const label =
    species.commonName === species.scientificName ? 'Species notes' : species.scientificName;
  return (
    <dialog
      ref={ref}
      className="species-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="species-title"
    >
      <div className="sheet-content">
        <div className="sheet-top">
          <button className="icon-button" aria-label="Close species" onClick={onClose}>
            <X size={21} />
          </button>
        </div>
        <div className="species-identity">
          <SpeciesImage species={species} large />
          <div>
            {seen && (
              <span className="seen-label">
                <Check size={13} /> In your sightings
              </span>
            )}
            <h1 id="species-title">{species.commonName}</h1>
            <p className="latin">{label}</p>
            {species.family && <p className="family">{species.family} family</p>}
          </div>
        </div>
        <div className="species-links">
          {onWhere && (
            <button
              className="icon-button"
              aria-label="Where to find it"
              title="Where to find it"
              onClick={onWhere}
            >
              <MapIcon size={21} aria-hidden="true" />
            </button>
          )}
          {onWant && !seen && (
            <button
              className="icon-button"
              aria-label={wanted ? 'On your look-out list' : 'I’d like to find this'}
              title={wanted ? 'On your look-out list' : 'I’d like to find this'}
              aria-pressed={wanted}
              onClick={onWant}
            >
              <Star size={21} fill={wanted ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          )}
          {onSightings && (
            <button className="secondary-button" onClick={onSightings}>
              <MapPin size={16} /> My sightings of this species
            </button>
          )}
        </div>
        {candidate && (
          <div className="species-meta">
            <span>
              <MapPin size={14} /> {candidate.count.toLocaleString()} nearby records
            </span>
          </div>
        )}
        <div className="species-badges">
          {story?.humanEdibility === 'yes' && <span>Edible</span>}
          {[...new Map(achievements.map((a) => [a.id, a])).values()].map((a) => (
            <span key={a.id}>{a.label}</span>
          ))}
          {story?.tags
            .filter((tag) => tag !== 'edible' && storyBadgeLabels[tag])
            .map((tag) => (
              <span key={tag}>{storyBadgeLabels[tag]}</span>
            ))}
        </div>
        <article className="story-prose">
          {story?.summary ? (
            <>
              {story.summary.split(/\n\n+/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </>
          ) : (
            <dl className="reference-facts">
              <dt>Scientific name</dt>
              <dd>{species.scientificName}</dd>
              <dt>Taxon rank</dt>
              <dd>{species.rank}</dd>
              {species.alternativeNames.length > 0 && (
                <>
                  <dt>Other names</dt>
                  <dd>{species.alternativeNames.slice(0, 5).join(' · ')}</dd>
                </>
              )}
            </dl>
          )}
          {story?.edibilityNote && <p className="food-use-note">{story.edibilityNote}</p>}
        </article>
      </div>
      <div className="sheet-actions">
        {seen && interestLabel && (
          <button className="text-button" onClick={onEnableInterest}>
            Show {interestLabel.toLowerCase()} in my fieldbook
          </button>
        )}
        {message && (
          <p className="save-message" role="status">
            {message}
          </p>
        )}

        <button className="primary-button" onClick={onSave} disabled={saving}>
          <MapPin size={17} />{' '}
          {saving
            ? 'Saving your sighting…'
            : canLocate
              ? seen
                ? 'Record another sighting'
                : 'I’ve seen this'
              : 'Use location to record'}
        </button>
      </div>
    </dialog>
  );
}
