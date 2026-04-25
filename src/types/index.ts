export type TabId = 'home' | 'leads' | 'stats' | 'settings';

export interface AppSettings {
  zipCode: string;
  minProfitPct: number;
  hideGray: boolean;
  guestMode: boolean;
  savedFinds: string[];
}

export interface Store {
  id: string;
  name: string;
  address: string;
  distance: number;
}

export interface ProfitAnalysis {
  sku: string;
  productName: string;
  storePrice: number;
  amazonPrice: number;
  amazonFee: number;
  recommendation: {
    bestProfit: number;
    bestROI: number;
    action: 'BUY' | 'WAIT' | 'PASS';
  };
  store: string;
  aisle?: string;
}

export interface ProfitSummary {
  totalScanžed: number;
  goodBuys: number;
  potentialProfit: number;
}

export interface MyFind {
  id: string;
  date: string;
  name: string;
  cost: number;
  expectedProfit: number;
  status: 'listed' | 'sold' | 'holding';
}

export interface Performance {
  revenue: number;
  profit: number;
  itemsSold: number;
  hotCategory: string;
}

export interface ListingDraft {
  title: string;
  description: string;
  price: number;
  tags: string[];
}

export interface SuccessStory {
  id: string;
  user: string;
  item: string;
  profit: number;
  time: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  isMe: boolean;
}
