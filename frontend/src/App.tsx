import React, { useState, useEffect, useCallback, useMemo } from 'react';

const ALL_CATEGORIES = [
  { id: 'all', name: 'All Categories', emoji: '🔍' },
  { id: 'abcat0502000', name: 'Laptops', emoji: '💻' },
];

const fmt = (n) => `$${n.toFixed(2)}`;
const pct = (n) => `${n.toFixed(1)}%`;

export default function App() {
  const [tab, setTab] = useState('home');
  const [zip, setZip] = useState('01602');
  const [selectedCat, setSelectedCat] = useState('all');
  const [analyses, setAnalyses] = useState([]);

  const doSearch = async () => {
    const r = await fetch(`https://laugh-poet-does-til.trycloudflare.com/api/profit-analysis?zip_code=${zip}&category_id=${selectedCat}`);
    const d = await r.json();
    if (d.analyses) setAnalyses(d.analyses);
  };

  return (
    <div className="min-h-screen bg-black text-emerald-400 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-3xl font-black">FlipScout Pro</h1>
          <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">Worcester, MA</span>
        </header>

        <div className="bg-dark-800 p-4 rounded-2xl border border-emerald-500/20 flex gap-4">
          <input value={zip} onChange={e => setZip(e.target.value)} className="bg-black border border-white/10 rounded-lg px-4 py-2 flex-1" />
          <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="bg-black border border-white/10 rounded-lg px-4 py-2 flex-1">
            {ALL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <button onClick={doSearch} className="bg-emerald-600 text-white px-8 py-2 rounded-lg font-bold">Scout</button>
        </div>

        <div className="grid gap-4">
          {analyses.map(a => (
            <div key={a.sku} className="bg-dark-800 p-6 rounded-3xl border-2 border-emerald-500/30 flex justify-between items-center">
              <div>
                <h3 className="font-black text-xl">{a.productName}</h3>
                <div className="text-4xl font-black text-emerald-400 mt-2">+{fmt(a.recommendation.bestProfit)}</div>
              </div>
              <div className="bg-emerald-500 text-white p-4 rounded-2xl text-center">
                <div className="text-2xl font-black">{pct(a.recommendation.bestROI)}</div>
                <div className="text-xs font-bold uppercase">ROI</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-white/10 p-4 flex justify-around">
        <button onClick={() => setTab('home')} className={tab === 'home' ? 'text-emerald-400' : 'text-gray-500'}>🏠 Home</button>
        <button onClick={() => setTab('leads')} className={tab === 'leads' ? 'text-emerald-400' : 'text-gray-500'}>🔥 Leads</button>
        <button onClick={() => setTab('stats')} className={tab === 'stats' ? 'text-emerald-400' : 'text-gray-500'}>📊 Stats</button>
      </nav>
    </div>
  );
}
