import React, { useState, useMemo } from "react";
import { useApi } from "./hooks/useApi";
import { useFeedback } from "./hooks/useFeedback";
import { loadSettings } from "./hooks/useOffline";

const ALL_CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "🔍" },
  { id: "abcat0502000", name: "Laptops", emoji: "💻" }
];

const fmt = (n) => "$" + (n || 0).toFixed(2);

export default function App() {
  const [settings] = useState(loadSettings());
  const [selectedCat] = useState("all");
  const [analyses, setAnalyses] = useState([]);
  const { loading, fetchProfits } = useApi();

  const handleSearch = async () => {
    const res = await fetchProfits(settings.zipCode, selectedCat);
    setAnalyses(res || []);
  };

  return (
    <div style={{ backgroundColor: "black", color: "#10b981", minHeight: "100vh", padding: "20px" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "900" }}>FlipScout Pro</h1>
      <button onClick={handleSearch} style={{ backgroundColor: "#059669", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", marginTop: "20px", cursor: "pointer" }}>
        {loading ? "Scanning..." : "Scout"}
      </button>
      <div style={{ marginTop: "30px", display: "grid", gap: "20px" }}>
        {analyses.map((a) => (
          <div key={a.sku} style={{ backgroundColor: "#1a1a1a", padding: "20px", borderRadius: "15px", border: "1px solid #10b98133" }}>
            <h3 style={{ margin: 0 }}>{a.productName}</h3>
            <p style={{ fontSize: "1.5rem", color: "#10b981" }}>+{fmt(a.recommendation?.bestProfit)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
