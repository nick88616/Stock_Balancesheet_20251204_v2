export type AssetCategory = 'MarketETF' | 'BondETF' | 'IndividualStock';
export type Currency = 'TWD' | 'USD';

export interface AssetHolding {
  id: string;
  symbol: string;
  value: number; // Value in original currency
  currency: Currency;
  category: AssetCategory;
}

// Store the state of the portfolio for a specific date
export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  holdings: AssetHolding[];
  totalValueTWD: number;
  marketEtfValue: number;
  bondEtfValue: number;
  individualStockValue: number;
}

export interface PortfolioHistoryPoint {
  date: string;
  marketEtf: number;
  bondEtf: number;
  individualStock: number;
  total: number;
}

export interface CategorySummary {
  type: AssetCategory;
  label: string;
  color: string;
  totalValueTWD: number; // Normalized to TWD for charts
  holdings: AssetHolding[];
  subtotalTWD: number;
  subtotalUSD: number;
}
