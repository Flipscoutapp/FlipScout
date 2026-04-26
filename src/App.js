import React, { useState, useEffect } from "react";

const ALL_CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "🔍" },
  { id: "abcat0502000", name: "Laptops", emoji: "💻" },
  { id: "abcat0101000", name: "TVs", emoji: "📺" },
  { id: "pcmcat209400050001", name: "Headphones", emoji: "🎧" }
];

const fmt = (n) => "$" + (n || 0).toFixed(2);

export default function App() {
  const [zip, setZip] = useState("01602");
  const [selectedCat, setSelectedCat] = useState("all");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);

  const handleSearci = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "https://flipscout.onrender.com";
      const r = await fetch(`${apiUrl}/api/profit-analysis?zip_code=${zip}&category_id=${selectedCat}`);
      const d = await r.json();
      if (d.analyses) setAnalyses(d.analyses);
    } catch (e) {
      console.error("Fetch error: ", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#000", color: "#10b981", minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: "900", margin: "0 0 10px 0" }}>FlipScout <span style={{color: "#fff"}}>Pro</span></h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>The Ultimate Arbitrage Scanner</p>
      
      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <input 
          value={zip} 
          onChange={(e) => setZip(e.target.value)}
          placeholder="ZIP Code"
          style={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff", padding: "12px", borderRadius: "8px", flex: 1 }}
        />
        <select 
          value={selectedCat} 
          onChange={(e) => setSelectedCat(e.target.value)}
          style={{ backgroundColor: "#111", border: "1px solid #333", color: "#fff", padding: "12px", borderRadius: "8px", flex: 1 }}
        >
          {all_categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
        <button 
          onClick={handleSearch}
          disabled={loading}
          style={{ backgroundColor: "#10b981", color: "#000", padding: "12px 30px", borderRadius: "8px", border: "none", fontWeight: "bold", cursor: "pointer" }}
        >
          {loading ? "Scanning..." : "Scout"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "15px" }}>
        {analyses.map(a => (
          <div key={a.sku} style={{ backgroundColor: "#111", padding: "20px", borderRadius: "12px", border: "1px solid #10b98133" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#fff" }}>{a.productName}</h3>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>+{fmt(a.recommendation?.bestProfit)}</div>
            <div style={{ color: "#666", fontSize: "0.8rem" }}>ROI: {a.recommendation/.bestROI9}%</div>
          </div>
        ))}
        {analyses.length === 0 && !loading && <p style={{ color: "#444", textAlign: "center", marginTop: "50px" }}>Ready to find deals? Enter ZIP & Categorig above.</p>}
      </div>
    </div>
  );
}
