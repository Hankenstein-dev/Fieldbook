import { useCallback, useEffect, useState } from 'react';
interface CompassEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}
type OrientationPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};
export const circularDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180;
export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [permission, setPermission] = useState<'needed' | 'active' | 'unavailable'>('active');
  useEffect(() => {
    const api = window.DeviceOrientationEvent as OrientationPermission | undefined;
    if (!api) {
      setPermission('unavailable');
      return;
    }
    if (api.requestPermission) setPermission('needed');
    const receive = (event: DeviceOrientationEvent) => {
      const e = event as CompassEvent;
      const webkit =
        typeof e.webkitCompassHeading === 'number' && (e.webkitCompassAccuracy ?? 0) >= 0;
      const absolute = event.absolute || event.type === 'deviceorientationabsolute';
      if (!webkit && (!absolute || event.alpha === null)) return;
      const raw = webkit
        ? e.webkitCompassHeading!
        : 360 - event.alpha! + (window.screen.orientation?.angle ?? 0);
      const value = ((raw % 360) + 360) % 360;
      setHeading((old) =>
        old === null ? value : (old + circularDelta(old, value) * 0.3 + 360) % 360,
      );
      setPermission('active');
    };
    window.addEventListener('deviceorientationabsolute', receive);
    window.addEventListener('deviceorientation', receive);
    return () => {
      window.removeEventListener('deviceorientationabsolute', receive);
      window.removeEventListener('deviceorientation', receive);
    };
  }, []);
  const request = useCallback(async () => {
    try {
      const api = window.DeviceOrientationEvent as OrientationPermission | undefined;
      if (api?.requestPermission)
        setPermission((await api.requestPermission()) === 'granted' ? 'active' : 'unavailable');
    } catch {
      setPermission('unavailable');
    }
  }, []);
  return { heading, permission, request };
}
