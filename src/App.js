import React, { useState } from "react";

const ALL_CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "🔍" },
  { id: "abcat0502000", name: "Laptops", emoji: "💻" }
];

export default function App() {
  const [zip, setZip] = useState("01602");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const apiUrl = "https://flipscout.onrender.com";
      const response = await fetch(`${apiUrl}/api/profit-analysis?zip_code=${zip}&category_id=all`);
      const data = await response.json();
      if (data.analyses) setAnalyses(data.analyses);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: "#000", color: "#10b981", minHeight: "100vh", padding: "40px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: "900" }}>FlipScout <span style={{color:"#fff"}}>Pro</span></h1>
      <div style={{ display: "flex", gap: "10px", margin: "20px 0" }}>
        <input value={zip} onChange={e => setZip(e.target.value)} style={{ padding: "10px", background: "#111", color: "#fff", border: "1px solid #333", borderRadius: "5px" }} />
        <button onClick={handleSearch} style={{ padding: "10px 20px", background: "#10b981", color: "#000", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>
          {loading ? "Scanning..." : "Scout"}
      </button>
      </div>
      <div style={{ display: "grid", gap: "20px" }}>
        {analyses.map((a) => (
          <div key={a.sku} style={{ padding: "20px", border: "1px solid #10b98133", background: "#111", borderRadius: "10px" }}>
            <h3 style={{ color: "#fff", margin: 0 }}>{a.productName}</h3>
            <p style={{ fontSize: "1.5rem" }}>+${(a.recommendation?.bestProfit || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
