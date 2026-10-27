import { useEffect, useState } from "react";

/** Seconds left until `deadline` (ms timestamp), updated every second; 0 when passed. */
export function useCountdown(deadline: number | null): number {
  const compute = () => (deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0);
  const [seconds, setSeconds] = useState(compute);

  useEffect(() => {
    setSeconds(compute());
    if (!deadline) return;
    const timer = window.setInterval(() => {
      const left = compute();
      setSeconds(left);
      if (left === 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
    // compute depends only on deadline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  return seconds;
}
