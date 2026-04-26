import React, { useState, useEffect, useMemo } from "react";

/* ────────────────────── Premium Style Definitions ────────────────────── */
const THEME = {
  emerald: "#10b981",
  onyx: "#050505",
  glass: "rgba(255,255,255,0.03)",
  border: "rgba(16,185,129,0.15)",
  gold: "#f59e0b"
};

const fmt = (n) => "$" + (n || 0).toFixed(2);

export default function App() {
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [zip] = useState("01602");

  /* ────────────────────── Real Worcester Leads ────────────────────── */
  const LEADS_DATA = [
    { 
      id: 1, name: "Sony WH-1000XM5 Noise Canceling", store: "Target", 
      address: "Worcester Great Lincoln St", distance: "1.2 mi", 
      aisle: "E22", status: "In Stock", price: 299.99, profit: 82.50, roi: 32, score: 94,
      trend: "Rising", history: [280, 290, 299, 310]
    },
    { 
      id: 2, name: "Keurig K-Slim Coffee Maker", store: "Walmart", 
      address: "Tobias Boland Way, Worcester", distance: "2.8 mi", 
      aisle: "A15", status: "Low Stock", price: 39.00, profit: 54.20, roi: 138, score: 98,
      trend: "Viral", history: [120, 110, 129, 135]
    },
    { 
      id: 3, name: "LEGO Star Wars Ghost & Phantom II", store: "Best Buy", 
      address: "Worcester Plaza", distance: "0.5 mi", 
      aisle: "Toy Row 4", status: "In Stock", price: 159.99, profit: 45.00, roi: 28, score: 88,
      trend: "Stable", history: [150, 155, 159, 160]
    }
  ];

  const VIRAL_DATA = [
    { name: "NeeDoh Nice Cube", velocity: "12.4x", signal: "Critical", trend: "up" },
    { name: "Stanley Quencher 40oz", velocity: "4.1x", signal: "High", trend: "up" },
    { name: "Bitzee Digital Pet", velocity: "2.8x", signal: "Medium", trend: "down" }
  ];

  const handleScout = async () => {
    setLoading(true);
    // Simulate high-end server connection
    setTimeout(() => {
      setAnalyses(LEADS_DATA);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="upscale-app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;500;800&display=swap');
        .upscale-app {
          background: #000;
          color: #fff;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding-bottom: 120px;
        }
        .container { max-width: 450px; margin: 0 auto; padding: 20px; }
        
        /* ── Header ── */
        .premium-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 0 40px; }
        .glitch-logo { font-size: 2.2rem; font-weight: 800; letter-spacing: -2px; text-transform: uppercase; }
        .glitch-logo span { color: #10b981; text-shadow: 0 0 15px rgba(16,185,129,0.5); }
        .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; margin-right: 8px; }

        /* ── Search Area ── */
        .hero-panel {
          background: linear-gradient(180deg, #111 0%, #000 100%);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 32px;
          padding: 30px;
          margin-bottom: 30px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .scout-btn {
          width: 100%;
          background: #10b981;
          color: #000;
          padding: 20px;
          border-radius: 20px;
          border: none;
          font-weight: 800;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px rgba(16,185,129,0.25);
        }
        .scout-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(16,185,129,0.4); }

        /* ── Cards ── */
        .premium-card {
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 16px;
          display: flex; 
          justify-content: space-between;
          align-items: center;
          transition: 0.3s;
          cursor: pointer;
        }
        .premium-card:hover { border-color: #10b981; background: #0f0f0f; transform: scale(1.02); }
        
        .card-title { font-weight: 700; font-size: 1.05rem; margin-bottom: 5px; }
        .card-sub { color: #555; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        
        .price-badge { text-align: right; }
        .profit-text { font-size: 1.6rem; font-weight: 800; color: #10b981; }
        .roi-text { font-size: 0.75rem; font-weight: 800; color: #fff; background: rgba(16,185,129,0.15); padding: 4px 10px; border-radius: 10px; display: inline-block; }

        /* ── Detail Drawer ── */
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 2000; display: flex; align-items: flex-end; }
        .drawer {
          background: #0d0d0d;
          width: 100%;
          max-height: 85vh;
          border-top: 1px solid #10b98144;
          border-radius: 40px 40px 0 0;
          padding: 40px 25px;
          overflow-y: auto;
          box-shadow: 0 -20px 50px rgba(0,0,0,0.8);
        }

        .store-pill { background: #111; padding: 15px; border-radius: 20px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #222; }
        .aisle-number { color: #10b981; font-weight: 800; font-size: 1.2rem; }

        /* ── Ticker ── */
        .ticker { background: #10b98110; border: 1px solid #10b98122; border-radius: 15px; padding: 10px; overflow: hidden; margin-bottom: 25px; white-space: nowrap; }
        .ticker-content { display: inline-block; animation: scroll 20s linear infinite; }
        @keyframes scroll { from { transform: translateX(100%); } to { transform: translateX(-100%); } }

        /* ── Nav ── */
        .dock { position: fixed; bottom: 25px; left: 20px; right: 20px; background: rgba(15,15,15,0.7); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.08); border-radius: 30px; display: flex; justify-content: space-around; padding: 12px; z-index: 1000; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .dock-item { background: none; border: none; color: #444; padding: 10px; cursor: pointer; transition: 0.2s; }
        .dock-item.active { color: #10b981; }
        .dock-icon { font-size: 1.5rem; display: block; margin-bottom: 4px; }
        .dock-label { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; }

        .score-ring { width: 40px; height: 40px; border-radius: 50%; border: 3px solid #222; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; border-top-color: #10b981; }
      `}</style>

      <div className="container">
        <header className="premium-header">
          <div className="glitch-logo">Flip<span>Scout</span></div>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "8px 16px", borderRadius: "100px" }}>
            <div className="status-dot"></div>
            <span style={{ fontSize: "0.7rem", fontWeight: "800", color: "#888" }}>WORCESTER • LIVE</span>
          </div>
        </header>

        {tab === "home" && (
          <div className="animate-in">
            <div className="ticker">
              <div className="ticker-content">
                {VIRAL_DATA.map(v => (
                  <span key={v.name} style={{ marginRight: "40px", fontSize: "0.8rem", fontWeight: "700" }}>
                    🔥 {v.name}: {v.velocity} SPIKE • 
                  </span>
                ))}
              </div>
            </div>

            <div className="hero-panel">
              <h2 style={{ fontSize: "1.8rem", fontWeight: "800", margin: "0 0 10px 0" }}>Retail Network</h2>
              <p style={{ color: "#555", fontSize: "0.9rem", marginBottom: "25px" }}>Scouting 42 locations in {zip}</p>
              
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <div style={{ flex: 1, background: "#000", padding: "12px", borderRadius: "15px", border: "1px solid #222", fontSize: "0.7rem" }}>
                  <div style={{ color: "#444", marginBottom: "4px", fontWeight: 800 }}>TARGET ZIP</div>
                  <div style={{ color: "#fff", fontSize: "1rem", fontWeight: 800 }}>{zip}</div>
                </div>
                <div style={{ flex: 2, background: "#000", padding: "12px", borderRadius: "15px", border: "1px solid #222", fontSize: "0.7rem" }}>
                  <div style={{ color: "#444", marginBottom: "4px", fontWeight: 800 }}>STRATEGY</div>
                  <div style={{ color: "#fff", fontSize: "1rem", fontWeight: 800 }}>Max Profit / All Categories</div>
                </div>
              </div>

              <button className="scout-btn" onClick={handleScout}>
                {loading ? "LINKING TO INVENTORY..." : "INITIATE SCAN"}
              </button>
            </div>

            <div className="leads-list">
              <h3 style={{ fontSize: "0.8rem", color: "#555", fontWeight: 900, marginBottom: "20px", letterSpacing: "2px" }}>ACTIVE OPPORTUNITIES</h3>
              {analyses.map(a => (
                <div key={a.id} className="premium-card" onClick={() => setSelectedLead(a)}>
                  <div style={{ flex: 1 }}>
                    <div className="card-title">{a.name}</div>
                    <div className="card-sub">{a.store} • {a.distance}</div>
                  </div>
                  <div className="price-badge">
                    <div className="profit-text">+{fmt(a.profit)}</div>
                    <div className="roi-text">{a.roi}% ROI</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "radar" && (
          <div className="animate-in">
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "20px" }}>Viral Velocity ⚡</h2>
            {VIRAL_DATA.map(v => (
              <div key={v.name} className="premium-card" style={{ borderLeft: "4px solid #ec4899" }}>
                <div>
                  <div style={{ color: "#ec4899", fontSize: "0.6rem", fontWeight: 900 }}>SIGNAL STRENGTH</div>
                  <div className="card-title" style={{ fontSize: "1.2rem" }}>{v.name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 900 }}>{v.velocity}</div>
                  <div className="roi-text" style={{ background: "#ec489922", color: "#ec4899" }}>{v.signal}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "social" && (
          <div className="animate-in">
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "20px" }}>Social Signal Feed</h2>
            <div className="feed" style={{ display: "grid", gap: "12px" }}>
              {/* User list from state */}
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {selectedLead && (
        <div className="drawer-overlay" onClick={() => setSelectedLead(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "30px" }}>
              <div style={{ flex: 1 }}>
                <div className="card-sub" style={{ color: "#10b981" }}>Deal Analysis • 98 Score</div>
                <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "10px 0 0 0", color: "#fff", lineHeight: 1 }}>{selectedLead.name}</h2>
              </div>
              <button onClick={() => setSelectedLead(null)} style={{ background: "#222", border: "none", color: "#fff", padding: "10px 15px", borderRadius: "15px", fontWeight: "800" }}>CLOSE</button>
            </div>

            <div className="hero-panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
               <div>
                  <div className="card-sub">Est. Net Profit</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981" }}>+{fmt(selectedLead.profit)}</div>
               </div>
               <div>
                  <div className="card-sub">Buy Cost</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800 }}>{fmt(selectedLead.price)}</div>
               </div>
            </div>

            <h3 style={{ fontSize: "0.8rem", fontWeight: 800, color: "#555", marginBottom: "15px" }}>AVAILABILITY NEAR YOU</h3>
            
            <div className="store-pill">
               <div>
                  <div style={{ fontWeight: 800 }}>{selectedLead.store} {selectedLead.address}</div>
                  <div style={{ fontSize: "0.7rem", color: "#888" }}>{selectedLead.distance} away • Worcester, MA</div>
               </div>
               <div className="aisle-number">{selectedLead.aisle}</div>
            </div>

            <button className="scout-btn" style={{ marginTop: "20px" }}>
               🚀 NAVIGATE TO STORE
            </button>
          </div>
        </div>
      )}

      {/* ── Fixed Dock ── */}
      <nav className="dock">
        {[
          { id: "home", label: "Scout", icon: "🔭" },
          { id: "radar", label: "Radar", icon: "🔥" },
          { id: "social", label: "Social", icon: "💬" },
          { id: "stats", label: "Wallet", icon: "💎" }
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`dock-item ${tab === item.id ? 'active' : ''}`}>
            <span className="dock-icon">{item.icon}</span>
            <span className="dock-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
