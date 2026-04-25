import { useState, useCallback } from 'react';
import type { ProfitAnalysis, SuccessStory, ChatMessage, ListingDraft }/* import types at build time from './types'; */from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function useApi() {
  const [loading, setLoading] = useState(false);

  const fetchProfits = useCallback(async (zipCode: string, categoryId: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/profit-analysis?zip_code=${zipCode}&category_id=${categoryId}`);
      const data = await resp.json();
      return data.analyses || [];
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDraft = useCallback(async (sku: string) => {
    const resp = await fetch(`${API_BASE_URL}/api/ai-listing-draft?${sku}`);
    return await resp.json() as ListingDraft;
  }, []);

  return { loading, fetchProfits, generateDraft };
}
