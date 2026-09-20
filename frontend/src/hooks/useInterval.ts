import { useEffect, useRef } from 'react';

export function useInterval(callback: () => void | Promise<void>, delay: number | null) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return undefined;

    const tick = () => {
      void callbackRef.current();
    };

    const intervalId = window.setInterval(tick, delay);
    return () => window.clearInterval(intervalId);
  }, [delay]);
}

export default useInterval;
