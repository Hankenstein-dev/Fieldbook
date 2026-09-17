import { nativeAndroid } from '../native/platform';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fix } from '../types';
export function useLocation() {
  const [fix, setFix] = useState<Fix | null>(null);
  const [status, setStatus] = useState<'waiting' | 'ready' | 'denied' | 'unavailable'>('waiting');
  const mounted = useRef(true);
  const accept = useCallback((p: GeolocationPosition | Position) => {
    const next = {
      lat: p.coords.latitude,
      lng: p.coords.longitude,
      accuracy: p.coords.accuracy,
      timestamp: p.timestamp,
    };
    if (mounted.current) {
      setFix(next);
      setStatus('ready');
    }
    return next;
  }, []);
  const fail = useCallback((error: GeolocationPositionError) => {
    if (mounted.current) setStatus(error.code === 1 ? 'denied' : 'unavailable');
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (nativeAndroid) {
      let watch: string | undefined,
        cancelled = false;
      void Geolocation.requestPermissions()
        .then(() => {
          if (cancelled) return;
          return Geolocation.watchPosition(
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
            (position, error) => {
              if (cancelled) return;
              if (position) accept(position);
              else if (error) setStatus('unavailable');
            },
          );
        })
        .then((id) => {
          watch = id;
          if (cancelled && id) void Geolocation.clearWatch({ id });
        })
        .catch(() => {
          if (!cancelled) setStatus('denied');
        });
      return () => {
        cancelled = true;
        mounted.current = false;
        if (watch) void Geolocation.clearWatch({ id: watch });
      };
    }
    if (!navigator.geolocation || !window.isSecureContext) {
      setStatus('unavailable');
      return;
    }
    const id = navigator.geolocation.watchPosition(accept, fail, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 20000,
    });
    return () => {
      mounted.current = false;
      navigator.geolocation.clearWatch(id);
    };
  }, [accept, fail]);
  const requestFix = useCallback(
    (): Promise<Fix> =>
      new Promise((resolve, reject) => {
        if (nativeAndroid) {
          setStatus('waiting');
          void Geolocation.requestPermissions()
            .then(() =>
              Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 20000,
              }),
            )
            .then((p) => resolve(accept(p)))
            .catch(() => {
              setStatus('unavailable');
              reject(new Error('Allow location in Android settings and try again outdoors.'));
            });
          return;
        }
        if (!navigator.geolocation || !window.isSecureContext) {
          setStatus('unavailable');
          reject(new Error('Location needs a secure connection and a supported browser.'));
          return;
        }
        setStatus('waiting');
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(accept(p)),
          (error) => {
            fail(error);
            reject(
              new Error(
                error.code === 1
                  ? 'Allow location in your browser to save a sighting where you are.'
                  : 'Could not get a fresh location. Try again outdoors.',
              ),
            );
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
        );
      }),
    [accept, fail],
  );
  return { fix, status, requestFix };
}
