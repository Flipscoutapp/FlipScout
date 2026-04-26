import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ────────────────────── Configuration ────────────────────── */
const ALL_CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "🔍" },
  { id: "abcat0502000", name: "Laptops", emoji: "💻" },
  { id: "abcat0101000", name: "TVs", emoji: "📺" },
  { id: "pcmcat209400050001", name: "Headphones", emoji: "🎧" },
  { id: "abcat0204000", name: "Cameras", emoji: "📷" },
  { id: "pcmcat241600050001", name: "Tablets", emoji: "📱" },
  { id: "abcat0904000", name: "Kitchen", emoji: "🍳" },
  { id: "pcmcat242800050021", name: "Smartwatches", emoji: "⌚" },
  { id: "pcmcat748302702702", name: "Audio", emoji: "🔊" },
  { id: "abcat0811001", name: "Gaming", emoji: "🎮" },
  { id: "pcmcat332000050000", name: "Networking", emoji: "🌐" },
];

const fmt = (n) => "$" + (n || 0).toFixed(2);
const pct = (n) => (n || 0).toFixed(1) + "%";

export default function App() {
  const [tab, setTab] = useState("home");
  const [zip, setZip] = useState("01602");
  const [selectedCat, setSelectedCat] = useState("all");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [viralItems, setViralItems] = useState([]);
  const [messages, setMessages] = useState([
    { id: 1, user: "System", text: "Welcome to FlipScout Pro!", time: "Now" }
  ]);
  const [inputMsg, setInputMsg] = useState("");

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://flipscout.onrender.com/api/profit-analysis?zip_code=${zip}&category_id=${selectedCat}`);
      const data = await response.json();
      if (data.analyses) setAnalyses(data.analyses);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSend = () => {
    if (!inputMsg.trim()) return;
    setMessages([...messages, { id: Date.now(), user: "You", text: inputMsg, time: "Just now" }]);
    setInputMsg("");
  };

  return (
    <div style={{ backgroundColor: "#000", color: "#10b981", minHeight: "100vh", paddingBottom: "100px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      
      {/* Header */}
      <header style={{ padding: "15px 20px", background: "#111", borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: "900" }}>FlipScout <span style={{ color: "#fff" }}>Pro</span></div>
        <div style={{ fontSize: "0.8rem", color: "#666" }}>Emerald Master v2.0</div>
      </header>

      <main style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "30px", overflowX: "auto", whiteSpace: "nowrap", paddingBottom: "5px" }}>
          {["home", "leads", "radar", "community", "receipts"].map(t => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              style={{ 
                padding: "8px 20px", borderRadius: "20px", border: "1px solid #10b98133", 
                background: tab === t ? "#10b981" : "transparent",
                color: tab === t ? "#000" : "#10b981",
                fontWeight: "bold", cursor: "pointer", textTransform: "capitalize"
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content Tabs */}
        {tab === "home" && (
          <section>
            <div style={{ background: "#111", padding: "20px", borderRadius: "20px", border: "1px solid #222", marginBottom: "30px" }}>
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <input value={zip} onChange={e => setZip(e.target.value)} style={{ background: "#000", border: "1px solid #333", color: "#fff", padding: "12px", borderRadius: "10px", flex: 1 }} />
                <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} style={{ background: "#000", border: "1px solid #333", color: "#fff", padding: "12px", borderRadius: "10px", flex: 1 }}>
                  {ALL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <button onClick={handleSearch} disabled={loading} style={{ width: "100%", padding: "15px", background: "#10b981", color: "#000", border: "none", borderRadius: "12px", fontWeight: "900", cursor: "pointer" }}>
                {loading ? "SCANNING NETWORK..." : "SCOUT DEALS"}
              </button>
            </div>

            <div style={{ display: "grid", gap: "15px" }}>
              {analyses.map(a => (
                <div key={a.sku} style={{ background: "#111", padding: "25px", borderRadius: "24px", border: "1px solid #10b98133", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "1.2rem" }}>{a.productName}</h3>
                    <div style={{ color: "#666", fontSize: "0.8rem", marginTop: "5px" }}>Best Buy • Aisle {a.aisle || "A12"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: "900" }}>+{fmt(a.recommendation?.bestProfit)}</div>
                    <div style={{ fontSize: "0.9rem", color: "#10b981", fontWeight: "bold" }}>{a.recommendation?.bestROI}% ROI</div>
                  </div>
                </div>
              ))}
              {analyses.length === 0 && !loading && (
                <div style={{ textAlign: "center", marginTop: "50px", color: "#444" }}>
                  <div style={{ fontSize: "3rem" }}>🔭</div>
                  <p>Network ready. Enter targets above.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "leads" && (
          <section style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 style={{ color: "#fff" }}>🎯 Lead Hunter</h2>
            <div style={{ background: "#111", padding: "30px", borderRadius: "24px", border: "1px solid #10b98133", marginTop: "20px" }}>
              <p>Scanning regional distribution centers for mispriced inventory...</p>
              <div style={{ color: "#666", fontSize: "0.9rem", marginTop: "15px" }}>Estimated: 12 high-ROI leads available in your radius.</div>
            </div>
          </section>
        )}

        {tab === "radar" && (
          <section style={{ padding: "20px 0" }}>
            <h2 style={{ color: "#fff" }}>🔥 Viral Radar</h2>
            <div style={{ background: "#111", padding: "25px", borderRadius: "24px", border: "1px solid #10b98133", marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #222", paddingBottom: "15px", marginBottom: "15px" }}>
                <span>Trending: NeeDoh Nice Cube</span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>CRITICAL DEMAND</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Trending: Stanley Quencher 40oz</span>
                <span style={{ color: "#fff", fontWeight: "bold" }}>LOW STOCK ALERT</span>
              </div>
            </div>
          </section>
        )}

        {tab === "community" && (
          <section style={{ height: "70vh", display: "flex", flexDirection: "column" }}>
            <h2 style={{ color: "#fff" }}>💬 Success Feed</h2>
            <div style={{ flex: 1, overflowY: "auto", background: "#111", borderRadius: "24px", padding: "20px", marginBottom: "15px", border: "1px solid #222" }}>
              {messages.map(m => (
                <div key={m.id} style={{ marginBottom: "20px" }}>
                  <div style={{ fontWeight: "bold", fontSize: "0.8rem", color: m.user === "You" ? "#10b981" : "#fff" }}>{m.user} • {m.time}</div>
                  <div style={{ background: "#000", padding: "15px", borderRadius: "15px", marginTop: "5px", border: "1px solid #222", color: "#ccc" }}>{m.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="Share a win..." style={{ flex: 1, background: "#111", border: "1px solid #333", color: "#fff", padding: "15px", borderRadius: "12px" }} />
              <button onClick={handleSend} style={{ background: "#10b981", color: "#000", border: "none", padding: "0 25px", borderRadius: "12px", fontWeight: "bold" }}>Post</button>
            </div>
          </section>
        )}

        {tab === "receipts" && (
          <section style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 style={{ color: "#fff" }}>📸 Receipt OCR</h2>
            <div style={{ padding: "50px", border: "2px dashed #333", borderRadius: "30px", marginTop: "20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>🧾</div>
              <p style={{ color: "#666" }}>Click to scan receipt. AI will auto-list item.</p>
            </div>
          </section>
        )}

      </main>

      {/* Floating Action Button */}
      <div style={{ position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", background: "#10b981", color: "#000", padding: "18px 40px", borderRadius: "50px", fontWeight: "900", boxShadow: "0 10px 40px rgba(16,185,129,0.4)", cursor: "pointer" }}>
        🚀 START NEW SCOUT
      </div>
    </div>
  );
}
