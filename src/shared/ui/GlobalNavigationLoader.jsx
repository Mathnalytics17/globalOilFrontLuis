import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import GlobalOilLoader from './GlobalOilLoader';

const MIN_VISIBLE_MS = 220;

export default function GlobalNavigationLoader() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const startedAtRef = useRef(0);
  const finishTimerRef = useRef(null);

  useEffect(() => {
    const clearFinishTimer = () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };

    const handleStart = () => {
      clearFinishTimer();
      startedAtRef.current = Date.now();
      setIsNavigating(true);
    };

    const handleDone = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);

      clearFinishTimer();
      finishTimerRef.current = window.setTimeout(() => {
        setIsNavigating(false);
        finishTimerRef.current = null;
      }, remaining);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);

    return () => {
      clearFinishTimer();
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router.events]);

  if (!isNavigating) return null;

  return (
    <div className="go-navigation-loader" role="presentation">
      <div className="go-navigation-loader__scrim" />
      <div className="go-navigation-loader__panel">
        <GlobalOilLoader label="Cargando vista..." />
      </div>
    </div>
  );
}
