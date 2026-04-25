import React, { useState, useEffect } from 'react';

export default function App() {
  const [zip, setZip] = useState('01602');
  const [cat, setCat] = useState('all');
  return (
    <div className="min-h-screen bg-black text-emerald-400 p-8 flex flex-col items-center justify-center">
      <div className="w-24 h-24 bg-emerald-500 rounded-3xl shadow-lg shadow-emerald-500/40 mb-6 flex items-center justify-center text-white text-4xl font-black">F</div>
      <h1 className="text-5xl font-black tracking-tighter">FlipScout Emerald</h1>
      <p className="text-gray-500 mt-4 font-bold uppercase tracking-widest text-xs">Worcester, MA Command Center Online</p>
      
      <div className="mt-12 bg-dark-800 p-6 rounded-2xl border border-emerald-500/20 shadow-2xl text-center">
        <div className="text-emerald-400 text-3xl font-black">+ $0.00</div>
        <div className="text-[10px] text-gray-600 font-bold mt-1 tracking-widest uppercase">Live Community Profit</div>
      </div>
      
      <p className="mt-12 text-gray-400 text-sm">Scout Smarter. Flip Faster.</p>
    </div>
  );
}