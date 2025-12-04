import { AssetHolding, PortfolioHistoryPoint, PortfolioSnapshot, AssetCategory } from "../types";

const STORAGE_KEY = 'smartalloc_snapshots';
const EXCHANGE_RATE = 32.5;

// Initial data for first-time users
export const INITIAL_HOLDINGS: AssetHolding[] = [
  { id: '1', symbol: '0050', value: 1500000, currency: 'TWD', category: 'MarketETF' },
  { id: '2', symbol: 'VTI', value: 25000, currency: 'USD', category: 'MarketETF' }, 
  { id: '3', symbol: 'BND', value: 18000, currency: 'USD', category: 'BondETF' }, 
  { id: '4', symbol: '00679B', value: 400000, currency: 'TWD', category: 'BondETF' },
  { id: '5', symbol: 'TSLA', value: 6000, currency: 'USD', category: 'IndividualStock' },
  { id: '6', symbol: '2330', value: 300000, currency: 'TWD', category: 'IndividualStock' },
];

const calculateCategoryTotal = (holdings: AssetHolding[], category: AssetCategory): number => {
  return holdings
    .filter(h => h.category === category)
    .reduce((sum, h) => sum + (h.currency === 'USD' ? h.value * EXCHANGE_RATE : h.value), 0);
};

// Save a snapshot of the current portfolio for a specific date
export const saveSnapshot = (date: string, holdings: AssetHolding[]) => {
  const snapshots = getSnapshots();
  
  const marketVal = calculateCategoryTotal(holdings, 'MarketETF');
  const bondVal = calculateCategoryTotal(holdings, 'BondETF');
  const stockVal = calculateCategoryTotal(holdings, 'IndividualStock');

  const newSnapshot: PortfolioSnapshot = {
    date,
    holdings,
    totalValueTWD: marketVal + bondVal + stockVal,
    marketEtfValue: marketVal,
    bondEtfValue: bondVal,
    individualStockValue: stockVal
  };

  // Remove existing entry for this date if exists, then add new one
  const filtered = snapshots.filter(s => s.date !== date);
  filtered.push(newSnapshot);
  
  // Sort by date
  filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
};

// Delete a snapshot for a specific date
export const deleteSnapshot = (date: string) => {
  const snapshots = getSnapshots();
  const filtered = snapshots.filter(s => s.date !== date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
};

// Get all saved snapshots
export const getSnapshots = (): PortfolioSnapshot[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

// Import data from JSON file
export const importData = (data: any): PortfolioSnapshot[] => {
    if (!Array.isArray(data)) throw new Error("Invalid data format");
    
    // Basic validation to check if it looks like our schema
    const isValid = data.every(d => d.date && Array.isArray(d.holdings));
    if (!isValid) throw new Error("Invalid schema");
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
};

// Convert snapshots to chart data
export const getHistoryData = (): PortfolioHistoryPoint[] => {
  const snapshots = getSnapshots();
  
  // If no history, return empty array
  if (snapshots.length === 0) return [];

  return snapshots.map(s => ({
    date: s.date.slice(5), // Remove Year for shorter label (MM-DD)
    marketEtf: s.marketEtfValue,
    bondEtf: s.bondEtfValue,
    individualStock: s.individualStockValue,
    total: s.totalValueTWD
  }));
};

// Helper to check if we have data for today
export const hasEntryForDate = (date: string): boolean => {
  const snapshots = getSnapshots();
  return snapshots.some(s => s.date === date);
};