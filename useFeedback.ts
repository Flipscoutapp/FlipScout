import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  TabId, AppSettings, Store, ProfitAnalysis, ProfitSummary,
  MyFind, Performance, ListingDraft, SuccessStory, ChatMessage,
} from './types';
import { useApi } from './hooks/useApi';
import { useFeedback } from './hooks/useFeedback';
import { useOfflineQueue, loadSettings, saveSettings } from './hooks/useOffline';

/* ────────────────────── Default Settings ────────────────────── */
const ALL_CATEGORIES = [
  { id: 'all', name: 'All Categories', emoji: '🔍' },
  { id: 'abcat0502000', name: 'Laptops', emoji: '💻' },
  { id: 'abcat0101000', name: 'TVs', emoji: '📺' },
  { id: 'pcmcat209400050001', name: 'Headphones', emoji: '🎧' },
  { id: 'abcat0204000', name: 'Cameras', emoji: '📷' },
  { id: 'pcmcat241600050001', name: 'Tablets', emoji: '📱' },
  { id: 'abcat0904000', name: 'Kitchen', emoji: '🍳' },
  { id: 'pcmcat242800050021', name: 'Smartwatches', emoji: '⌚' },
  { id: 'pcmcat748302702702', name: 'Audio', emoji: '🔊' },
  { id: 'abcat0811001', name: 'Gaming', emoji: '🎮' },
  { id: 'pcmcat332000050000', name: 'Networking', emoji: '🌐' },
];

const DEFAULT_SETTINGS: AppSettings = {
  targetROI: 50, storeDiscount: 0, soundEnabled: true, hapticEnabled: true,
  enabledCategories: ALL_CATEGORIES.filter(c => c.id !== 'all').map(c => c.id),
  viralAlertsEnabled: true,
};

function getInitialSettings(): AppSettings {
  const saved = loadSettings();
  return { ...DEFAULT_SETTINGS, ...saved } as AppSettings;
}

/* ────────────────────── Formatters ────────────────────── */
const fmt = (n: number) => `$${n.toFixed(2)}`;
const pct = (n: number) => `${n.toFixed(1)}%`;
const ts = (epoch: number) => epoch ? new Date(epoch * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/* ────────────────────── Traffic Light ────────────────────── */
function trafficColor(item: ProfitAnalysis): 'green' | 'yellow' | 'red' {
  if (item.recommendation.goodBuy) return 'green';
  if (item.ipRisk.isGated || item.marketTrend.priceCrashRisk || item.hazmat?.isHazmat) return 'red';
  if (item.recommendation.bestROI >= item.recommendation.targetROI * 0.6) return 'yellow';
  return 'red';
}
const TC: Record<string, string> = {
  green: 'border-emerald-500/40 bg-emerald-500/5',
  yellow: 'border-amber-500/40 bg-amber-500/5',
  red: 'border-red-500/40 bg-red-500/5',
};
const TB: Record<string, string> = {
  green: 'bg-emerald-500 text-white',
  yellow: 'bg-amber-500 text-gray-900',
  red: 'bg-red-500 text-white',
};

/* ================================================================
   APP
   ================================================================ */
export default function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings);
  const [zip, setZip] = useState('01602');
  const [radius, setRadius] = useState(25);
  const [selectedCat, setSelectedCat] = useState('all');
  const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'name'>('roi');
  const [filterCat, setFilterCat] = useState('');
  const [fulfillMode, setFulfillMode] = useState<'fbm' | 'fba'>('fba');

  // Data
  const [stores, setStores] = useState<Store[]>([]);
  const [analyses, setAnalyses] = useState<ProfitAnalysis[]>([]);
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [leads, setLeads] = useState<ProfitAnalysis[]>([]);
  const [finds, setFinds] = useState<MyFind[]>([]);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [detail, setDetail] = useState<ProfitAnalysis | null>(null);
  const [soldModal, setSoldModal] = useState<MyFind | null>(null);
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(null);
  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [communityProfit, setCommunityProfit] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatHandle, setChatHandle] = useState(() => localStorage.getItem('flipscout_handle') || '');
  const [shareModal, setShareModal] = useState<ProfitAnalysis | null>(null);
  const [viralItems, setViralItems] = useState<ProfitAnalysis[]>([]);

  const api = useApi();
  const feedback = useFeedback(settings);
  const offline = useOfflineQueue();

  // Persist settings
  useEffect(() => { saveSettings(settings as unknown as Record<string, unknown>); }, [settings]);

  // Sync offline queue
  useEffect(() => {
    if (offline.isOnline && offline.queueSize > 0) {
      offline.flush(async (item: unknown) => {
        const d = item as Record<string, unknown>;
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/finds`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
        });
      });
    }
  }, [offline.isOnline]); // eslint-disable-line

  /* ────────── Actions ────────── */
  const doSearch = useCallback(async () => {
    const [storeRes, analysisRes] = await Promise.all([
      api.fetchStores(zip, radius),
      api.fetchProfitAnalysis(zip, radius, selectedCat, settings),
    ]);
    if (storeRes) setStores(storeRes.stores);
    if (analysisRes) {
      setAnalyses(analysisRes.analyses);
      setSummary(analysisRes as unknown as ProfitSummary);
      analysisRes.analyses.forEach(a => {
        if (a.recommendation.goodBuy) feedback.triggerGoodBuy();
        else feedback.triggerBadBuy();
      });
    }
  }, [zip, radius, selectedCat, settings, api, feedback]);

  const doLeads = useCallback(async () => {
    const d = await api.fetchLeads(zip, settings, 12);
    if (d) {
      setLeads(d.leads);
      d.leads.forEach(l => { if (l.recommendation.goodBuy) feedback.triggerGoodBuy(); });
    }
  }, [zip, settings, api, feedback]);

  const doLoadViral = useCallback(async () => {
    if (!settings.viralAlertsEnabled) return;
    const d = await api.fetchViral(zip, settings, 5);
    if (d) setViralItems(d.items);
  }, [zip, settings, api]);

  const doLoadFinds = useCallback(async () => {
    const d = await api.fetchFinds();
    if (d) setFinds(d.finds);
  }, [api]);

  const doLoadPerf = useCallback(async () => {
    const d = await api.fetchPerformance();
    if (d) setPerf(d);
  }, [api]);

  const doLoadStories = useCallback(async () => {
    const d = await api.fetchStories();
    if (d) { setStories(d.stories); setCommunityProfit(d.totalCommunityProfit); }
  }, [api]);

  const doLoadChat = useCallback(async () => {
    const d = await api.fetchChatHistory();
    if (d) setChatMessages(d.messages);
  }, [api]);

  const doSendChat = useCallback(async (message: string, msgType = 'text', productData = '') => {
    if (!message.trim()) return;
    const handle = chatHandle || 'Anonymous';
    const d = await api.sendChatMessage({ user_handle: handle, message, msg_type: msgType, product_data: productData });
    if (d) setChatMessages(prev => [...prev, d]);
  }, [api, chatHandle]);

  const doShareToChat = useCallback(async (item: ProfitAnalysis) => {
    const msg = `🔥 Check out this flip! ${item.productName} — Buy: $${item.cogs.toFixed(2)} → Sell: $${item.amazonSellPrice.toFixed(2)} = +$${item.recommendation.bestProfit.toFixed(2)} profit (${item.recommendation.bestROI.toFixed(1)}% ROI)`;
    await doSendChat(msg, 'product_share', JSON.stringify({ name: item.productName, profit: item.recommendation.bestProfit, roi: item.recommendation.bestROI }));
    setShareModal(null);
  }, [doSendChat]);

  const doPostStory = useCallback(async (find: MyFind) => {
    const profit = (find.sold_price || 0) - find.cogs;
    await api.postStory({
      user_handle: chatHandle || 'Anonymous',
      product_name: find.product_name, profit_amount: profit,
      store_name: '', sold_platform: find.sold_platform || 'Unknown',
      category: find.category_id || '', emoji: '🎉',
    });
    doLoadStories();
  }, [api, chatHandle, doLoadStories]);

  // Save handle to localStorage
  useEffect(() => { if (chatHandle) localStorage.setItem('flipscout_handle', chatHandle); }, [chatHandle]);

  const doSaveFind = useCallback(async (a: ProfitAnalysis) => {
    const payload = {
      sku: a.sku, product_name: a.productName, category_id: '', aisle: a.aisle || '',
      store_buy_price: a.storeBuyPrice, cogs: a.cogs, amazon_sell_price: a.amazonSellPrice,
      best_roi: a.recommendation.bestROI, best_method: a.recommendation.bestMethod,
      good_buy: a.recommendation.goodBuy, zip_code: zip, notes: '',
      analysis_json: JSON.stringify(a),
    };
    if (offline.isOnline) {
      await api.saveFind(payload);
    } else {
      offline.enqueue(payload);
    }
    setDetail(null);
  }, [api, zip, offline]);

  const doMarkSold = useCallback(async (id: number, price: number, platform: string) => {
    await api.markSold(id, price, platform);
    setSoldModal(null);
    doLoadFinds();
    doLoadPerf();
  }, [api, doLoadFinds, doLoadPerf]);

  const doDraft = useCallback(async (a: ProfitAnalysis) => {
    const d = await api.fetchListingDraft(a.productName, '', a.storeBuyPrice, a.amazonSellPrice);
    if (d) setListingDraft(d);
  }, [api]);

  // Load on tab switch
  useEffect(() => {
    if (tab === 'leads') { doLeads(); doLoadViral(); }
    if (tab === 'finds') doLoadFinds();
    if (tab === 'analytics') { doLoadPerf(); doLoadFinds(); }
    if (tab === 'community') { doLoadStories(); doLoadChat(); }
  }, [tab]); // eslint-disable-line

  /* ────────── Sorted & filtered analyses ────────── */
  const sortedAnalyses = useMemo(() => {
    let arr = [...analyses];
    if (filterCat) arr = arr.filter(a => a.categoryName === filterCat || a.productName.toLowerCase().includes(filterCat.toLowerCase()));
    arr.sort((a, b) => {
      if (sortBy === 'roi') return b.recommendation.bestROI - a.recommendation.bestROI;
      if (sortBy === 'profit') return b.recommendation.bestProfit - a.recommendation.bestProfit;
      return a.productName.localeCompare(b.productName);
    });
    return arr;
  }, [analyses, sortBy, filterCat]);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col pb-safe">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-dark-800/90 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-lg font-bold">F</div>
          <h1 className="text-xl font-extrabold gradient-text">FlipScout</h1>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Pro</span>
        </div>
        <div className="flex items-center gap-2">
          {!offline.isOnline && (
            <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">OFFLINE ({offline.queueSize})</span>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 overflow-auto">
        {tab === 'home' && <HomeTab
          zip={zip} setZip={setZip} radius={radius} setRadius={setRadius}
          selectedCat={selectedCat} setSelectedCat={setSelectedCat}
          sortBy={sortBy} setSortBy={setSortBy} filterCat={filterCat} setFilterCat={setFilterCat}
          fulfillMode={fulfillMode} setFulfillMode={setFulfillMode}
          analyses={sortedAnalyses} stores={stores} summary={summary}
          loading={api.loading} error={api.error}
          onSearch={doSearch} onDetail={setDetail} settings={settings}
        />}
        {tab === 'leads' && <LeadsTab leads={leads} viralItems={viralItems} loading={api.loading} onRefresh={() => { doLeads(); doLoadViral(); }} onDetail={setDetail} settings={settings} setSettings={setSettings} />}
        {tab === 'finds' && <FindsTab finds={finds} onSold={setSoldModal} onDelete={async (id) => { await api.deleteFind(id); doLoadFinds(); }} />}
        {tab === 'analytics' && <AnalyticsTab perf={perf} loading={api.loading} onExport={api.exportTaxCsv} />}
        {tab === 'community' && <CommunityTab stories={stories} communityProfit={communityProfit}
          chatMessages={chatMessages} chatHandle={chatHandle} setChatHandle={setChatHandle}
          onSendChat={doSendChat} onRefreshStories={doLoadStories} onRefreshChat={doLoadChat}
          loading={api.loading} finds={finds} onPostStory={doPostStory} />}
        {tab === 'settings' && <SettingsTab settings={settings} setSettings={setSettings} feedback={feedback} />}
      </main>

      {/* ── Detail Drawer ── */}
      {detail && <DetailDrawer item={detail} mode={fulfillMode} onClose={() => { setDetail(null); setListingDraft(null); }}
        onSave={() => doSaveFind(detail)} onDraft={() => doDraft(detail)} draft={listingDraft} onShare={() => { setShareModal(detail); setDetail(null); }} />}

      {/* ── Sold Modal ── */}
      {soldModal && <SoldModal find={soldModal} onClose={() => setSoldModal(null)} onConfirm={doMarkSold} />}

      {/* ── Share to Chat Modal ── */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShareModal(null)}>
          <div className="bg-dark-700 rounded-2xl p-6 w-full max-w-sm glass-border animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-lg">📤 Share to Chat</h3>
            <div className="bg-dark-600 rounded-xl p-3">
              <p className="text-sm font-semibold">{shareModal.productName}</p>
              <p className="text-xs text-emerald-400 mt-1">+{fmt(shareModal.recommendation.bestProfit)} profit ({pct(shareModal.recommendation.bestROI)} ROI)</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShareModal(null)} className="flex-1 bg-dark-600 text-gray-300 font-bold py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={() => doShareToChat(shareModal)} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm hover:-translate-y-0.5 transition-all">Share 🚀</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-dark-800/95 backdrop-blur-xl border-t border-white/[0.06] z-50 safe-pb">
        <div className="max-w-lg mx-auto flex">
          {([
            ['home', '🏠', 'Home'],
            ['leads', '🔥', 'Leads'],
            ['finds', '📦', 'Finds'],
            ['community', '💬', 'Social'],
            ['analytics', '📊', 'Stats'],
            ['settings', '⚙️', 'More'],
          ] as [TabId, string, string][]).map(([id, icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-all duration-200
                ${tab === id ? 'text-emerald-400 scale-105' : 'text-gray-500 hover:text-gray-300'}`}>
              <span className="text-lg">{icon}</span>
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ================================================================
   HOME TAB
   ================================================================ */
function HomeTab({ zip, setZip, radius, setRadius, selectedCat, setSelectedCat,
  sortBy, setSortBy, filterCat, setFilterCat, fulfillMode, setFulfillMode,
  analyses, stores, summary, loading, error, onSearch, onDetail, settings,
}: any) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Bar */}
      <div className="bg-dark-700 rounded-2xl p-4 glass-border space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">ZIP Code</label>
            <input value={zip} onChange={e => setZip(e.target.value)} maxLength={5}
              className="w-full bg-dark-600 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition" />
          </div>
          <div className="min-w-[100px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Radius (mi)</label>
            <select value={radius} onChange={e => setRadius(Number(e.target.value))}
              className="w-full bg-dark-600 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500/50 transition">
              {[5, 10, 25, 50, 100].map(r => <option key={r} value={r}>{r} mi</option>)}
            </select>
          </div>
          <div className="min-w-[150px] flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Category</label>
            <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
              className="w-full bg-dark-600 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-500/50 transition">
              {ALL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
          <button onClick={onSearch} disabled={loading || zip.length !== 5}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/25 disabled:opacity-40 disabled:hover:translate-y-0">
            {loading ? '⏳ Scanning...' : '🔍 Scout'}
          </button>
        </div>
        {settings.storeDiscount > 0 && (
          <div className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg">
            💳 {settings.storeDiscount}% store discount applied (e.g. RedCard)
          </div>
        )}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon="📦" label="Analyzed" value={summary.totalAnalyzed} />
          <StatCard icon="✅" label="Good Buys" value={summary.goodBuys} color="text-emerald-400" />
          <StatCard icon="🛡️" label="Gated" value={summary.gatedCount} color="text-red-400" />
          <StatCard icon="📉" label="Crash Risk" value={summary.crashRiskCount} color="text-amber-400" />
          <StatCard icon="☢️" label="Hazmat" value={summary.hazmatCount} color="text-orange-400" />
          <StatCard icon="🏷️" label={`Tax ${summary.salesTaxState}`} value={pct(summary.salesTaxRate * 100)} color="text-blue-400" />
          {summary.viralCount > 0 && <StatCard icon="🚀" label="Viral" value={summary.viralCount} color="text-pink-400" />}
        </div>
      )}

      {/* Stores */}
      {stores.length > 0 && (
        <div className="bg-dark-700 rounded-2xl p-4 glass-border">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">🏪 {stores.length} Stores Found</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {stores.map((s: Store) => (
              <div key={s.storeId} className="min-w-[200px] bg-dark-600 rounded-xl p-3 glass-border flex-shrink-0">
                <div className="font-semibold text-sm truncate">{s.name}</div>
                <div className="text-xs text-gray-400 mt-1">{s.address}, {s.city}</div>
                <div className="text-xs text-emerald-400 font-bold mt-1">📍 {s.distance?.toFixed(1)} mi</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter / Sort / Toggle row */}
      {analyses.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {/* FBM/FBA Toggle */}
          <div className="bg-dark-700 rounded-xl p-1 flex glass-border">
            <button onClick={() => setFulfillMode('fbm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${fulfillMode === 'fbm' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
              📦 Ship Yourself
            </button>
            <button onClick={() => setFulfillMode('fba')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${fulfillMode === 'fba' ? 'bg-teal-600 text-white' : 'text-gray-400'}`}>
              🚀 Send to Amazon
            </button>
          </div>
          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-dark-700 border border-white/[0.06] rounded-xl px-3 py-2 text-xs font-bold outline-none">
            <option value="roi">Sort: ROI %</option>
            <option value="profit">Sort: Net Profit</option>
            <option value="name">Sort: Name</option>
          </select>
          {/* Filter */}
          <input value={filterCat} onChange={e => setFilterCat(e.target.value)} placeholder="🔎 Filter products..."
            className="bg-dark-700 border border-white/[0.06] rounded-xl px-3 py-2 text-xs outline-none flex-1 min-w-[120px]" />
        </div>
      )}

      {/* Product Cards */}
      {analyses.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analyses.map((a: ProfitAnalysis) => (
            <ProductCard key={a.sku} item={a} mode={fulfillMode} onClick={() => onDetail(a)} />
          ))}
        </div>
      ) : !loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-gray-300 mb-2">Ready to Scout</h3>
          <p className="text-sm">Enter a ZIP code and category to find profitable flips nearby.</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   PRODUCT CARD
   ================================================================ */
function ProductCard({ item, mode, onClick }: { item: ProfitAnalysis; mode: 'fbm' | 'fba'; onClick: () => void }) {
  const c = trafficColor(item);
  const data = mode === 'fba' ? item.fba : item.fbm;
  const reason = item.recommendation.primaryRejectionReason;

  return (
    <div onClick={onClick}
      className={`card-lift cursor-pointer rounded-3xl border-2 ${TC[c]} p-6 space-y-4 animate-slide-up bg-dark-800/80 backdrop-blur-md shadow-2xl`}>
      <div className="flex flex-col gap-1">
        <h4 className="font-black text-lg leading-tight text-white line-clamp-1">{item.productName}</h4>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-tighter">Aisle {item.aisle || 'N/A'}</span>
           {item.viral?.isViral && <span className="text-[10px] font-black text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded animate-pulse">🔥 VIRAL</span>}
        </div>
      </div>

      <div className="flex items-end justify-between py-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Net Profit</span>
          <span className="text-4xl font-black text-emerald-400">+{fmt(data.profit)}</span>
        </div>
        <div className="bg-emerald-500 text-white rounded-2xl px-4 py-3 text-center shadow-lg shadow-emerald-500/30">
          <div className="text-xl font-black leading-none">{pct(data.roi)}</div>
          <div className="text-[10px] font-bold uppercase mt-1 opacity-80">ROI</div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center">
        <div className={`text-[11px] font-black px-4 py-2 rounded-full shadow-inner ${item.recommendation.goodBuy ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white uppercase'}`}>
          {item.recommendation.goodBuy ? '✅ BUY IT' : `❌ NO: ${reason || 'RISK'}`}
        </div>
      </div>
    </div>
  );
}

function ProfitStep({ label, value, color = 'text-gray-300', bold = false }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-xs ${bold ? 'font-bold' : 'font-medium'} ${color}`}>
      <span className={bold ? '' : 'text-gray-500'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MarketBadge({ trend }: { trend: ProfitAnalysis['marketTrend'] }) {
  const bg = trend.priceCrashRisk ? 'bg-red-500/20 text-red-400' : trend.sellerDeltaPct > 10 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${bg}`}>{trend.trendLabel}</span>;
}

function StatCard({ icon, label, value, color = 'text-white' }: { icon: string; label: string; value: any; color?: string }) {
  return (
    <div className="bg-dark-700 rounded-xl p-3 glass-border">
      <div className="text-lg">{icon}</div>
      <div className={`text-xl font-extrabold ${color} mt-1`}>{value}</div>
      <div className="text-[10px] text-gray-500 font-bold uppercase">{label}</div>
    </div>
  );
}

/* ================================================================
   LEADS TAB
   ================================================================ */
function LeadsTab({ leads, viralItems, loading, onRefresh, onDetail, settings, setSettings }: any) {
  const [showCatSettings, setShowCatSettings] = useState(false);

  const toggleCat = (catId: string) => {
    setSettings((s: AppSettings) => {
      const arr = s.enabledCategories.includes(catId)
        ? s.enabledCategories.filter((c: string) => c !== catId)
        : [...s.enabledCategories, catId];
      return { ...s, enabledCategories: arr };
    });
  };

  // Auto-refresh when category toggles change
  useEffect(() => { onRefresh(); }, [settings.enabledCategories]); // eslint-disable-line

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">🔥 Live Leads</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowCatSettings(!showCatSettings)}
            className="bg-dark-700 text-xs font-bold px-3 py-2 rounded-xl glass-border hover:border-emerald-500/30 transition">
            🎯 Filters {settings.enabledCategories.length < ALL_CATEGORIES.length && `(${settings.enabledCategories.length})`}
          </button>
          <button onClick={onRefresh} disabled={loading}
            className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-40">
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Category Toggle Panel */}
      {showCatSettings && (
        <div className="bg-dark-700 rounded-2xl p-4 glass-border animate-slide-up">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Search Categories</h3>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(c => {
              const on = settings.enabledCategories.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggleCat(c.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200
                    ${on ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-dark-600 text-gray-500 glass-border hover:text-gray-300'}`}>
                  {c.emoji} {c.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setSettings((s: AppSettings) => ({ ...s, enabledCategories: ALL_CATEGORIES.filter(c => c.id !== 'all').map(c => c.id) }))}
              className="text-[10px] font-bold text-emerald-400 hover:underline">Select All</button>
            <button onClick={() => setSettings((s: AppSettings) => ({ ...s, enabledCategories: [] }))}
              className="text-[10px] font-bold text-gray-500 hover:underline">Clear All</button>
          </div>
        </div>
      )}

      {/* 🚀 Trending Now — Viral Items */}
      {viralItems && viralItems.length > 0 && settings.viralAlertsEnabled && (
        <div className="bg-gradient-to-r from-pink-600/10 to-emerald-600/10 border border-teal-500/20 rounded-2xl p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-pink-400">🚀 Trending Now — Viral Radar</h3>
            <span className="text-[10px] font-bold bg-teal-500/20 text-pink-400 px-2 py-0.5 rounded-full animate-pulse">{viralItems.length} VIRAL</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {viralItems.map((v: ProfitAnalysis, i: number) => (
              <div key={`viral-${v.sku}-${i}`} onClick={() => onDetail(v)}
                className="min-w-[220px] bg-dark-700 rounded-xl p-3 glass-border cursor-pointer card-lift flex-shrink-0 border border-teal-500/20">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px] font-extrabold bg-teal-500/20 text-pink-400 px-2 py-0.5 rounded-md animate-pulse">🚀 VIRAL</span>
                  {v.viral?.hasSocialSignal && (
                    <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md">
                      {v.viral.socialPlatforms.map((p: string) => p === 'tiktok' ? '📱 TikTok' : '📷 IG').join(' ')}
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-xs truncate">{v.productName}</h4>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-emerald-400 font-bold">+{fmt(v.recommendation.bestProfit)}</span>
                  <span className="text-xs font-black text-pink-400">{pct(v.recommendation.bestROI)} ROI</span>
                </div>
                {v.viral?.lowStock && (
                  <span className="text-[9px] font-bold text-amber-400 mt-1 block">⚡ Low stock — ~{v.viral.stockEstimate} left</span>
                )}
                <span className="text-[9px] text-gray-500 mt-0.5 block">{v.viral?.velocityMultiplier}x velocity spike</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Cards */}
      {leads.length > 0 ? (
        <div className="space-y-3">
          {leads.map((l: ProfitAnalysis, i: number) => {
            const ds = l.dealScore;
            const isHot = ds && (ds.label.includes('Undisputed') || ds.label.includes('Strong'));
            return (
              <div key={`${l.sku}-${i}`} onClick={() => onDetail(l)}
                className={`card-lift cursor-pointer rounded-2xl p-4 glass-border animate-slide-up
                  ${isHot ? 'border-2 border-emerald-500/40 bg-emerald-500/5' : 'bg-dark-700'}
                  ${isHot ? 'animate-pulse-glow' : ''}`}
                style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ds && <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md
                        ${ds.color === 'green' ? 'bg-emerald-500/20 text-emerald-400' : ds.color === 'yellow' ? 'bg-amber-500/20 text-amber-400' : ds.color === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {ds.label}
                      </span>}
                      {l.categoryName && <span className="text-[10px] text-gray-500 font-bold">{l.categoryName}</span>}
                      {l.clearancePct && <span className="text-[10px] font-bold text-pink-400 bg-teal-500/10 px-2 py-0.5 rounded-md">{l.clearancePct.toFixed(0)}% OFF</span>}
                    </div>
                    <h4 className="font-bold text-sm truncate">{l.productName}</h4>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-gray-400">Buy: <b className="text-white">{fmt(l.cogs)}</b></span>
                      <span className="text-gray-500">→</span>
                      <span className="text-gray-400">Sell: <b className="text-white">{fmt(l.amazonSellPrice)}</b></span>
                      <span className={`font-bold ${l.recommendation.bestProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {l.recommendation.bestProfit >= 0 ? '+' : ''}{fmt(l.recommendation.bestProfit)}
                      </span>
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {l.ipRisk.isGated && <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md">🛡️ GATED</span>}
                      {l.amazonListing?.amazonIsSeller && <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md">AMZ ON LISTING</span>}
                      {l.viral?.isViral && <span className="text-[10px] font-extrabold bg-teal-500/20 text-pink-400 px-2 py-0.5 rounded-md animate-pulse">🚀 VIRAL</span>}
                      <MarketBadge trend={l.marketTrend} />
                    </div>
                  </div>
                  <div className={`${l.recommendation.goodBuy ? 'bg-emerald-500' : l.recommendation.bestROI > 30 ? 'bg-amber-500' : 'bg-red-500'} text-white rounded-xl px-3 py-2 text-center min-w-[65px]`}>
                    <div className="text-lg font-black leading-none">{pct(l.recommendation.bestROI)}</div>
                    <div className="text-[9px] font-bold uppercase mt-0.5 opacity-80">ROI</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">🔥</div>
          <h3 className="text-lg font-bold text-gray-300 mb-2">Lead Hunter Ready</h3>
          <p className="text-sm">Tap Refresh to scan for hot deals in your area.</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   FINDS TAB
   ================================================================ */
function FindsTab({ finds, onSold, onDelete }: { finds: MyFind[]; onSold: (f: MyFind) => void; onDelete: (id: number) => void }) {
  const [filter, setFilter] = useState<'all' | 'scouted' | 'sold'>('all');
  const filtered = filter === 'all' ? finds : finds.filter(f => f.status === filter);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">📦 My Finds ({finds.length})</h2>
        <div className="bg-dark-700 rounded-xl p-1 flex glass-border">
          {(['all', 'scouted', 'sold'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize
                ${filter === f ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>{f}</button>
          ))}
        </div>
      </div>
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(f => (
            <div key={f.id} className="bg-dark-700 rounded-xl p-4 glass-border card-lift flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${f.status === 'sold' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{f.status.toUpperCase()}</span>
                  {f.good_buy && <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">✅ GOOD BUY</span>}
                </div>
                <h4 className="font-bold text-sm truncate">{f.product_name}</h4>
                <div className="text-xs text-gray-400 mt-1 flex gap-3">
                  <span>COGS: {fmt(f.cogs)}</span>
                  {f.sold_price && <span className="text-emerald-400">Sold: {fmt(f.sold_price)}</span>}
                  {f.sold_platform && <span>on {f.sold_platform}</span>}
                  <span>{ts(f.scanned_at)}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {f.status === 'scouted' && (
                  <button onClick={() => onSold(f)}
                    className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-2 rounded-lg hover:-translate-y-0.5 transition-all">💰 Mark Sold</button>
                )}
                <button onClick={() => onDelete(f.id)}
                  className="bg-dark-600 text-gray-400 text-[11px] font-bold px-3 py-2 rounded-lg hover:text-red-400 transition-all">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-bold text-gray-300 mb-2">No Finds Yet</h3>
          <p className="text-sm">Save items from the Home or Leads tab to track them here.</p>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SOLD MODAL
   ================================================================ */
function SoldModal({ find, onClose, onConfirm }: { find: MyFind; onClose: () => void; onConfirm: (id: number, price: number, platform: string) => void }) {
  const [price, setPrice] = useState(find.amazon_sell_price?.toString() || '');
  const [platform, setPlatform] = useState('Amazon');
  return (
    <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-dark-700 rounded-2xl p-6 w-full max-w-sm glass-border animate-slide-up space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-extrabold text-lg">💰 Mark as Sold</h3>
        <p className="text-sm text-gray-400 truncate">{find.product_name}</p>
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Sold Price ($)</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} step="0.01"
            className="w-full bg-dark-600 border border-white/[0.08] rounded-lg px-3 py-2.5 text-lg font-bold outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-gray-500 mb-1 block">Platform</label>
          <div className="flex gap-2 flex-wrap">
            {['Amazon', 'eBay', 'Mercari', 'Local', 'Other'].map(p => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${platform === p ? 'bg-emerald-600 text-white' : 'bg-dark-600 text-gray-400 glass-border'}`}>{p}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-dark-600 text-gray-300 font-bold py-3 rounded-xl text-sm">Cancel</button>
          <button onClick={() => onConfirm(find.id, parseFloat(price) || 0, platform)} disabled={!price}
            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 hover:-translate-y-0.5 transition-all">Confirm Sale</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ANALYTICS TAB
   ================================================================ */
function AnalyticsTab({ perf, loading, onExport }: { perf: Performance | null; loading: boolean; onExport: () => void }) {
  if (!perf) return <div className="text-center py-16 text-gray-500"><div className="text-5xl mb-4">📊</div><h3 className="text-lg font-bold text-gray-300">Loading analytics...</h3></div>;
  const platforms = Object.entries(perf.byPlatform);
  const maxProfit = Math.max(...platforms.map(([, v]) => v.profit), 1);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">📊 Performance</h2>
        <button onClick={onExport}
          className="bg-dark-700 text-xs font-bold px-4 py-2 rounded-xl glass-border hover:border-emerald-500/30 transition">📥 Export CSV</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="💰" label="Total Profit" value={fmt(perf.totalProfit)} color={perf.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard icon="📈" label="Avg ROI" value={pct(perf.avgROI)} color="text-emerald-400" />
        <StatCard icon="📦" label="Items Sold" value={perf.soldCount} color="text-blue-400" />
        <StatCard icon="⏱️" label="Avg Flip Time" value={`${perf.avgFlipTimeHours}h`} color="text-amber-400" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon="🔍" label="Total Scouted" value={perf.scoutedCount} />
        <StatCard icon="💵" label="Revenue" value={fmt(perf.totalRevenue)} color="text-emerald-400" />
        <StatCard icon="🧾" label="Total COGS" value={fmt(perf.totalCOGS)} color="text-red-400" />
      </div>
      {/* Sales by Platform */}
      {platforms.length > 0 && (
        <div className="bg-dark-700 rounded-2xl p-4 glass-border">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Sales by Platform</h3>
          <div className="space-y-3">
            {platforms.map(([name, data]) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-bold">{name}</span>
                  <span className="text-emerald-400 font-bold">{fmt(data.profit)} ({data.count} sales)</span>
                </div>
                <div className="h-3 bg-dark-600 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(4, (data.profit / maxProfit) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SETTINGS TAB
   ================================================================ */
function SettingsTab({ settings, setSettings, feedback }: { settings: AppSettings; setSettings: (fn: any) => void; feedback: any }) {
  const upd = (k: keyof AppSettings, v: any) => setSettings((s: AppSettings) => ({ ...s, [k]: v }));
  return (
    <div className="space-y-4 animate-fade-in max-w-lg">
      <h2 className="text-lg font-extrabold">⚙️ Settings</h2>

      {/* Profit Target */}
      <div className="bg-dark-700 rounded-2xl p-4 glass-border space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">🎯 Profit Target</h3>
        <div className="flex items-center gap-4">
          <input type="range" min={10} max={200} step={5} value={settings.targetROI}
            onChange={e => upd('targetROI', Number(e.target.value))}
            className="flex-1 accent-emerald-500 h-2" />
          <span className="text-2xl font-black text-emerald-400 min-w-[80px] text-right">{settings.targetROI}%</span>
        </div>
        <p className="text-xs text-gray-500">Items need at least {settings.targetROI}% ROI to be marked as a Good Buy.</p>
      </div>

      {/* Store Discount */}
      <div className="bg-dark-700 rounded-2xl p-4 glass-border space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">💳 Store Discount</h3>
        <div className="flex items-center gap-4">
          <input type="range" min={0} max={30} step={1} value={settings.storeDiscount}
            onChange={e => upd('storeDiscount', Number(e.target.value))}
            className="flex-1 accent-amber-500 h-2" />
          <span className="text-2xl font-black text-amber-400 min-w-[60px] text-right">{settings.storeDiscount}%</span>
        </div>
        <p className="text-xs text-gray-500">e.g. Target RedCard 5%, Best Buy card 10%. Applied to all calculations.</p>
      </div>

      {/* Audio & Haptic */}
      <div className="bg-dark-700 rounded-2xl p-4 glass-border space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">🔔 Feedback</h3>
        <ToggleRow label="🔊 Sound Effects" sublabel="Cha-ching on Good Buy detection" value={settings.soundEnabled} onChange={v => upd('soundEnabled', v)} />
        <ToggleRow label="📳 Haptic Vibration" sublabel="Long buzz = YES, double tap = NO" value={settings.hapticEnabled} onChange={v => upd('hapticEnabled', v)} />
        <ToggleRow label="🚀 Viral Alerts" sublabel="Show trending/velocity spike items" value={settings.viralAlertsEnabled} onChange={v => upd('viralAlertsEnabled', v)} />
        <button onClick={() => { feedback.triggerGoodBuy(); }}
          className="w-full bg-emerald-600/20 text-emerald-400 font-bold py-3 rounded-xl text-sm border border-emerald-500/30 hover:-translate-y-0.5 transition-all mt-2">
          🔔 Test "Good Buy" Alert
        </button>
        <button onClick={() => { feedback.triggerBadBuy(); }}
          className="w-full bg-red-500/20 text-red-400 font-bold py-3 rounded-xl text-sm border border-red-500/30 hover:-translate-y-0.5 transition-all">
          ❌ Test "No Buy" Alert
        </button>
      </div>

      {/* Notification Demo */}
      <div className="bg-dark-700 rounded-2xl p-4 glass-border space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">🚨 Notification Preview</h3>
        <NotificationDemo />
      </div>

      {/* Subscription Tiers */}
      <SubscriptionTiers />

      {/* Viral Sighting Demo */}
      <div className="bg-dark-700 rounded-2xl p-4 glass-border space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">🚀 Viral Alert Preview</h3>
        <ViralAlertDemo />
      </div>

      <div className="text-center text-xs text-gray-600 py-4">FlipScout Pro v5.0 • Built for Resellers</div>
    </div>
  );
}

/* ================================================================
   SUBSCRIPTION TIERS
   ================================================================ */
function SubscriptionTiers() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const tiers = [
    {
      id: 'starter',
      name: 'Starter',
      promo: '$1',
      promoLabel: 'First Month',
      price: '$14.99',
      period: '/mo',
      color: 'from-teal-600 to-cyan-600',
      borderColor: 'border-blue-500/40',
      badge: null,
      features: [
        { name: 'Profit Calculator', included: true },
        { name: 'Store Finder (25mi)', included: true },
        { name: 'FBM / FBA Analysis', included: true },
        { name: 'Sales Tax Calculator', included: true },
        { name: '5 Scans / Day', included: true },
        { name: 'Lead Hunter', included: false },
        { name: 'AI Listing Drafts', included: false },
        { name: 'Scout Alerts', included: false },
        { name: 'Route Optimizer', included: false },
        { name: 'Tax Export (CSV)', included: false },
        { name: 'Priority Support', included: false },
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      promo: '$1',
      promoLabel: 'First Month',
      price: '$29.99',
      period: '/mo',
      color: 'from-emerald-600 to-teal-600',
      borderColor: 'border-emerald-500/40',
      badge: '⭐ MOST POPULAR',
      features: [
        { name: 'Profit Calculator', included: true },
        { name: 'Store Finder (100mi)', included: true },
        { name: 'FBM / FBA Analysis', included: true },
        { name: 'Sales Tax Calculator', included: true },
        { name: 'Unlimited Scans', included: true },
        { name: 'Lead Hunter', included: true },
        { name: 'AI Listing Drafts', included: true },
        { name: 'Scout Alerts', included: true },
        { name: 'Route Optimizer', included: false },
        { name: 'Tax Export (CSV)', included: true },
        { name: 'Priority Support', included: false },
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      promo: null,
      promoLabel: null,
      price: '$59.99',
      period: '/mo',
      color: 'from-amber-500 to-orange-600',
      borderColor: 'border-amber-500/40',
      badge: '👑 FULL ACCESS',
      features: [
        { name: 'Profit Calculator', included: true },
        { name: 'Store Finder (250mi)', included: true },
        { name: 'FBM / FBA Analysis', included: true },
        { name: 'Sales Tax Calculator', included: true },
        { name: 'Unlimited Scans', included: true },
        { name: 'Lead Hunter', included: true },
        { name: 'AI Listing Drafts', included: true },
        { name: 'Scout Alerts', included: true },
        { name: 'Route Optimizer', included: true },
        { name: 'Tax Export (CSV)', included: true },
        { name: 'Priority Support', included: true },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Launch Offer Banner */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-pink-600/20 border-2 border-emerald-500/30 rounded-2xl p-4 text-center animate-pulse-glow">
        <div className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1">🚀 Limited Time Launch Offer</div>
        <div className="text-2xl font-black gradient-text">$1 First Month</div>
        <div className="text-xs text-gray-400 mt-1">On Starter & Pro plans. Cancel anytime.</div>
      </div>

      {/* Tier Cards */}
      <div className="space-y-3">
        {tiers.map(tier => {
          const isSelected = selectedTier === tier.id;
          return (
            <div key={tier.id}
              className={`bg-dark-700 rounded-2xl glass-border overflow-hidden transition-all duration-300 card-lift
                ${isSelected ? `border-2 ${tier.borderColor}` : 'border border-white/[0.06]'}`}>
              {/* Tier Header */}
              <div className={`bg-gradient-to-r ${tier.color} p-4 relative`}>
                {tier.badge && (
                  <span className="absolute top-2 right-2 text-[10px] font-extrabold bg-black/30 backdrop-blur-sm text-white px-2.5 py-1 rounded-full">{tier.badge}</span>
                )}
                <h4 className="text-lg font-extrabold text-white">{tier.name}</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  {tier.promo ? (
                    <>
                      <span className="text-3xl font-black text-white">{tier.promo}</span>
                      <span className="text-sm font-bold text-white/70">{tier.promoLabel}</span>
                      <span className="text-xs text-white/50 ml-1">then {tier.price}{tier.period}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-white">{tier.price}</span>
                      <span className="text-sm font-bold text-white/70">{tier.period}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="p-4">
                <button onClick={() => setSelectedTier(isSelected ? null : tier.id)}
                  className="text-xs font-bold text-emerald-400 hover:text-violet-300 mb-3 transition">
                  {isSelected ? '▼ Hide features' : '▶ Show features'}
                </button>
                {isSelected && (
                  <div className="space-y-2 animate-slide-up">
                    {tier.features.map(f => (
                      <div key={f.name} className="flex items-center gap-2 text-sm">
                        <span className={f.included ? 'text-emerald-400' : 'text-gray-600'}>{f.included ? '✅' : '—'}</span>
                        <span className={f.included ? 'text-gray-200' : 'text-gray-600'}>{f.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button className={`w-full mt-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5
                  bg-gradient-to-r ${tier.color} text-white hover:shadow-lg`}>
                  {tier.promo ? `Start for ${tier.promo}` : `Subscribe — ${tier.price}${tier.period}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="bg-dark-700 rounded-2xl p-4 glass-border">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Feature Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 pr-4 text-gray-500 font-bold">Feature</th>
                <th className="text-center py-2 px-2 text-blue-400 font-bold">Starter</th>
                <th className="text-center py-2 px-2 text-emerald-400 font-bold">Pro</th>
                <th className="text-center py-2 px-2 text-amber-400 font-bold">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Profit Calculator', true, true, true],
                ['Store Finder', '25mi', '100mi', '250mi'],
                ['Daily Scans', '5', '∞', '∞'],
                ['FBM/FBA Analysis', true, true, true],
                ['IP/Gating Alerts', true, true, true],
                ['Sales Tax Calc', true, true, true],
                ['Lead Hunter', false, true, true],
                ['AI Listing Drafts', false, true, true],
                ['Scout Alerts', false, true, true],
                ['Route Optimizer', false, false, true],
                ['Tax CSV Export', false, true, true],
                ['Performance Dashboard', true, true, true],
                ['Offline Mode', false, true, true],
                ['Priority Support', false, false, true],
              ].map(([feature, s, p, e], i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="py-2 pr-4 text-gray-300 font-medium">{feature as string}</td>
                  {[s, p, e].map((val, j) => (
                    <td key={j} className="text-center py-2 px-2">
                      {val === true ? <span className="text-emerald-400">✓</span>
                       : val === false ? <span className="text-gray-600">—</span>
                       : <span className="text-gray-300 font-bold">{val as string}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, sublabel, value, onChange }: { label: string; sublabel: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[10px] text-gray-500">{sublabel}</div>
      </div>
      <button onClick={() => onChange(!value)}
        className={`w-12 h-7 rounded-full p-1 transition-all duration-200 ${value ? 'bg-emerald-600' : 'bg-dark-500'}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

function NotificationDemo() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button onClick={() => { setShow(true); setTimeout(() => setShow(false), 4000); }}
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold py-3 rounded-xl text-sm hover:-translate-y-0.5 transition-all">
        🚨 Test "RUN! DEAL DETECTED" Alert
      </button>
      {show && (
        <div className="mt-3 bg-gradient-to-r from-red-600/20 to-orange-600/20 border-2 border-red-500/50 rounded-2xl p-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl animate-bounce">🏃‍♂️</span>
            <span className="text-lg font-black text-red-400">RUN! DEAL DETECTED!</span>
          </div>
          <p className="text-sm font-semibold">Sony WH-1000XM5 at Best Buy Northside</p>
          <p className="text-xs text-gray-400 mt-1">Clearance $149 → Sells for $279 on Amazon</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md">87% ROI</span>
            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md">🏆 Undisputed</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ViralAlertDemo() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button onClick={() => { setShow(true); setTimeout(() => setShow(false), 5000); }}
        className="w-full bg-gradient-to-r from-pink-600 to-emerald-600 text-white font-bold py-3 rounded-xl text-sm hover:-translate-y-0.5 transition-all">
        🚀 Test "Viral Sighting" Alert
      </button>
      {show && (
        <div className="mt-3 bg-gradient-to-r from-pink-600/20 to-emerald-600/20 border-2 border-teal-500/50 rounded-2xl p-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl animate-bounce">🚀</span>
            <span className="text-lg font-black text-pink-400">VIRAL SIGHTING!</span>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">📱 TikTok</span>
          </div>
          <p className="text-sm font-semibold">Apple AirPods Pro (2nd Gen) at Best Buy</p>
          <p className="text-xs text-gray-400 mt-1">5.2x velocity spike • Only ~3 left in stock</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-md">+$94 profit</span>
            <span className="text-xs font-bold bg-teal-500/20 text-pink-400 px-2 py-1 rounded-md">🚀 TikTok Trending</span>
            <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-1 rounded-md">⚡ Low Stock</span>
          </div>
        </div>
      )}
    </div>
  );
}


/* ================================================================
   COMMUNITY TAB — Stories + Chat
   ================================================================ */
function CommunityTab({ stories, communityProfit, chatMessages, chatHandle, setChatHandle,
  onSendChat, onRefreshStories, onRefreshChat, loading, finds, onPostStory,
}: {
  stories: SuccessStory[]; communityProfit: number;
  chatMessages: ChatMessage[]; chatHandle: string; setChatHandle: (s: string) => void;
  onSendChat: (msg: string, type?: string, data?: string) => void;
  onRefreshStories: () => void; onRefreshChat: () => void;
  loading: boolean; finds: MyFind[]; onPostStory: (f: MyFind) => void;
}) {
  const [subTab, setSubTab] = useState<'feed' | 'chat'>('feed');
  const [chatInput, setChatInput] = useState('');
  const [showSharePicker, setShowSharePicker] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const soldFinds = finds.filter(f => f.status === 'sold');

  React.useEffect(() => {
    if (subTab === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, subTab]);

  // Poll chat every 5s when on chat sub-tab
  React.useEffect(() => {
    if (subTab !== 'chat') return;
    const iv = setInterval(onRefreshChat, 5000);
    return () => clearInterval(iv);
  }, [subTab, onRefreshChat]);

  const handleSend = () => {
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Handle input */}
      {!chatHandle && (
        <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-emerald-400">👋 Set your handle to join the community</h3>
          <input placeholder="Enter your display name..."
            onChange={e => setChatHandle(e.target.value)}
            className="w-full bg-dark-600 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:border-emerald-500/50 transition" />
        </div>
      )}

      {/* Community Stats */}
      <div className="bg-gradient-to-r from-emerald-600/20 to-pink-600/20 border border-emerald-500/20 rounded-2xl p-4 text-center">
        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">🏆 FlipScout Community</div>
        <div className="text-3xl font-black gradient-text">{fmt(communityProfit)}</div>
        <div className="text-xs text-gray-400 mt-1">Total community profit • {stories.length} flips shared</div>
      </div>

      {/* Sub-tab toggle */}
      <div className="bg-dark-700 rounded-xl p-1 flex glass-border">
        <button onClick={() => { setSubTab('feed'); onRefreshStories(); }}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${subTab === 'feed' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}>
          🏆 Success Stories
        </button>
        <button onClick={() => { setSubTab('chat'); onRefreshChat(); }}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${subTab === 'chat' ? 'bg-teal-600 text-white' : 'text-gray-400'}`}>
          💬 Live Chat
        </button>
      </div>

      {/* Stories Feed */}
      {subTab === 'feed' && (
        <div className="space-y-3">
          {/* Share button */}
          {soldFinds.length > 0 && (
            <button onClick={() => setShowSharePicker(!showSharePicker)}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3 rounded-xl text-sm hover:-translate-y-0.5 transition-all">
              🎉 Share My Success
            </button>
          )}
          {showSharePicker && (
            <div className="bg-dark-700 rounded-2xl p-4 glass-border animate-slide-up space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase">Select a sold item to share:</h4>
              {soldFinds.map(f => (
                <button key={f.id} onClick={() => { onPostStory(f); setShowSharePicker(false); }}
                  className="w-full bg-dark-600 rounded-xl p-3 text-left glass-border hover:border-emerald-500/30 transition card-lift">
                  <div className="font-semibold text-sm truncate">{f.product_name}</div>
                  <div className="text-xs text-emerald-400 mt-1">+{fmt((f.sold_price || 0) - f.cogs)} profit on {f.sold_platform}</div>
                </button>
              ))}
            </div>
          )}

          {/* Story cards */}
          {stories.map((s, i) => (
            <div key={s.id} className="bg-dark-700 rounded-xl p-4 glass-border card-lift animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-lg flex-shrink-0">
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-emerald-400">{s.user_handle}</span>
                    <span className="text-[10px] text-gray-500">{ts(s.posted_at)}</span>
                  </div>
                  <p className="text-sm mt-1">
                    Flipped <b className="text-white">{s.product_name}</b>
                    {s.store_name && <> from <span className="text-gray-400">{s.store_name}</span></>}
                    {s.sold_platform && <> on <span className="text-gray-400">{s.sold_platform}</span></>}
                  </p>
                  <div className="mt-2">
                    <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">
                      +{fmt(s.profit_amount)} profit 💰
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {stories.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-sm">No stories yet. Be the first to share a win!</p>
            </div>
          )}
        </div>
      )}

      {/* Live Chat */}
      {subTab === 'chat' && (
        <div className="space-y-3">
          {/* Messages */}
          <div className="bg-dark-700 rounded-2xl glass-border overflow-hidden">
            <div className="h-[calc(100vh-380px)] min-h-[300px] overflow-y-auto p-3 space-y-2">
              {chatMessages.map((m) => {
                const isMe = m.user_handle === (chatHandle || 'Anonymous');
                const isProductShare = m.msg_type === 'product_share';
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${isMe ? 'bg-emerald-600/30 rounded-br-md' : 'bg-dark-600 rounded-bl-md'} ${isProductShare ? 'border border-emerald-500/30' : ''}`}>
                      {!isMe && <div className="text-[10px] font-bold text-emerald-400 mb-0.5">{m.user_handle}</div>}
                      <div className="text-sm">{m.message}</div>
                      {isProductShare && (
                        <div className="mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded inline-block">📦 Product Share</div>
                      )}
                      <div className="text-[9px] text-gray-500 mt-0.5 text-right">{ts(m.posted_at)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.06] p-3 flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder={chatHandle ? 'Type a message...' : 'Set a handle first...'}
                disabled={!chatHandle}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-dark-600 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500/50 transition disabled:opacity-40" />
              <button onClick={handleSend} disabled={!chatInput.trim() || !chatHandle}
                className="bg-emerald-600 text-white font-bold px-4 rounded-xl text-sm disabled:opacity-40 hover:-translate-y-0.5 transition-all">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   DETAIL DRAWER
   ================================================================ */
function DetailDrawer({ item, mode, onClose, onSave, onDraft, draft, onShare }: {
  item: ProfitAnalysis; mode: 'fbm' | 'fba'; onClose: () => void;
  onSave: () => void; onDraft: () => void; draft: ListingDraft | null; onShare: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex justify-end animate-fade-in" onClick={onClose}>
      <div className="bg-dark-800 w-full max-w-md h-full overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <h2 className="font-extrabold text-lg leading-tight">{item.productName}</h2>
              <div className="flex gap-2 mt-2 flex-wrap">
                {item.aisle && <span className="text-[10px] font-bold bg-dark-600 px-2 py-0.5 rounded-md">Aisle {item.aisle}</span>}
                <span className="text-[10px] font-bold text-gray-400">{item.weight} lbs</span>
                <span className="text-[10px] font-bold text-gray-400">SKU {item.sku}</span>
              </div>
            </div>
            <button onClick={onClose} className="bg-dark-600 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
          </div>

          {/* Risk flags */}
          {item.ipRisk.isGated && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              🛡️ <b>Gated/IP Risk:</b> {item.ipRisk.brand} is restricted on Amazon. May require ungating.
            </div>
          )}
          {item.hazmat?.isHazmat && (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-sm text-orange-400">
              ☢️ <b>Hazmat/Safety:</b> {item.hazmat.reasons.join('. ')}. May need special shipping.
            </div>
          )}
          {item.viral?.isViral && (
            <div className="bg-gradient-to-r from-pink-600/10 to-emerald-600/10 border border-teal-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-extrabold text-pink-400">🚀 Viral Sighting</span>
                {item.viral.hasSocialSignal && <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">{item.viral.socialPlatforms.join(', ')}</span>}
              </div>
              <p className="text-xs text-gray-300">{item.viral.velocityMultiplier}x velocity spike • {item.viral.currentVelocity} sales/mo vs {item.viral.historicalAvgSales} avg</p>
              {item.viral.lowStock && <p className="text-xs text-amber-400 mt-1 font-bold">⚡ Low stock alert — est. {item.viral.stockEstimate} units remaining</p>}
            </div>
          )}
          {item.marketTrend.priceCrashRisk && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              📉 <b>Price Crash Risk:</b> Seller count up {item.marketTrend.sellerDeltaPct}% in 7 days ({item.marketTrend.sellers7dAgo} → {item.marketTrend.sellersNow})
            </div>
          )}

          {/* AI Scout Opinion */}
          {item.scoutOpinion && (
            <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-extrabold gradient-text">✨ AI Scout Opinion</span>
                <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md uppercase">AI</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{item.scoutOpinion}</p>
            </div>
          )}

          {/* Amazon Presence */}
          <div className="bg-dark-700 rounded-xl p-4 glass-border">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Amazon Listing Intel</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Buy Box:</span> <b>{item.amazonListing.buyBoxOwnerType}</b></div>
              <div><span className="text-gray-500">Amazon Sells:</span> <b className={item.amazonListing.amazonIsSeller ? 'text-red-400' : 'text-emerald-400'}>{item.amazonListing.amazonIsSeller ? 'YES ⚠️' : 'No ✅'}</b></div>
              <div><span className="text-gray-500">FBA Sellers:</span> <b>{item.amazonListing.fbaSellerCount}</b></div>
              <div><span className="text-gray-500">FBM Sellers:</span> <b>{item.amazonListing.fbmSellerCount}</b></div>
              <div><span className="text-gray-500">Total Sellers:</span> <b>{item.amazonListing.totalSellerCount}</b></div>
              <div><span className="text-gray-500">Mo. Sales:</span> <b>{item.recommendation.estimatedMonthlySales}</b></div>
            </div>
          </div>

          {/* Side-by-side FBM vs FBA */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">FBM vs FBA Comparison</h3>
            <div className="grid grid-cols-2 gap-3">
              {[item.fbm, item.fba].map((d, i) => (
                <div key={i} className={`bg-dark-700 rounded-xl p-3 glass-border ${mode === (i === 0 ? 'fbm' : 'fba') ? 'border-emerald-500/40' : ''}`}>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">{d.label}</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Referral</span><span>-{fmt(d.referralFee)}</span></div>
                    {i === 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping ({(d as any).shippingCarrier})</span><span>-{fmt((d as any).shippingCost)}</span></div>}
                    {i === 1 && <>
                      <div className="flex justify-between"><span className="text-gray-500">FBA Fee</span><span>-{fmt((d as any).fulfillmentFee)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Storage</span><span>-{fmt((d as any).storageFee)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Inbound Ship</span><span>-{fmt((d as any).inboundShipping)}</span></div>
                    </>}
                    <div className="border-t border-white/[0.06] my-1" />
                    <div className="flex justify-between font-bold"><span>Total Fees</span><span className="text-red-400">-{fmt(d.totalFees)}</span></div>
                    <div className="flex justify-between font-bold"><span>Profit</span><span className={d.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>{d.profit >= 0 ? '+' : ''}{fmt(d.profit)}</span></div>
                    <div className="flex justify-between font-bold"><span>ROI</span><span>{pct(d.roi)}</span></div>
                    <div className={`text-center mt-2 py-1.5 rounded-lg text-[10px] font-extrabold ${d.goodBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {d.goodBuy ? '✅ GOOD BUY' : '❌ NO'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping rates */}
          <div className="bg-dark-700 rounded-xl p-4 glass-border">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Shipping Rates ({item.weight} lbs)</h3>
            <div className="space-y-2">
              {[item.shipping.usps, item.shipping.fedex, item.shipping.ups].map(r => (
                <div key={r.carrier} className={`flex justify-between text-sm py-1.5 px-3 rounded-lg ${r.carrier === item.shipping.cheapest.carrier ? 'bg-emerald-500/10 border border-emerald-500/30' : ''}`}>
                  <span className="font-semibold">{r.carrier} <span className="text-xs text-gray-500">{r.service}</span></span>
                  <span className="font-bold">{fmt(r.cost)} {r.carrier === item.shipping.cheapest.carrier && <span className="text-emerald-400 text-xs">★ Best</span>}</span>
                </div>
              ))}
            </div>
          </div>

          {/* COGS Breakdown */}
          <div className="bg-dark-700 rounded-xl p-4 glass-border">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">COGS Breakdown</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Store Price</span><span>{fmt(item.storeBuyPrice)}</span></div>
              {item.storeDiscount.pct > 0 && <div className="flex justify-between text-emerald-400"><span>Discount ({item.storeDiscount.pct}%)</span><span>-{fmt(item.storeDiscount.amount)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Sales Tax ({item.salesTaxState} {pct(item.salesTaxRate * 100)})</span><span>{fmt(item.salesTax)}</span></div>
              <div className="border-t border-white/[0.06] my-1" />
              <div className="flex justify-between font-bold"><span>Total COGS</span><span>{fmt(item.cogs)}</span></div>
            </div>
          </div>

          {/* AI Listing Draft */}
          <div className="space-y-2">
            <button onClick={onDraft}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl text-sm hover:-translate-y-0.5 transition-all">
              ✨ Generate AI Listing Draft
            </button>
            {draft && (
              <div className="bg-dark-700 rounded-xl p-4 glass-border animate-slide-up">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">eBay Listing Preview</h4>
                <div className="bg-dark-600 rounded-lg p-3 mb-2">
                  <div className="text-sm font-bold text-emerald-400 mb-1">Title:</div>
                  <div className="text-sm">{draft.title}</div>
                </div>
                <div className="bg-dark-600 rounded-lg p-3">
                  <div className="text-sm font-bold text-emerald-400 mb-1">Description:</div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">{draft.description}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-6">
            <button onClick={onSave}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 rounded-xl text-sm hover:-translate-y-0.5 transition-all">
              📌 Save to My Finds
            </button>
            <button onClick={onShare}
              className="bg-emerald-600 text-white font-bold px-4 py-3.5 rounded-xl text-sm hover:-translate-y-0.5 transition-all">
              📤 Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
