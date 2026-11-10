import { useState, useCallback } from 'react';
import type { PlayerAction, ActionType } from '../engine/types';

export type TiltStatus = 'Ice Cold' | 'Cool' | 'Warm' | 'Hot' | 'On Fire' | 'TILTING';

export interface TrackedAction {
  action: string;
  timestamp: number;
  isVoluntary: boolean; // Call, Raise, All-in
  isAggressive: boolean; // Raise, All-in
  isFold: boolean;
  amount?: number;
}

export interface UseTiltMeterReturn {
  tiltLevel: number; // 0 - 100
  status: TiltStatus;
  color: string;
  glow: string;
  vpip: number; // 0 - 100%
  foldRate: number; // 0 - 100%
  aggressionFactor: number;
  actionsCount: number;
  recordAction: (action: PlayerAction | ActionType | string, amount?: number) => void;
  recordHandResult: (won: boolean, netLoss?: number) => void;
  resetTilt: () => void;
  setTiltLevel: (level: number) => void;
}

const TILT_CONFIG: {
  max: number;
  status: TiltStatus;
  color: string;
  glow: string;
}[] = [
  { max: 20, status: 'Ice Cold', color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.6)' },
  { max: 40, status: 'Cool', color: '#00F0FF', glow: 'rgba(0, 240, 255, 0.7)' },
  { max: 60, status: 'Warm', color: '#FFB800', glow: 'rgba(255, 184, 0, 0.7)' },
  { max: 80, status: 'Hot', color: '#FF6B00', glow: 'rgba(255, 107, 0, 0.8)' },
  { max: 90, status: 'On Fire', color: '#FF007F', glow: 'rgba(255, 0, 127, 0.85)' },
  { max: 100, status: 'TILTING', color: '#FF0055', glow: 'rgba(255, 0, 85, 0.95)' },
];

export function getTiltInfo(level: number): {
  status: TiltStatus;
  color: string;
  glow: string;
} {
  const clamped = Math.max(0, Math.min(100, Math.round(level)));
  const found = TILT_CONFIG.find((t) => clamped <= t.max);
  return (
    found || {
      status: 'TILTING',
      color: '#FF0055',
      glow: 'rgba(255, 0, 85, 0.95)',
    }
  );
}

/**
 * useTiltMeter
 * Tracks player behavioral psychology via VPIP (Voluntarily Put in Pot),
 * Aggression Factor, and consecutive bad beats to compute real-time Tilt Level (0-100).
 */
export function useTiltMeter(windowSize: number = 20): UseTiltMeterReturn {
  const [actions, setActions] = useState<TrackedAction[]>([]);
  const [badBeatCount, setBadBeatCount] = useState<number>(0);
  const [manualTilt, setManualTilt] = useState<number | null>(null);

  /**
   * Record a player action
   */
  const recordAction = useCallback((rawAction: PlayerAction | ActionType | string, amount?: number) => {
    const act = String(rawAction).toUpperCase();
    const isVoluntary = act === 'CALL' || act === 'RAISE' || act === 'ALL_IN' || act === 'ALL-IN';
    const isAggressive = act === 'RAISE' || act === 'ALL_IN' || act === 'ALL-IN';
    const isFold = act === 'FOLD';

    const newRecord: TrackedAction = {
      action: act,
      timestamp: Date.now(),
      isVoluntary,
      isAggressive,
      isFold,
      amount,
    };

    setActions((prev) => {
      const updated = [...prev, newRecord];
      return updated.length > windowSize ? updated.slice(updated.length - windowSize) : updated;
    });
  }, [windowSize]);

  /**
   * Record hand outcome (e.g. big losses escalate tilt)
   */
  const recordHandResult = useCallback((won: boolean, netLoss: number = 0) => {
    if (!won && netLoss > 50) {
      setBadBeatCount((prev) => Math.min(prev + 1, 5));
    } else if (won) {
      setBadBeatCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const resetTilt = useCallback(() => {
    setActions([]);
    setBadBeatCount(0);
    setManualTilt(null);
  }, []);

  const setTiltLevel = useCallback((level: number) => {
    setManualTilt(Math.max(0, Math.min(100, level)));
  }, []);

  // Compute stats
  const total = actions.length;
  const voluntaryCount = actions.filter((a) => a.isVoluntary).length;
  const foldCount = actions.filter((a) => a.isFold).length;
  const aggressiveCount = actions.filter((a) => a.isAggressive).length;
  const callCount = actions.filter((a) => a.action === 'CALL').length;

  const vpip = total > 0 ? +((voluntaryCount / total) * 100).toFixed(1) : 25; // Default ~25%
  const foldRate = total > 0 ? +((foldCount / total) * 100).toFixed(1) : 40;
  const aggressionFactor = callCount > 0 ? +(aggressiveCount / callCount).toFixed(2) : aggressiveCount > 0 ? 3.0 : 1.0;

  // Calculate dynamic tilt level if manual tilt is not set
  let computedTilt = 15; // Baseline calm (15)

  if (total > 0) {
    // VPIP contribution: standard tight-aggressive VPIP is 20-30%.
    // VPIP > 50% indicates reckless / loose play (tilt symptom)
    let vpipWeight = 0;
    if (vpip > 35) {
      vpipWeight = Math.min(35, (vpip - 35) * 0.9);
    }

    // High aggression contribution
    let aggWeight = 0;
    if (aggressionFactor > 2.0) {
      aggWeight = Math.min(25, (aggressionFactor - 2.0) * 10);
    }

    // Consecutive rapid loss / bad beats
    const beatWeight = badBeatCount * 12;

    // Check for recent repeated all-in frequency
    const recentAllIns = actions.slice(-5).filter((a) => a.action === 'ALL_IN' || a.action === 'ALL-IN').length;
    const allInWeight = recentAllIns * 10;

    computedTilt = Math.min(100, Math.round(15 + vpipWeight + aggWeight + beatWeight + allInWeight));
  }

  const effectiveTilt = manualTilt !== null ? manualTilt : computedTilt;
  const { status, color, glow } = getTiltInfo(effectiveTilt);

  return {
    tiltLevel: effectiveTilt,
    status,
    color,
    glow,
    vpip,
    foldRate,
    aggressionFactor,
    actionsCount: total,
    recordAction,
    recordHandResult,
    resetTilt,
    setTiltLevel,
  };
}

export default useTiltMeter;
