import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  TabId, AppSettings, Store, ProfitAnalysis, ProfitSummary,
  MyFind, Performance, ListingDraft, SuccessStory, ChatMessage
} from "./types";
import { useApi } from "./hooks/useApi";
import { useFeedback } from "./hooks/useFeedback";
import { useOfflineQueue, loadSettings, saveSettings } from "./hooks/useOffline";

const ALL_CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "🔍" },
  { id: "abcat0502000", name: "Laptops", emoji: "💻" }
];

const fmt = (n: number) => "$" + n.toFixed(2);
const pct = (n: number) => n.toFixed(1) + "%";

export default function App() {
  const [tab, setTab] = useState("home");
  const [settings, setSettings] = useState(loadSettings());
  const [selectedCat, setSelectedCat] = useState("all");
  const [analyses, setAnalyses] = useState([]);
  const { loading, fetchProfits } = useApi();

  const handleSearch = async () => {
    const res = await fetchProfits(settings.zipCode, selectedCat);
    setAnalyses(res || []);
  };

  return (
    <div className="min-h-screen bg-black text-emerald-400 p-6">
      <h1 className="text-3xl font-black">FlipScout Pro</h1>
      <button onClick={handleSearch} className="bg-emerald-600 text-white px-8 py-2 rounded-lg mt-4">
        {loading ? "Scanning..." : "Scout"}
      </button>
      <div className="grid gap-4 mt-8">
        {analyses.map((a: any) => (
          <div key={a.sku} className="bg-gray-900 p-6 rounded-3xl border border-emerald-500/20">
            <h3 className="font-bold">{a.productName}</h3>
            <p className="text-2xl">{fmt(a.recommendation.bestProfit)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}