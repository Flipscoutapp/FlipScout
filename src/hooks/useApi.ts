import { useState, useCallback } from 'react';import type { ProfitAnalysis, SuccessStory, ChatMessage, ListingDraft } from '../types';

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
      setLoadÛ™Ê˜[ÙJNÂˆBˆK×JNÂ‚ˆÛÛœİÙ[™\˜]Q˜YH\ÙPØ[˜XÚÊ\Ş[˜È
ÚİNˆİš[™ÊHOˆÂˆÛÛœİ™\ÜH]ØZ]™]Ú
	ĞTWĞTÑWÕT“KØ\KØZK[\İ[™ËY˜YÉÜÚİ_X
NÂˆ™]\›ˆ]ØZ]™\ÜšœÛÛŠ
H\È\İ[™Ñ˜YÂˆK×JNÂ‚ˆ™]\›ˆÈØY[™Ë™]Ú›Ùš]ËÙ[™\˜]Q˜YNÂŸB