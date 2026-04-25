import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '../types';

const STORAGE_KEY = 'flipscout_settings';

export function loadSettings(): AppSettings {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) try { return JSON.parse(saved); } catch (e) {}
  return {
    zipCode: '01602',
    minProfitPct: 50,
    hideGray: true,
    guestMode: false,
    savedFinds: [],
  };
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useOfflineQueue() {
  const [offlineQueue, setOfflineQueue_] = useState<[
    { path: string, data: any }
  ]_>([]);
  // Implement queue logic if needed ...
  return { offlineQueue };
}
