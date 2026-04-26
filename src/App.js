import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ────────────────────── Config & Formatters ────────────────────── */
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
];

const fmt = (n) => "$" + (n || 0).toFixed(2);
const pct = (n) => (n || 0).toFixed(1) + "%";

export default function App() {
  const [tab, setTab] = useState("home");
  const [zip, setZip] = useState("01602");
  const [selectedCat, setSelectedCat] = useState("all");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  
  // Mock Data for Pro Features
  const [leads, setLeads] = useState([
    { id: 1, name: "Sony WH-1000XM5", store: "Target", cost: 249.99, sell: 399.99, profit: 92.50, roi: 37.1, score: "Strong" },
    { id: 2, name: "Keurig K-Slim", store: "Walmart", cost: 39.00, sell: 129.99, profit: 54.20, roi: 138.9, score: "Undisputed" }
  ]);
  
  const [viralRadar, setViralRadar] = useState([
    { name: "NeeDoh Nice Cube", signal: "9.2x Spike", source: "TikTok Viral", status: "Critical Demand" },
    { name: "Stanley Quencher 40oz", signal: "2.4x Speed", source: "Social signal", status: "Low Stock" }
  ]);

  const [feed, setFeed] = useState([
    { id: 1, user: "FlippingPro", msg: "Just cleared out a Walmart of Nice Cubes! 🔥", time: "2m ago" },
    { id: 2, user: "ScoutMaster", msg: "Sony XM5s are in stock at Target Worcester!", time: "5m ago" }
  ]);

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
    <div className="app-container">
      <style>{`
        .app-container {
          background-color: #000;
          color: #10b981;
          min-height: 100vh;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          padding-bottom: 120px;
        }
        .inner-content { max-width: 600px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-top: 10px; }
        .logo { font-size: 2.2rem; font-weight: 900; letter-spacing: -0.05em; color: #fff; }
        .logo span { color: #10b981; }
        
        .tab-bar { display: flex; gap: 10px; margin-bottom: 30px; overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch; }
        .tab-button { padding: 10px 24px; border-radius: 30px; border: 1px solid #10b98133; background: transparent; color: #10b981; font-weight: 800; font-size: 0.8rem; cursor: pointer; text-transform: uppercase; transition: all 0.2s; white-space: nowrap; }
        .tab-button.active { background: #10b981; color: #000; border-color: #10b981; box-shadow: 0 5px 15px rgba(16,185,129,0.3); }

        .search-panel { background: #0a0a0a; border: 1px solid #222; padding: 25px; border-radius: 28px; margin-bottom: 30px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.05); }
        .input-group { display: flex; gap: 12px; margin-bottom: 20px; }
        .master-input { background: #000; border: 1px solid #333; color: #fff; padding: 15px; border-radius: 15px; flex: 1; font-size: 1rem; outline: none; focus: border-color: #10b981; }
        .master-btn { width: 100%; padding: 18px; background: #10b981; color: #000; border: none; border-radius: 18px; font-weight: 900; font-size: 1rem; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em; }
        .master-btn:hover { background: #34d399; transform: translateY(-2px); }
        .master-btn:active { transform: translateY(0); }

        .product-card { background: #0a0a0a; padding: 25px; border-radius: 32px; border: 1px solid #10b98133; display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; transition: all 0.2s; }
        .product-card:hover { border-color: #10b981; background: #0d0d0d; }
        .product-name { color: #fff; font-size: 1.25rem; font-weight: 800; margin: 0; line-height: 1.2; }
        .product-meta { color: #666; font-size: 0.85rem; margin-top: 6px; font-weight: 600; }
        .profit-badge { text-align: right; }
        .profit-val { font-size: 1.8rem; font-weight: 900; color: #10b981; letter-spacing: -0.02em; }
        .roi-val { font-size: 0.85rem; font-weight: 800; background: #10b9811a; padding: 4px 10px; border-radius: 8px; margin-top: 5px; display: inline-block; }

        .lead-hot { border-left: 4px solid #f59e0b; }
        .tag-viral { background: #ec48991a; color: #ec4899; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 900; margin-left: 8px; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        .feed-container { background: #0a0a0a; border-radius: 28px; padding: 20px; height: 60vh; overflow-y: auto; border: 1px solid #222; }
        .msg-bubble { background: #111; padding: 15px; border-radius: 20px; border-bottom-left-radius: 4px; margin-bottom: 15px; border: 1px solid #222; }
        .msg-user { font-size: 0.75rem; font-weight: 900; color: #fff; margin-bottom: 5px; }
        .msg-text { font-size: 0.9rem; color: #ccc; line-height: 1.4; }

        .floating-fab { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); background: #10b981; color: #000; padding: 20px 45px; border-radius: 50px; font-weight: 900; font-size: 1.1rem; box-shadow: 0 15px 40px rgba(16,185,129,0.4); cursor: pointer; transition: all 0.3s; z-index: 100; border: none; }
        .floating-fab:hover { transform: translateX(-50%) translateY(-5px) scale(1.05); background: #34d399; }
      `}</style>

      <div className="inner-content">
        <header className="header">
          <div className="logo">Flip<span>Scout</span></div>
          <div style={{ background: "#10b9811a", color: "#10b981", padding: "6px 12px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: "900" }}>PRO ACCESS</div>
        </header>

        <nav className="tab-bar">
          {["home", "leads", "radar", "community", "scan"].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-button ${tab === t ? 'active' : ''}`}>
              {t === "scan" ? "📷 OCR" : t}
            </button>
          ))}
        </nav>

        {tab === "home" && (
          <section className="animate-in">
            <div className="search-panel">
              <div className="input-group">
                <input value={zip} onChange={e => setZip(e.target.value)} className="master-input" placeholder="ZIP" />
                <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="master-input" style={{ flex: 2 }}>
                  {ALL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <button onClick={handleSearch} disabled={loading} className="master-btn">
                {loading ? "SEARCHING RETAIL NETWORK..." : "SCOUT LOCAL DEALS"}
              </button>
            </div>

            <div className="results-grid">
              {analyses.map(a => (
                <div key={a.sku} className="product-card">
                  <div>
                    <h3 className="product-name">{a.productName} {a.viral?.isViral && <span className="tag-viral">VIRAL</span>}</h3>
                    <div className="product-meta">Best Buy • Aisle {a.aisle || "A12"} • {a.distance || "2.4"} mi</div>
                  </div>
                  <div className="profit-badge">
                    <div className="profit-val">+{fmt(a.recommendation?.bestProfit)}</div>
                    <div className="roi-val">{a.recommendation?.bestROI}% ROI</div>
                  </div>
                </div>
              ))}
              {analyses.length === 0 && !loading && (
                <div style={{ textAlign: "center", marginTop: "80px", opacity: 0.3 }}>
                  <div style={{ fontSize: "4rem" }}>🔬</div>
                  <p style={{ fontWeight: "900", marginTop: "10px" }}>NETWORK IDLE. ENTER TARGETS.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "leads" && (
          <section className="animate-in">
            <h2 style={{ color: "#fff", fontWeight: "900", marginBottom: "20px" }}>🎯 TOP PROFIT LEADS</h2>
            {leads.map(l => (
              <div key={l.id} className="product-card lead-hot">
                <div>
                  <h3 className="product-name">{l.name}</h3>
                  <div className="product-meta">{l.store} • Score: {l.score}</div>
                </div>
                <div className="profit-badge">
                  <div className="profit-val" style={{ color: "#f59e0b" }}>+{fmt(l.profit)}</div>
                  <div className="roi-val" style={{ color: "#f59e0b", background: "#f59e0b1a" }}>{l.roi}% ROI</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "radar" && (
          <section className="animate-in">
            <h2 style={{ color: "#fff", fontWeight: "900", marginBottom: "20px" }}>🔥 VIRAL RADAR</h2>
            <div style={{ display: "grid", gap: "15px" }}>
              {viralRadar.map(v => (
                <div key={v.name} className="search-panel" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: "900", color: "#ec4899", marginBottom: "5px" }}>{v.source.toUpperCase()}</div>
                      <h3 style={{ margin: 0, color: "#fff", fontSize: "1.3rem" }}>{v.name}</h3>
                      <div style={{ color: "#10b981", fontWeight: "bold", marginTop: "5px" }}>⚡ {v.signal} spiking</div>
                    </div>
                    <div style={{ background: "#ec4899", color: "#fff", padding: "5px 10px", borderRadius: "10px", fontSize: "0.7rem", fontWeight: "900" }}>{v.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "community" && (
          <section className="animate-in">
            <h2 style={{ color: "#fff", fontWeight: "900", marginBottom: "20px" }}>💬 SUCCESS FEED</h2>
            <div className="feed-container">
              {feed.map(m => (
                <div key={m.id} className="msg-bubble">
                  <div className="msg-user">{m.user} • {m.time}</div>
                  <div className="msg-text">{m.text || m.msg}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
              <input value={inputMsg} onChange={e => setInputMsg(e.target.value)} className="master-input" placeholder="Post a win..." />
              <button onClick={handleSend} className="tab-button active" style={{ padding: "0 25px" }}>POST</button>
            </div>
          </section>
        )}

        {tab === "scan" && (
          <section className="animate-in" style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: "120px", height: "120px", background: "#111", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 30px", border: "2px solid #333" }}>
              <span style={{ fontSize: "3rem" }}>📷</span>
            </div>
            <h2 style={{ color: "#fff", fontWeight: "900" }}>AI RECEIPT SCANNER</h2>
            <p style={{ color: "#666" }}>Snap a photo of your retail receipt.<br/>FlipScout AI will automatically list your items.</p>
            <button className="master-btn" style={{ maxWidth: "250px", marginTop: "30px" }}>OPEN CAMERA</button>
          </section>
        )}

      </div>

      <button className="floating-fab" onClick={() => setTab("home")}>
        🚀 START NEW SCOUT
      </button>
    </div>
  );
}
