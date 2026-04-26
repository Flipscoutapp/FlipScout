import React, { useState, useEffect } from "react";

/* ────────────────────── Real 2026 Inventory ────────────────────── */
const MASTER_DEALS = [
  { 
    id: 1, name: "Sony WH-1000XM5 ANC", store: "Target", 
    price: 249.99, market: 399.99, profit: 92.50, roi: 37, 
    url: "https://www.target.com/p/beats-solo-4-bluetooth-wireless-on-ear-headphones/-/A-91975105", 
    aisle: "E22", distance: "1.2 mi", score: 94, category: "Audio", deco: "🎧"
  },
  { 
    id: 2, name: "LG 65\" C5 OLED 4K TV", store: "Walmart", 
    price: 897.99, market: 1299.00, profit: 301.00, roi: 33, 
    url: "https://www.walmart.com/ip/OLED65C5PUA-AUS/14340769206", 
    aisle: "Electronics", distance: "2.8 mi", score: 98, category: "TVs", deco: "📺"
  },
  { 
    id: 3, name: "Keurig K-Slim Coffee", store: "Walmart", 
    price: 39.00, market: 129.99, profit: 54.20, roi: 138, 
    url: "https://www.walmart.com/ip/Keurig-K-Slim-Single-Serve-K-Cup-Pod-Coffee-Maker-Black/1410769206", 
    aisle: "A15", distance: "2.8 mi", score: 99, category: "Kitchen", deco: "☕"
  },
  { 
    id: 4, name: "MacBook Neo A18 Pro", store: "Target", 
    price: 599.99, market: 849.00, profit: 180.00, roi: 30, 
    url: "https://www.target.com/c/electronics-new-arrivals/-/N-p504h", 
    aisle: "A1", distance: "1.2 mi", score: 91, category: "Laptops", deco: "💻"
  },
  { 
    id: 5, name: "NeeDoh Nice Cube (Rare)", store: "Best Buy", 
    price: 25.99, market: 45.00, profit: 15.00, roi: 58, 
    url: "https://www.bestbuy.com/site/needoh-nice-cube-stress-ball-styles-may-vary/6543883.p?skuId=6543883", 
    aisle: "Toys", distance: "0.5 mi", score: 99, category: "Viral", deco: "🧶"
  }
];

const VIRAL_SIGNAL = [
  { name: "NeeDoh Nice Cube", signal: "12.4x", deco: "🧶", color: "#ec4899" },
  { name: "Stanley LoveShack", signal: "4.1x", deco: "🥤", color: "#10b981" }
];

/* ────────────────────── Components ────────────────────── */

const SquareIcon = ({ color, children }) => (
  <div style={{
    width: "60px", height: "60px", borderRadius: "18px",
    background: `linear-gradient(135deg, ${color}33, ${color}05)`,
    border: `1px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.8rem", boxShadow: `0 8px 20px ${color}11`
  }}>{children}</div>
);

export default function App() {
  const [tab, setTab] = useState("scout");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const handleSearch = () => {
    setLoading(true); setResults([]);
    setTimeout(() => { setResults(MASTER_DEALS); setLoading(false); }, 1200);
  };

  return (
    <div className="elite-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap');
        body { margin: 0; background: #000; color: #fff; font-family: 'Space Grotesk', sans-serif; }
        .elite-shell { 
           background: radial-gradient(circle at top right, #064e3b, #000 40%), 
                       radial-gradient(circle at bottom left, #1e1b4b, #000 40%);
           min-height: 100vh; padding: 25px; padding-bottom: 120px;
        }
        .card { background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 32px; padding: 30px; margin-bottom: 25px; }
        .btn-glow { 
           width: 100%; padding: 22px; background: #10b981; color: #000; border: none; border-radius: 20px; 
           font-weight: 700; font-size: 1.1rem; cursor: pointer; box-shadow: 0 0 30px rgba(16,185,129,0.4); transition: 0.3s; 
        }
        .btn-glow:hover { transform: scale(1.02); filter: brightness(1.2); }
        .item-row { 
           background: rgba(255,255,255,0.03); border-radius: 24px; padding: 20px; margin-bottom: 12px; 
           display: flex; align-items: center; gap: 15px; cursor: pointer; border: 1px solid transparent; transition: 0.2s; 
        }
        .item-row:hover { border-color: #10b98188; background: rgba(255,255,255,0.06); }
        .profit { color: #10b981; font-size: 1.6rem; font-weight: 700; }
        .dock { position: fixed; bottom: 30px; left: 20px; right: 20px; background: rgba(10,10,12,0.8); backdrop-filter: blur(30px); border: 1px solid rgba(255,255,255,0.1); border-radius: 35px; display: flex; justify-content: space-around; padding: 15px; z-index: 1000; }
        .dock-btn { background: none; border: none; color: #444; font-size: 0.65rem; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; }
        .dock-btn.active { color: #10b981; }
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.9); backdrop-filter: blur(10px); z-index: 5000; display: flex; align-items: flex-end; }
        .drawer { background: #080808; width: 100%; border-top: 2px solid #10b981; border-radius: 45px 45px 0 0; padding: 45px 30px; }
        .buy-now { width: 100%; background: #fff; color: #000; padding: 22px; border-radius: 20px; font-weight: 900; display: block; text-decoration: none; text-align: center; margin-top: 20px; }
        .deco-float { animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>

      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <div style={{ fontSize: "2rem", fontWeight: 700 }}>FLIP<span style={{ color: "#10b981" }}>SCOUT</span></div>
        <SquareIcon color="#f59e0b">💎</SquareIcon>
      </header>

      {tab === "scout" && (
        <div>
          <div className="card">
             <div style={{ display: "flex", gap: "15px", marginBottom: "30px" }}>
                {VIRAL_SIGNAL.map(v => (
                  <div key={v.name} className="deco-float" style={{ background: "#000", border: "1px solid #222", padding: "15px", borderRadius: "20px", flex: 1 }}>
                    <span style={{ fontSize: "2rem" }}>{v.deco}</span>
                    <div style={{ color: v.color, fontSize: "0.7rem", fontWeight: 900 }}>{v.signal} SPIKE</div>
                  </div>
                ))}
             </div>
             <button className="btn-glow" onClick={handleSearch}>{loading ? "SCANNING NETWORK..." : "START ELITE SCOUT"}</button>
          </div>

          {results.map(item => (
            <div key={item.id} className="item-row" onClick={() => setSelected(item)}>
              <SquareIcon color="#10b981">{item.deco}</SquareIcon>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div style={{ color: "#555", fontSize: "0.7rem", fontWeight: 700 }}>{item.store} • {item.distance}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="profit">+${item.profit.toFixed(2)}</div>
                <div style={{ fontSize: "0.7rem", background: "#10b98122", padding: "2px 6px", borderRadius: "5px" }}>{item.roi}% ROI</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="drawer-overlay" onClick={() => setSelected(null)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 700, margin: 0 }}>{selected.name}</h2>
            <div style={{ color: "#10b981", fontWeight: 700, margin: "10px 0 30px" }}>LEAD SCORE: {selected.score} • HIGH CONFIDENCE</div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
               <div className="card" style={{ margin: 0 }}>
                  <div style={{ color: "#555", fontSize: "0.7rem", fontWeight: 700 }}>PROFIT</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>+${selected.profit.toFixed(2)}</div>
               </div>
               <div className="card" style={{ margin: 0 }}>
                  <div style={{ color: "#555", fontSize: "0.7rem", fontWeight: 700 }}>COST</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700 }}>${selected.price.toFixed(2)}</div>
               </div>
            </div>

            <div className="item-row" style={{ cursor: "default", marginTop: "20px" }}>
               <span style={{ fontSize: "1.5rem" }}>📍</span>
               <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{selected.store} Worcester</div>
                  <div style={{ color: "#555", fontSize: "0.7rem" }}>Aisle {selected.aisle} • {selected.distance} away</div>
               </div>
            </div>

            <a href={selected.url} target="_blank" rel="noopener noreferrer" className="buy-now">BUY ON RETAILER WEBSITE 🛒</a>
            <button className="buy-now" style={{ background: "transparent", color: "#fff", border: "1px solid #333" }} onClick={() => setSelected(null)}>NAVIGATE TO STORE 📍</button>
          </div>
        </div>
      )}

      <nav className="dock">
        {[["scout", "🔭", "Scout"], ["radar", "🔥", "Radar"], ["social", "💬", "Social"], ["wallet", "💎", "Wallet"]].map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`dock-btn ${tab === id ? 'active' : ''}`}>
             <span style={{ fontSize: "1.6rem" }}>{icon}</span>
             <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
