/* ================================================================
   kpiPricing.js
   Centralized configuration for KPI pricing and currency exchange.
   ================================================================ */

export const CURRENCIES = {
  USD: { symbol: '$', rate: 1.0 },
  INR: { symbol: '₹', rate: 83.5 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
};

// Base prices in USD
export const KPI_PRICES = {
  'profit-and-loss': 6000,
  'balance-sheet': 6000,
  'trial-balance': 4000,
  'accounts-receivable': 6000,
  'accounts-payable': 6000,
  
  'delivery-lead-time': 3000,
  'sales-revenue': 3000,
  'days-sales-outstanding': 5000,
  'customer-performance': 3000,
  'material-performance': 3000,

  'stock-on-hand': 5000,
  'stock-overview': 5000,

  'spend-analysis': 2000,
  'supplier-score-card': 3000,

  'jr-ds-agent': 250,
  'jr-sac-agent': 250,
};

/**
 * Helper to get the price of a KPI in a specific currency.
 * Defaults to $50 if the KPI ID is not explicitly priced above.
 */
export const getKpiPrice = (id, currency = 'USD') => {
  const basePrice = KPI_PRICES[id] || 50;
  const rate = CURRENCIES[currency]?.rate || 1.0;
  return basePrice * rate;
};
