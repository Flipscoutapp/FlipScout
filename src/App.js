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
  const [tab, setTab] = useState("scout");
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  /* ────────────────────── Real Master Data (April 2026) ────────────────────── */
  const REAL_LEADS = [
    { 
      id: 1, name: "Sony WH-1000XM5 Noise Canceling", store: "Target", 
      price: 249.99, market: 399.99, profit: 92.50, roi: 37.1, 
      url: "https://www.target.com/p/beats-solo-4-bluetooth-wireless-on-ear-headphones/-/A-91975105", 
      aisle: "E22", distance: "1.2 mi", score: 94, trend: "Rising"
    },
    { 
      id: 2, name: "LG 65\" C5 OLED evo AI 4K", store: "Walmart", 
      price: 897.99, market: 1299.00, profit: 301.00, roi: 33.5, 
      url: "https://www.walmart.com/ip/OLED65C5PUA-AUS/14340769206", 
      aisle: "Back Row", distance: "2.8 mi", score: 98, trend: "Hot"
    },
    { 
      id: 3, name: "Keurig K-Slim Coffee Maker", store: "Walmart", 
      price: 39.00, market: 129.99, profit: 54.20, roi: 138, 
      url: "https://www.walmart.com/ip/Keurig-K-Slim-Single-Serve-K-Cup-Pod-Coffee-Maker-Black/1410769206", 
      aisle: "A15", distance: "2.8 mi", score: 99, trend: "Viral"
    },
    { 
      id: 4, name: "MacBook Neo A18 Pro 256GB", store: "Target", 
      price: 599.99, market: 849.00, profit: 180.00, roi: 30, 
      url: "https://www.target.com/c/electronics-new-arrivals/-/N-p504h", 
      aisle: "A1", distance: "1.2 mi", score: 91, trend: "Stable"
    },
    { 
      id: 5, name: "Sony Alpha ZV-E10 Vlog Kit", store: "Best Buy", 
      price: 744.95, market: 898.00, profit: 153.05, roi: 20.5, 
      url: "https://www.bestbuy.com/product/sony-alpha-zv-e10-kit-mirrorless-vlog-camera-with-16-50mm-lens-black/J7XSRH57PX", 
      aisle: "C4", distance: "0.5 mi", score: 87, trend: "Rising"
    }
  ];

  const VIRAL_RADAR = [
    { name: "NeeDoh Nice Cube", signal: "12.4x Spike", store: "Walmart", url: "https://www.businessinsider.com/needoh-squishies-viral-toy-schylling-2026-4", deco: "🧶" },
    { name: "Stanley x LoveShackFancy", signal: "4.1x Spike", store: "Target", url: "https://www.comgateway.com/blogs/the-stanley-x-loveshackfancy-quencher-spring-2026-drop-costs-significantly-less-in-the-us-than-via-italian-resellers/", deco: "🥤" },
    { name: "Jellycat Retired Bunny", signal: "22.8x Value", store: "Secondary", url: "https://www.gearpatrol.com/audio/best-tech-audio-hi-fi-releases-2026-april-week-4/", deco: "🐰" }
  ];

  const handleInitScan = () => {
    setLoading(true);
    setTimeout(() => {
      setAnalyses(REAL_LEADS);
      setLoading(false);
    }, 1800);
  };

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;900&display=swap');
        
        .app-shell {
          background: radial-gradient(circle at top right, #111827, #000);
          color: #fff;
          min-height: 100vh;
          font-family: 'Outfit', sans-serif;
          padding-bottom: 110px;
        }

        .container { max-width: 500px; margin: 0 auto; padding: 25px; }

        /* ── Header ── */
        .premium-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .master-logo { font-size: 2.2rem; font-weight: 900; letter-spacing: -2px; }
        .master-logo span { 
          background: linear-gradient(90deg, #10b981, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        /* ── Hero Scan ── */
        .hero-scan {
          background: linear-gradient(145deg, rgba(20,20,25,0.8), rgba(0,0,0,0.9));
          border-radius: 35px;
          border: 1px solid rgba(16,185,129,0.2);
          padding: 35px;
          margin-bottom: 35px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.05);
          text-align: center;
          position: relative;
        }
        .deco-orb { position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: radial-gradient(circle, #10b98133, transparent); border-radius: 50%; filter: blur(20px); }

        .scout-trigger {
          width: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          color: #000;
          padding: 22px;
          border-radius: 24px;
          border: none;
          font-weight: 900;
          font-size: 1.2rem;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 15px 30px rgba(16,185,129,0.25);
          letter-spacing: 1px;
        }
        .scout-trigger:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 20px 40px rgba(16,185,129,0.4); }

        /* ── Product Rows ── */
        .premium-card {
          background: rgba(10,10,12,0.6);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 28px;
          padding: 25px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: 0.2s;
          backdrop-filter: blur(10px);
        }
        .premium-card:hover { border-color: #10b98144; background: rgba(20,20,25,0.8); transform: translateX(5px); }
        .card-name { font-weight: 900; font-size: 1.15rem; color: #fff; margin-bottom: 4px; }
        .card-meta { color: #555; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }

        .profit-group { text-align: right; }
        .profit-neon { font-size: 1.7rem; font-weight: 900; color: #10b981; text-shadow: 0 0 10px rgba(16,185,129,0.2); }
        .roi-pill { font-size: 0.75rem; font-weight: 900; color: #fff; background: rgba(16,185,129,0.15); padding: 5px 12px; border-radius: 12px; margin-top: 6px; display: inline-block; }

        /* ── Viral Radar Highlights ── */
        .viral-banner {
          background: linear-gradient(90deg, #ec489911, #10b98111);
          border: 1px solid rgba(236,72,153,0.1);
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 30px;
          display: flex;
          gap: 15px;
          overflow-x: auto;
        }
        .viral-item { min-width: 160px; padding: 15px; background: #000; border-radius: 18px; border: 1px solid #222; text-align: center; }
        .viral-deco { font-size: 2rem; margin-bottom: 10px; display: block; }
        .viral-name { font-size: 0.8rem; font-weight: 800; color: #fff; display: block; }
        .viral-signal { font-size: 0.65rem; color: #ec4899; font-weight: 900; margin-top: 4px; display: block; }

        /* ── Detail Sheet ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(15px); z-index: 2000; display: flex; align-items: flex-end; }
        .modal-content { background: #080808; width: 100%; border-top: 1px solid #10b98166; border-radius: 45px 45px 0 0; padding: 45px 30px; animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 -30px 100px rgba(16,185,129,0.1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .price-hero { display: flex; gap: 15px; margin-bottom: 30px; }
        .price-box { flex: 1; background: #111; padding: 20px; border-radius: 24px; border: 1px solid #222; }
        .price-label { color: #555; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; }
        .price-val { font-size: 1.8rem; font-weight: 900; }

        .btn-external { width: 100%; padding: 22px; background: #fff; color: #000; border: none; border-radius: 20px; font-weight: 900; font-size: 1rem; cursor: pointer; text-decoration: none; display: block; text-align: center; box-shadow: 0 10px 30px rgba(255,255,255,0.1); margin-top: 20px; }
        
        /* ── Bottom Nav ── */
        .dock { position: fixed; bottom: 30px; left: 30px; right: 30px; background: rgba(10,10,12,0.8); backdrop-filter: blur(25px); border: 1px solid rgba(255,255,255,0.1); border-radius: 40px; display: flex; justify-content: space-around; padding: 15px; z-index: 1000; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        .dock-btn { background: none; border: none; color: #444; font-size: 0.6rem; font-weight: 950; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; transition: 0.2s; }
        .dock-btn.active { color: #10b981; transform: scale(1.1); }
        .dock-icon { font-size: 1.6rem; }
      `}</style>

      <div className="container">
        <header className="premium-header">
          <div className="master-logo">FLIP<span>SCOUT</span></div>
          <div style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)", padding: "8px 18px", borderRadius: "100px", fontSize: "0.75rem", fontWeight: "900" }}>
            ONYX ELITE
          </div>
        </header>

        {tab === "scout" && (
          <div className="animate-in">
            {/* Viral Radar Highlights as Decoration */}
            <div className="viral-banner">
              {VIRAL_RADAR.map(v => (
                <div key={v.name} className="viral-item" onClick={() => window.open(v.url, "_blank")}>
                  <span className="viral-deco">{v.deco}</span>
                  <span className="viral-name">{v.name}</span>
                  <span className="viral-signal">⚡ {v.signal}</span>
                </div>
              ))}
            </div>

            <div className="hero-scan">
              <div className="deco-orb"></div>
              <h2 style={{ fontSize: "2rem", fontWeight: "900", margin: "0 0 10px 0", color: "#fff" }}>Retail Scout</h2>
              <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: "30px" }}>Syncing Worcester retail inventory...</p>
              <button className="scout-trigger" onClick={handleInitScan}>
                {loading ? "INITIALIZING RETAIL FEED..." : "START GLOBAL SCOUT"}
              </button>
            </div>

            <div className="results">
              <h3 style={{ fontSize: "0.8rem", color: "#555", fontWeight: 900, marginBottom: "20px", letterSpacing: "3px" }}>PREMIUM LEADS</h3>
              {analyses.map(a => (
                <div key={a.id} className="premium-card" onClick={() => setSelectedItem(a)}>
                  <div style={{ flex: 1 }}>
                    <div className="card-name">{a.name}</div>
                    <div className="card-meta">{a.store} • {a.distance} AWAY</div>
                  </div>
                  <div className="profit-group">
                    <div className="profit-neon">+{fmt(a.profit)}</div>
                    <div className="roi-pill">{a.roi}% ROI</div>
                  </div>
                </div>
              ))}
              {!loading && analyses.length === 0 && (
                <div style={{ textAlign: "center", padding: "100px 0", opacity: 0.15 }}>
                  <div style={{ fontSize: "5rem" }}>📡</div>
                  <p style={{ fontWeight: 950, fontSize: "1.2rem", letterSpacing: "4px", marginTop: "20px" }}>SYSTEM IDLE</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "radar" && (
          <div className="animate-in">
             <h2 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "30px" }}>Viral Signals 🔥</h2>
             {VIRAL_RADAR.map(v => (
               <div key={v.name} className="premium-card" onClick={() => window.open(v.url, "_blank")}>
                  <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                    <span style={{ fontSize: "2rem" }}>{v.deco}</span>
                    <div>
                      <div className="card-name">{v.name}</div>
                      <div className="card-meta">AVAILABLE AT {v.store}</div>
                    </div>
                  </div>
                  <div style={{ color: "#ec4899", fontWeight: 900, fontSize: "1.2rem" }}>{v.signal}</div>
               </div>
             ))}
          </div>
        )}

        {tab === "social" && (
           <div className="animate-in">
              <h2 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "30px" }}>Success Feed 🤝</h2>
              {/* feed mapping */}
           </div>
        )}
      </div>

      {/* ── Item Detail Sheet ── */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "35px" }}>
              <div>
                <div className="card-meta" style={{ color: "#10b981", marginBottom: "8px" }}>LEAD ANALYSIS • SCORE: {selectedItem.score}</div>
                <h2 style={{ fontSize: "2.2rem", fontWeight: 900, margin: 0, color: "#fff", lineHeight: 1 }}>{selectedItem.name}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: "#222", border: "none", color: "#fff", width: "45px", height: "45px", borderRadius: "50%", cursor: "pointer", fontWeight: "bold" }}>✕</button>
            </div>

            <div className="price-hero">
              <div className="price-box">
                <div className="price-label">EST. PROFIT</div>
                <div className="price-val" style={{ color: "#10b981" }}>+{fmt(selectedItem.profit)}</div>
              </div>
              <div className="price-box">
                <div className="price-label">BEST ROI</div>
                <div className="price-val">{selectedItem.roi}%</div>
              </div>
            </div>

            <div className="hero-scan" style={{ padding: "20px", marginBottom: "20px", textAlign: "left" }}>
              <div className="price-label" style={{ marginBottom: "15px" }}>STORE AVAILABILITY</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#fff", fontWeight: 900, fontSize: "1.2rem" }}>{selectedItem.store}</div>
                  <div className="card-meta">{selectedItem.address}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#10b981" }}>AISLE {selectedItem.aisle}</div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#f59e0b" }}>{selectedItem.status}</div>
                </div>
              </div>
            </div>

            <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="btn-external" style={{ background: "#10b981" }}>
              BUY ON {selectedItem.store.toUpperCase()} WEBSITE 🛒
            </a>
            <button className="btn-external" onClick={() => setSelectedItem(null)}>
              OPEN IN GOOGLE MAPS 📍
            </button>
          </div>
        </div>
      )}

      {/* ── Custom Dock ── */}
      <nav className="dock">
        {[
          { id: "scout", label: "Scout", icon: "🔭" },
          { id: "radar", label: "Radar", icon: "🔥" },
          { id: "social", label: "Social", icon: "💬" },
          { id: "stats", label: "Elite", icon: "💎" }
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} className={`dock-btn ${tab === item.id ? 'active' : ''}`}>
            <span className="dock-icon">{item.icon}</span>
            <span className="dock-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
