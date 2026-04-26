import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ────────────────────── Config & Mock Data ────────────────────── */
const ALL_CATEGORIES = [
  { id: "all", name: "All Categories", emoji: "🔍" },
  { id: "abcat0502000", name: "Laptops", emoji: "💻" },
  { id: "abcat0101000", name: "TVs", emoji: "📺" },
  { id: "pcmcat209400050001", name: "Headphones", emoji: "🎧" },
  { id: "abcat0204000", name: "Cameras", emoji: "📷" },
  { id: "pcmcat241600050001", name: "Tablets", emoji: "📱" },
];

const fmt = (n) => "$" + (n || 0).toFixed(2);

export default function App() {
  const [tab, setTab] = useState("home");
  const [zip, setZip] = useState("01602");
  const [selectedCat, setSelectedCat] = useState("all");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  
  // Real logic combined with premium UI
  const [leads] = useState([
    { id: 1, name: "Sony WH-1000XM5", profit: 92.50, roi: 37, store: "Target", distance: "1.2 mi", aisle: "E22", status: "In Stock" },
    { id: 2, name: "Keurig K-Slim", profit: 54.20, roi: 138, store: "Walmart", distance: "2.8 mi", aisle: "A15", status: "Low Stock" },
    { id: 3, name: "iPad Air (5th Gen)", profit: 110.00, roi: 22, store: "Best Buy", distance: "0.5 mi", aisle: "C4", status: "In Stock" }
  ]);

  const handleSearch = async () => {
    setLoading(true);
    setAnalyses([]);
    try {
      const apiUrl = "https://flipscout.onrender.com";
      const response = await fetch(`${apiUrl}/api/profit-analysis?zip_code=${zip}&category_id=${selectedCat}`);
      const data = await response.json();
      if (data.analyses) setAnalyses(data.analyses);
    } catch (e) { 
      console.error(e);
      // Fallback for demo
      setAnalyses(leads);
    } finally { setLoading(false); }
  };

  return (
    <div className="app-container">
      <style>{`
        :root { --emerald: #10b981; --onyx: #050505; --glass: rgba(255,255,255,0.03); }
        body { margin: 0; background: #000; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        .app-container { background: var(--onyx); color: var(--emerald); min-height: 100vh; padding-bottom: 120px; }
        .content { max-width: 480px; margin: 0 auto; padding: 20px; }
        
        .header { display: flex; justify-content: space-between; align-items: center; padding: 20px 0 30px; }
        .logo { font-size: 2.2rem; font-weight: 900; color: #fff; letter-spacing: -2px; }
        .logo span { color: var(--emerald); }

        .card { background: linear-gradient(145deg, #111, #080808); border: 1px solid rgba(255,255,255,0.05); border-radius: 28px; padding: 25px; margin-bottom: 20px; position: relative; overflow: hidden; }
        .card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent); }

        .input-group { display: flex; gap: 8px; margin-bottom: 15px; }
        .main-input { background: #000; border: 1px solid #222; color: #fff; padding: 16px; border-radius: 16px; flex: 1; font-weight: 600; outline: none; }
        .scout-btn { width: 100%; padding: 18px; background: var(--emerald); color: #000; border: none; border-radius: 18px; font-weight: 950; font-size: 1.1rem; cursor: pointer; box-shadow: 0 10px 30px rgba(16,185,129,0.2); transition: all 0.2s; }
        .scout-btn:active { transform: scale(0.98); }

        .item-row { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #0f0f0f; border-radius: 24px; border: 1px solid rgba(16,185,129,0.1); margin-bottom: 12px; cursor: pointer; transition: 0.2s; }
        .item-row:hover { border-color: var(--emerald); background: #151515; }
        .item-info h4 { margin: 0; color: #fff; font-size: 1.1rem; font-weight: 800; }
        .item-info p { margin: 4px 0 0; color: #555; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
        
        .profit-side { text-align: right; }
        .profit-main { font-size: 1.5rem; font-weight: 900; }
        .roi-tag { font-size: 0.7rem; font-weight: 900; background: rgba(16,185,129,0.1); padding: 4px 8px; border-radius: 6px; margin-top: 5px; display: inline-block; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: flex-end; }
        .modal-content { background: #0f0f0f; width: 100%; border-top: 2px solid var(--emerald); border-radius: 32px 32px 0 0; padding: 40px 30px; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .map-preview { height: 120px; background: #111; border-radius: 20px; margin: 20px 0; border: 1px solid #222; display: flex; align-items: center; justify-content: center; color: #444; }
        
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(5,5,5,0.9); backdrop-filter: blur(20px); border-top: 1px solid #111; display: flex; justify-content: space-around; padding: 20px 0 35px; z-index: 500; }
        .nav-btn { background: none; border: none; color: #444; font-size: 0.7rem; font-weight: 800; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; }
        .nav-btn.active { color: var(--emerald); }
        .nav-icon { font-size: 1.4rem; }
      `}</style>

      <div className="content">
        <header className="header">
          <div className="logo">Flip<span>Scout</span></div>
          <div style={{ background: "rgba(16,185,129,0.1)", padding: "8px 15px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 900 }}>PRO ACTIVE</div>
        </header>

        {tab === "home" && (
          <div>
            <div className="card">
              <h2 style={{ color: "#fff", margin: "0 0 20px 0", fontSize: "1.3rem" }}>Scout Network</h2>
              <div className="input-group">
                <input value={zip} onChange={e => setZip(e.target.value)} className="main-input" placeholder="ZIP" />
                <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="main-input" style={{ flex: 2 }}>
                  {ALL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                </select>
              </div>
              <button onClick={handleSearch} disabled={loading} className="scout-btn">
                {loading ? "SCANNING LOCAL STORES..." : "START RETAIL SCOUT"}
              </button>
            </div>

            <div className="results">
              {analyses.map(a => (
                <div key={a.id || a.sku} className="item-row" onClick={() => setSelectedLead(a)}>
                  <div className="item-info">
                    <h4>{a.productName || a.name}</h4>
                    <p>{a.store} • {a.distance || "0.5 mi"}</p>
                  </div>
                  <div className="profit-side">
                    <div className="profit-main">+{fmt(a.recommendation?.bestProfit || a.profit)}</div>
                    <div className="roi-tag">{(a.recommendation?.bestROI || a.roi)}% ROI</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "leads" && (
          <div>
            <h2 style={{ color: "#fff", fontWeight: 900, marginBottom: "25px" }}>🎯 TOP PROFIT LEADS</h2>
            {leads.map(l => (
              <div key={l.id} className="item-row" onClick={() => setSelectedLead(l)}>
                <div className="item-info">
                  <h4>{l.name}</h4>
                  <p>{l.store} • {l.distance}</p>
                </div>
                <div className="profit-side">
                  <div className="profit-main" style={{ color: "#f59e0b" }}>+{fmt(l.profit)}</div>
                  <div className="roi-tag" style={{ color: "#f59e0b" }}>{l.roi}% ROI</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <span style={{ color: "var(--emerald)", fontWeight: 900, fontSize: "0.7rem", letterSpacing: 2 }}>LEAD ANALYSIS</span>
                <h2 style={{ color: "#fff", margin: "10px 0", fontSize: "1.8rem", fontWeight: 900 }}>{selectedLead.productName || selectedLead.name}</h2>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: "#222", border: "none", color: "#fff", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", margin: "30px 0" }}>
              <div className="card" style={{ padding: "15px", margin: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "#555", fontWeight: 800 }}>EST. PROFIT</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>+{fmt(selectedLead.recommendation?.bestProfit || selectedLead.profit)}</div>
              </div>
              <div className="card" style={{ padding: "15px", margin: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "#555", fontWeight: 800 }}>BEST ROI</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{(selectedLead.recommendation?.bestROI || selectedLead.roi)}%</div>
              </div>
            </div>

            <div className="card" style={{ padding: "20px", marginBottom: "30px" }}>
              <h4 style={{ color: "#fff", margin: "0 0 15px 0" }}>📍 Store Availability</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span>Location:</span>
                <span style={{ color: "#fff", fontWeight: 700 }}>{selectedLead.store} Worcester</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span>Distance:</span>
                <span style={{ color: "#fff", fontWeight: 700 }}>{selectedLead.distance}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span>Aisle:</span>
                <span style={{ color: "var(--emerald)", fontWeight: 900 }}>{selectedLead.aisle}</span>
              </div>
              <div className="map-preview">
                📍 Map data loading...
              </div>
            </div>

            <button className="scout-btn" onClick={() => setSelectedLead(null)}>NAVIGATE TO STORE</button>
          </div>
        </div>
      )}

      <nav className="bottom-nav">
        {[
          { id: "home", label: "Scout", icon: "🔭" },
          { id: "leads", label: "Leads", icon: "🎯" },
          { id: "radar", label: "Radar", icon: "🔥" },
          { id: "social", label: "Social", icon: "💬" }
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`nav-btn ${tab === item.id ? 'active' : ''}`}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
