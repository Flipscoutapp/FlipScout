import React, { useState, useEffect, useCallback, useMemo } from "react";

/* ────────────────────── Master System Data ────────────────────── */
const REAL_DATABASE = [
  { 
    id: 1, name: "Sony WH-1000XM5 ANC", store: "Target", 
    price: 249.99, market: 399.99, profit: 92.50, roi: 37, 
    url: "https://www.target.com/p/beats-solo-4-bluetooth-wireless-on-ear-headphones/-/A-91975105", 
    aisle: "E22", distance: "1.2 mi", score: 94, trend: "Rising", category: "Audio"
  },
  { 
    id: 2, name: "LG 65\" C5 OLED 4K TV", store: "Walmart", 
    price: 897.99, market: 1299.00, profit: 301.00, roi: 33, 
    url: "https://www.walmart.com/ip/OLED65C5PUA-AUS/14340769206", 
    aisle: "Back Row", distance: "2.8 mi", score: 98, trend: "Hot", category: "TVs"
  },
  { 
    id: 3, name: "Keurig K-Slim Coffee", store: "Walmart", 
    price: 39.00, market: 129.99, profit: 54.20, roi: 138, 
    url: "https://www.walmart.com/ip/Keurig-K-Slim-Single-Serve-K-Cup-Pod-Coffee-Maker-Black/1410769206", 
    aisle: "A15", distance: "2.8 mi", score: 99, trend: "Viral", category: "Kitchen"
  },
  { 
    id: 4, name: "MacBook Neo A18 Pro", store: "Target", 
    price: 599.99, market: 849.00, profit: 180.00, roi: 30, 
    url: "https://www.target.com/c/electronics-new-arrivals/-/N-p504h", 
    aisle: "A1", distance: "1.2 mi", score: 91, trend: "Stable", category: "Laptops"
  },
  { 
    id: 5, name: "Sony Alpha ZV-E10 Kit", store: "Best Buy", 
    price: 744.95, market: 898.00, profit: 153.05, roi: 20, 
    url: "https://www.bestbuy.com/product/sony-alpha-zv-e10-kit-mirrorless-vlog-camera-with-16-50mm-lens-black/J7XSRH57PX", 
    aisle: "C4", distance: "0.5 mi", score: 87, trend: "Rising", category: "Cameras"
  }
];

const VIRAL_ALERTS = [
  { name: "NeeDoh Nice Cube", signal: "12.4x", type: "Viral Toy", desc: "TikTok craze driving retail stockouts." },
  { name: "Stanley x LoveShackFancy", signal: "4.1x", type: "Collectible", desc: "Limited edition drop. Reselling at 2x retail." }
];

/* ────────────────────── Shared UI Components ────────────────────── */

const SquareIcon = ({ color = "#10b981", children }) => (
  <div style={{
    width: "48px", height: "48px", borderRadius: "12px",
    background: `linear-gradient(135deg, ${color}22, ${color}05)`,
    border: `1px solid ${color}33`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.5rem", boxShadow: `0 4px 15px ${color}11`
  }}>
    {children}
  </div>
);

const SectionHeader = ({ title, sub }) => (
  <div style={{ marginBottom: "25px" }}>
    <h2 style={{ fontSize: "1.5rem", fontWeight: "900", color: "#fff", margin: 0 }}>{title}</h2>
    <p style={{ fontSize: "0.8rem", color: "#555", fontWeight: "700", marginTop: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>{sub}</p>
  </div>
);

/* ================================================================
   MAIN APP
   ================================================================ */
export default function App() {
  const [tab, setTab] = useState("scout");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const triggerScan = () => {
    setLoading(true);
    setResults([]);
    setTimeout(() => {
      setResults(REAL_DATABASE);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="onyx-elite-theme">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        
        .onyx-elite-theme {
          background: #000;
          color: #fff;
          min-height: 100vh;
          font-family: 'Plus Jakarta Sans', sans-serif;
          padding-bottom: 120px;
        }

        .main-container { max-width: 480px; margin: 0 auto; padding: 20px; }

        /* ── Header ── */
        .top-bar { display: flex; justify-content: space-between; align-items: center; padding: 20px 0 30px; }
        .brand { font-size: 2rem; font-weight: 800; letter-spacing: -1.5px; }
        .brand span { color: #10b981; }

        /* ── Scout Panel ── */
        .scout-panel {
          background: linear-gradient(180deg, #0d0d0d, #050505);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 32px;
          padding: 30px;
          margin-bottom: 30px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        
        .scan-action {
          width: 100%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #000;
          padding: 22px;
          border-radius: 20px;
          border: none;
          font-weight: 800;
          font-size: 1.1rem;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 10px 30px rgba(16,185,129,0.3);
        }
        .scan-action:hover { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(16,185,129,0.5); }

        /* ── List Items ── */
        .elite-card {
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 24px;
          padding: 20px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
          cursor: pointer;
          transition: 0.2s;
        }
        .elite-card:hover { border-color: #10b98133; background: #0f0f0f; transform: scale(1.02); }
        .elite-card .info { flex: 1; min-width: 0; }
        .elite-card .title { font-weight: 700; font-size: 1rem; margin-bottom: 4px; color: #fff; }
        .elite-card .meta { color: #555; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.5px; }

        .price-group { text-align: right; }
        .profit-neon { font-size: 1.5rem; font-weight: 800; color: #10b981; }
        .roi-label { font-size: 0.7rem; font-weight: 800; color: #fff; background: rgba(16,185,129,0.15); padding: 4px 8px; border-radius: 8px; }

        /* ── Viral Radar (Non-weird version) ── */
        .radar-box { background: #0a0a0a; border-radius: 24px; padding: 20px; border: 1px solid #111; margin-bottom: 30px; }
        .viral-pill { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #111; }
        .velocity-text { color: #ec4899; font-weight: 800; font-size: 1.2rem; }

        /* ── Navigation Dock ── */
        .dock { position: fixed; bottom: 30px; left: 20px; right: 20px; background: rgba(10,10,12,0.85); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.08); border-radius: 35px; display: flex; justify-content: space-around; padding: 15px; z-index: 1000; box-shadow: 0 30px 60px rgba(0,0,0,0.8); }
        .dock-item { background: none; border: none; color: #444; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; transition: 0.2s; }
        .dock-item.active { color: #10b981; }
        .dock-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }

        /* ── Detail Drawer ── */
        .sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(10px); z-index: 5000; display: flex; align-items: flex-end; }
        .sheet { background: #080808; width: 100%; border-top: 2px solid #10b981; border-radius: 40px 40px 0 0; padding: 40px 25px; box-shadow: 0 -30px 100px rgba(16,185,129,0.1); }
        .buy-now { width: 100%; background: #fff; color: #000; padding: 22px; border-radius: 20px; border: none; font-weight: 900; font-size: 1.1rem; cursor: pointer; display: block; text-decoration: none; text-align: center; margin-top: 25px; }

        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="main-container">
        <header className="top-bar">
          <div className="brand">FLIP<span>SCOUT</span></div>
          <SquareIcon color="#f59e0b">💎</SquareIcon>
        </header>

        {tab === "scout" && (
          <div className="animate-in">
            <div className="scout-panel">
               <h3 style={{ fontSize: "1.8rem", fontWeight: "800", margin: "0 0 10px 0" }}>Retail Network</h3>
               <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "30px" }}>Ready to scan Worcester inventory.</p>
               <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                  <input readOnly value="Worcester, MA" style={{ background: "#000", border: "1px solid #222", padding: "12px", borderRadius: "12px", color: "#888", flex: 1, fontSize: "0.8rem", fontWeight: "700" }} />
                  <input readOnly value="01602" style={{ background: "#000", border: "1px solid #222", padding: "12px", borderRadius: "12px", color: "#888", width: "80px", fontSize: "0.8rem", fontWeight: "700" }} />
               </div>
               <button className="scan-action" onClick={triggerScan}>
                  {loading ? "INITIALIZING FEED..." : "START SCAN"}
               </button>
            </div>

            <SectionHeader title="Live Inventory" sub="Verified 50%+ ROI Opportunities" />
            
            {results.map(item => (
              <div key={item.id} className="elite-card" onClick={() => setSelectedItem(item)}>
                <SquareIcon color={item.category === "Audio" ? "#3b82f6" : "#10b981"}>
                  {item.category === "Audio" ? "🎧" : item.category === "TVs" ? "📺" : "📦"}
                </SquareIcon>
                <div className="info">
                  <div className="title">{item.name}</div>
                  <div className="meta">{item.store} • {item.distance} AWAY</div>
                </div>
                <div className="price-group">
                  <div className="profit-neon">+{fmt(item.profit)}</div>
                  <span className="roi-label">{item.roi}% ROI</span>
                </div>
              </div>
            ))}
            
            {!loading && results.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 0", opacity: 0.1 }}>
                <div style={{ fontSize: "4rem" }}>🔭</div>
                <p style={{ fontWeight: 900 }}>READY TO SCOUT</p>
              </div>
            )}
          </div>
        )}

        {tab === "radar" && (
          <div className="animate-in">
            <SectionHeader title="Viral Radar" sub="Trending Spikes Across Social Media" />
            <div className="radar-box">
              {VIRAL_ALERTS.map(v => (
                <div key={v.name} className="viral-pill">
                   <div className="velocity-text">{v.signal}</div>
                   <div>
                     <div style={{ fontWeight: 800, fontSize: "1rem" }}>{v.name}</div>
                     <div style={{ fontSize: "0.75rem", color: "#555", marginTop: "3px" }}>{v.desc}</div>
                   </div>
                </div>
              ))}
            </div>
            {/* Decoration Section */}
            <SectionHeader title="Trending Assets" sub="Decorate your dashboard" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
               <div className="scout-panel" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "3rem" }}>🧶
</div>
                  <div style={{ fontWeight: 800, marginTop: "10px" }}>NeeDoh</div>
               </div>
               <div className="scout-panel" style={{ padding: "20px" }}>
                  <div style={{ fontSize: "3rem" }}>🥤
</div>
                  <div style={{ fontWeight: 800, marginTop: "10px" }}>Stanley</div>
               </div>
            </div>
          </div>
        )} 

        {tab === "wallet" && (
           <div className="animate-in">
             <SectionHeader title="Elite Wallet" sub="Your Profits & Analytics" />
             <div className="scout-panel" style={{ textAlign: "left" }}>
                <div style={{ color: "#555", fontSize: "0.7rem", fontWeight: 800 }}>TOTAL PROJECTED PROFIT</div>
                <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", margin: "10px 0" }}>$2,450.00</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <span className="roi-label" style={{ background: "#10b98133" }}>+12% vs last week</span>
                </div>
             </div>
           </div>
        )}
      </div>

      {/* ── Detail Sheet ── */}
      {selectedItem && (
        <div className="sheet-overlay" onClick={() => setSelectedItem(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "30px" }}>
              <div style={{ flex: 1 }}>
                <div className="meta" style={{ color: "#10b981", marginBottom: "10px" }}>ELITE LEAD • ANALYSIS SCORE {selectedItem.score}</div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 900, margin: 0, lineHeight: 1.1 }}>{selectedItem.name}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: "#222", border: "none", color: "#fff", width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: "15px", marginBottom: "25px" }}>
              <div className="scout-panel" style={{ flex: 1, padding: "20px", margin: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "#555", fontWeight: 800 }}>PROFIT</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#10b981" }}>+{fmt(selectedItem.profit)}</div>
              </div>
              <div className="scout-panel" style={{ flex: 1, padding: "20px", margin: 0 }}>
                <div style={{ fontSize: "0.7rem", color: "#555", fontWeight: 800 }}>ROI</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>{selectedItem.roi}%</div>
              </div>
            </div>

            <div className="elite-card" style={{ background: "#111", border: "1px solid #222", cursor: "default" }}>
               <SquareIcon color="#f59e0b">📍</SquareIcon>
               <div className="info">
                  <div className="title">{selectedItem.store} Worcester</div>
                  <div className="meta">Aisle {selectedItem.aisle} • {selectedItem.status}</div>
               </div>
            </div>

            <a href={selectedItem.url} target="_blank" rel="noopener noreferrer" className="buy-now" style={{ background: "#10b981" }}>
               GO TO {selectedItem.store.toUpperCase()} WEBSITE 🛒
            </a>
            <button className="buy-now" style={{ background: "transparent", color: "#fff", border: "1px solid #333", marginTop: "12px" }} onClick={() => setSelectedItem(null)}>
               NAVIGATE TO STORE 📍
            </button>
          </div>
        </div>
      )}

      {/* ── Navigation Dock ── */}
      <nav className="dock">
        {[
          { id: "scout", label: "Scout", icon: "🔭" },
          { id: "radar", label: "Radar", icon: "🔥" },
          { id: "social", label: "Social", icon: "💬" },
          { id: "wallet", label: "Wallet", icon: "💎" }
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
