import { useState, useEffect, useRef } from 'react';

export interface UseYieldOptions {
  buyIn: number;
  startTime?: number; // Epoch timestamp in ms
  apy?: number; // Annual Percentage Yield, e.g. 0.12 = 12%
}

export interface UseYieldReturn {
  yieldEarned: number;
  yieldRate: number; // APY as percentage (e.g. 12)
  totalValue: number; // buyIn + yieldEarned
  elapsedSeconds: number;
  yieldPerSecond: number;
  formattedYield: string;
}

const SECONDS_PER_YEAR = 31_557_600; // 365.25 days * 86,400

/**
 * useYield
 * Simulates real-time DeFi yield generation on locked poker chips.
 * With Unicity Protocol's yield-bearing chips, seated buy-ins earn ~12% APY continuously.
 */
export function useYield(
  buyIn: number,
  startTime?: number,
  apy: number = 0.12
): UseYieldReturn {
  const initialTimeRef = useRef<number>(startTime || Date.now());

  // Update initialTimeRef when a new valid startTime is passed
  useEffect(() => {
    if (startTime && startTime > 0) {
      initialTimeRef.current = startTime;
    }
  }, [startTime]);

  const [yieldEarned, setYieldEarned] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Per-second yield multiplier: APY / Seconds in a Year
  const yieldPerSecond = buyIn > 0 ? (buyIn * apy) / SECONDS_PER_YEAR : 0;

  useEffect(() => {
    if (buyIn <= 0) {
      setYieldEarned(0);
      setElapsedSeconds(0);
      return;
    }

    const start = initialTimeRef.current || Date.now();

    const updateYield = () => {
      const now = Date.now();
      const seconds = Math.max(0, Math.floor((now - start) / 1000));
      // Continuous compounding approximation
      const earned = buyIn * apy * (seconds / SECONDS_PER_YEAR);

      setElapsedSeconds(seconds);
      setYieldEarned(+earned.toFixed(6));
    };

    // Immediate initial computation
    updateYield();

    // High precision update every second
    const interval = setInterval(updateYield, 1000);

    return () => clearInterval(interval);
  }, [buyIn, apy]);

  const totalValue = +(buyIn + yieldEarned).toFixed(6);
  const formattedYield = `+${yieldEarned.toFixed(4)} UCT`;

  return {
    yieldEarned,
    yieldRate: +(apy * 100).toFixed(1), // e.g. 12.0%
    totalValue,
    elapsedSeconds,
    yieldPerSecond,
    formattedYield,
  };
}

export default useYield;
