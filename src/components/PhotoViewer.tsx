import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import type { Photo } from '../types';

export default function PhotoViewer({
  src,
  alt,
  children,
  credit,
  pixelArt = false,
}: {
  src: string;
  alt: string;
  children: ReactNode;
  credit?: Photo;
  pixelArt?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="photo-open"
        aria-label={`Enlarge photo: ${alt}`}
        onClick={() => setOpen(true)}
      >
        {children}
        <Maximize2 className="photo-enlarge-icon" size={14} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <PhotoDialog
            src={src}
            alt={alt}
            credit={credit}
            pixelArt={pixelArt}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}

function PhotoDialog({
  src,
  alt,
  credit,
  pixelArt,
  onClose,
}: {
  src: string;
  alt: string;
  credit?: Photo;
  pixelArt: boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    stage = useRef<HTMLDivElement>(null),
    img = useRef<HTMLImageElement>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const current = useRef(view);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const [failed, setFailed] = useState(false);
  const [source, setSource] = useState(src);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  function apply(next: typeof view) {
    const box = stage.current!,
      photo = img.current;
    const scale = Math.max(1, Math.min(6, next.scale));
    const fit = photo?.naturalWidth
      ? Math.min(box.clientWidth / photo.naturalWidth, box.clientHeight / photo.naturalHeight)
      : 1;
    const maxX = Math.max(0, ((photo?.naturalWidth ?? 0) * fit * scale - box.clientWidth) / 2);
    const maxY = Math.max(0, ((photo?.naturalHeight ?? 0) * fit * scale - box.clientHeight) / 2);
    current.current = {
      scale,
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
    setView(current.current);
  }
  function zoom(factor: number, x = 0, y = 0) {
    const old = current.current,
      scale = Math.max(1, Math.min(6, old.scale * factor));
    const ratio = scale / old.scale;
    apply({ scale, x: x - (x - old.x) * ratio, y: y - (y - old.y) * ratio });
  }
  useEffect(() => {
    const element = stage.current!;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoom(
        Math.exp(-event.deltaY * 0.002),
        event.clientX - rect.left - rect.width / 2,
        event.clientY - rect.top - rect.height / 2,
      );
    };
    const resize = new ResizeObserver(() => apply(current.current));
    resize.observe(element);
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      resize.disconnect();
      element.removeEventListener('wheel', wheel);
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="photo-dialog"
      aria-label={`Photo viewer: ${alt}`}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="photo-viewer-content">
        <header>
          <strong>{alt}</strong>
          <button className="icon-button" aria-label="Close photo" onClick={onClose}>
            <X />
          </button>
        </header>
        <div
          ref={stage}
          className="photo-stage"
          data-zoom={view.scale.toFixed(2)}
          onDoubleClick={() =>
            current.current.scale > 1 ? apply({ scale: 1, x: 0, y: 0 }) : zoom(2)
          }
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          }}
          onPointerMove={(e) => {
            const points = pointers.current;
            const previous = points.get(e.pointerId);
            if (!previous) return;
            const before = [...points.values()];
            points.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const after = [...points.values()];
            if (points.size === 1)
              apply({
                ...current.current,
                x: current.current.x + e.clientX - previous.x,
                y: current.current.y + e.clientY - previous.y,
              });
            else if (points.size === 2) {
              const distance = (p: typeof before) => Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y);
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (before[0].x + before[1].x) / 2,
                y = (before[0].y + before[1].y) / 2;
              if (distance(before) > 0)
                zoom(
                  distance(after) / distance(before),
                  x - rect.left - rect.width / 2,
                  y - rect.top - rect.height / 2,
                );
              apply({
                ...current.current,
                x: current.current.x + (after[0].x + after[1].x) / 2 - x,
                y: current.current.y + (after[0].y + after[1].y) / 2 - y,
              });
            }
          }}
          onLostPointerCapture={(e) => pointers.current.delete(e.pointerId)}
          onPointerUp={(e) => pointers.current.delete(e.pointerId)}
          onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        >
          {failed ? (
            <p role="status">This photo could not be loaded. Try again when connected.</p>
          ) : (
            <img
              ref={img}
              src={source}
              alt={alt}
              draggable={false}
              onLoad={() => apply(current.current)}
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                imageRendering: pixelArt ? 'pixelated' : 'auto',
              }}
              onError={() => {
                // Larger iNaturalist renditions may not be cached while offline.
                if (credit?.url && source !== credit.url) setSource(credit.url);
                else setFailed(true);
              }}
            />
          )}
        </div>
        <footer>
          <div className="photo-controls">
            <button
              className="icon-button"
              aria-label="Zoom out"
              disabled={view.scale <= 1}
              onClick={() => zoom(1 / 1.5)}
            >
              <Minus />
            </button>
            <button className="text-button" onClick={() => apply({ scale: 1, x: 0, y: 0 })}>
              Fit photo
            </button>
            <button
              className="icon-button"
              aria-label="Zoom in"
              disabled={view.scale >= 6}
              onClick={() => zoom(1.5)}
            >
              <Plus />
            </button>
          </div>
          <p>Pinch or use + to zoom. Drag to inspect.</p>
          {credit && (
            <p>
              <a href={credit.sourceUrl} target="_blank" rel="noreferrer">
                {credit.attribution}
              </a>{' '}
              · {credit.license}
            </p>
          )}
        </footer>
      </div>
    </dialog>
  );
}
