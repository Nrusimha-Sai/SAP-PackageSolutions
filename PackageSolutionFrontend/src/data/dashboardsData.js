/* ================================================================
   dashboardsData.js  –  Single Source of Truth (Business Metrics Catalog)
   ================================================================
   ADD / EDIT dashboards here.
   For each dashboard supply:
     - id            : unique string
     - name          : display name
     - lineOfBusiness: the LoB category (used in filter dropdown)
     - date          : publication / last-updated date string
     - description   : one-liner shown in the strip
     - summaryPoints : array of bullet strings shown in the expand panel
     - fileName      : Objects file name in the GitHub repo
     
   Note: Snapshots and Lineage have been split into separate files.
   ================================================================ */

const dashboardsData = [
  /* ──────────────────────── RECORD TO REPORT ──────────────────────── */
  {
    id: 'profit-and-loss',
    name: 'Profit and Loss',
    lineOfBusiness: 'Record to Report',
    date: 'May 12, 2024',
    description: 'Provides a summary of revenues, expenses, and profitability over a specific reporting period.',
    summaryPoints: [
      'Summarizes revenues, expenses, and profitability over reporting periods.',
      'Enables period-over-period comparison of key financial metrics and margins.',
      'Highlights cost breakdowns to identify areas for operational efficiency.'
    ],
    priceUSD: 6000,
    fileName: 'ProfitAndLoss.json',
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    lineOfBusiness: 'Record to Report',
    date: 'May 10, 2024',
    description: "Displays the organization's assets, liabilities, and equity position",
    summaryPoints: [
      "Displays the organization's comprehensive assets, liabilities, and equity position.",
      "Provides live period-end reporting for accurate financial health assessment.",
      "Supports working capital analysis and structural financial stability checks."
    ],
    priceUSD: 6000,
    fileName: 'BalanceSheet.json',
  },
  {
    id: 'trial-balance',
    name: 'Trial Balance',
    lineOfBusiness: 'Record to Report',
    date: 'May 08, 2024',
    description: 'Summarizes all general ledger account balances to verify that total debits equal total credits',
    summaryPoints: [
      'Summarizes all general ledger account balances to ensure accounting accuracy.',
      'Validates that total debits equal total credits for compliance.',
      'Groups accounts logically to streamline period-end audit and reporting processes.'
    ],
    priceUSD: 4000,
    fileName: 'TrialBalance.json',
  },
  {
    id: 'accounts-receivable',
    name: 'Accounts Receivable',
    lineOfBusiness: 'Record to Report',
    date: 'May 06, 2024',
    description: 'Shows outstanding customer receivables within the given Ageing',
    summaryPoints: [
      'Shows outstanding customer receivables segmented by standard ageing buckets.',
      'Highlights top overdue accounts to prioritize collections and minimize risk.',
      'Tracks Days Sales Outstanding (DSO) trends to measure collection efficiency.'
    ],
    priceUSD: 6000,
    fileName: 'AccountsReceivable.json',
  },
  {
    id: 'accounts-payable',
    name: 'Accounts Payable',
    lineOfBusiness: 'Record to Report',
    date: 'May 04, 2024',
    description: 'Shows outstanding payables within the given Ageing',
    summaryPoints: [
      'Shows outstanding vendor payables segmented by standard ageing buckets.',
      'Evaluates payment due dates to optimize early payment discount opportunities.',
      'Tracks Days Payable Outstanding (DPO) to manage working capital outflows.'
    ],
    priceUSD: 6000,
    fileName: 'AccountsPayable.json',
  },

  /* ──────────────────────── ORDER TO CASH ──────────────────────── */
  {
    id: 'delivery-lead-time',
    name: 'Delivery Lead Time',
    lineOfBusiness: 'Order to Cash',
    date: 'May 02, 2024',
    description: 'Measures the time taken from sales order creation to successful product delivery to the customer',
    summaryPoints: [
      'Measures the total time taken from sales order creation to successful product delivery.',
      'Analyzes on-time delivery rates across regions and customer segments.',
      'Identifies bottlenecks in order processing, shipping, or last-mile execution.'
    ],
    priceUSD: 3000,
    fileName: 'DeliveryLeadTime.json',
  },
  {
    id: 'sales-revenue',
    name: 'Sales Revenue',
    lineOfBusiness: 'Order to Cash',
    date: 'Apr 30, 2024',
    description: 'Reports revenue generated from product and service sales across customers, regions, and periods.',
    summaryPoints: [
      'Reports total revenue generated from product and service sales globally.',
      'Consolidates performance metrics across customers, sales regions, and fiscal periods.',
      'Analyzes net revenue trends by factoring in discounts, returns, and currency fluctuations.'
    ],
    priceUSD: 3000,
    fileName: 'SalesRevenue.json',
  },
  {
    id: 'days-sales-outstanding',
    name: 'Days Sales Outstanding',
    lineOfBusiness: 'Order to Cash',
    date: 'Apr 28, 2024',
    description: 'Measures the average number of days required to collect payment after a sale is made',
    summaryPoints: [
      'Measures the average number of days required to collect payment after a sale.',
      'Provides benchmarking against industry standards and internal corporate targets.',
      'Helps treasury and risk teams forecast cash flows and assess credit policies.'
    ],
    priceUSD: 5000,
    fileName: 'DaysSalesOutstanding.json',
  },
  {
    id: 'customer-performance',
    name: 'Customer Performance',
    lineOfBusiness: 'Order to Cash',
    date: 'Apr 26, 2024',
    description: 'Analyses customer sales revenues with the products they purchased',
    summaryPoints: [
      'Analyzes customer sales revenues and cross-references purchased product mixes.',
      'Identifies top revenue contributors and measures wallet share expansion.',
      'Calculates customer-level profitability by deducting the cost to serve from total revenue.'
    ],
    priceUSD: 3000,
    fileName: 'CustomerPerformance.json',
  },
  {
    id: 'material-performance',
    name: 'Material Performance',
    lineOfBusiness: 'Order to Cash',
    date: 'Apr 24, 2024',
    description: 'Analyses material sales revenues',
    summaryPoints: [
      'Analyzes material sales revenues and unit volumes across the product portfolio.',
      'Identifies top-selling products and fast-moving inventory items.',
      'Calculates material margins by deducting the cost of goods sold from product revenue.'
    ],
    priceUSD: 3000,
    fileName: 'MaterialPerformance.json',
  },

  /* ──────────────────────── INVENTORY ──────────────────────── */
  {
    id: 'stock-on-hand',
    name: 'Inventory Analysis',
    lineOfBusiness: 'Inventory',
    date: 'Apr 22, 2024',
    description: 'Displays the current available inventory quantity and value at the point in time',
    summaryPoints: [
      'Displays the current available inventory quantity and total valuation at a given point in time.',
      'Distributes inventory values across plants and storage locations for precise tracking.',
      'Triggers low-stock alerts to prevent out-of-stock scenarios and production delays.'
    ],
    priceUSD: 5000,
    fileName: 'StockOnHand.json',
  },
  {
    id: 'stock-overview',
    name: 'Stock Overview',
    lineOfBusiness: 'Inventory',
    date: 'Apr 20, 2024',
    description: 'Provides inventory balances summarizing opening, receipts, issues and closing balances',
    summaryPoints: [
      'Provides inventory balances summarizing opening stock, receipts, issues, and closing balances.',
      'Tracks historical inventory movements and period-over-period variations.',
      'Supports period-end inventory reconciliation and general warehouse management.'
    ],
    priceUSD: 5000,
    fileName: 'StockOverview.json',
  },

  /* ──────────────────────── PROCURE TO PAY ──────────────────────── */
  {
    id: 'spend-analysis',
    name: 'Spend Analysis',
    lineOfBusiness: 'Procure to Pay',
    date: 'Apr 18, 2024',
    description: 'Analyses procurement spending patterns across suppliers, materials across the purchasing attributes',
    summaryPoints: [
      'Analyzes procurement spending patterns across suppliers and material categories.',
      'Evaluates total spend against historical trends and budget allocations.',
      'Ensures sourcing compliance and identifies opportunities for volume discounts.'
    ],
    priceUSD: 2000,
    fileName: 'SpendAnalysis.json',
  },
  {
    id: 'supplier-score-card',
    name: 'Supplier Score Card',
    lineOfBusiness: 'Procure to Pay',
    date: 'Apr 16, 2024',
    description: 'Measures supplier performance with respect to material receipts and delivered quantity ( On time in Full)',
    summaryPoints: [
      'Measures supplier performance focusing on On-Time and In-Full (OTIF) delivery metrics.',
      'Evaluates material receipt quality and tracks defect rates over time.',
      'Categorizes top and bottom performing suppliers to manage supply chain risk.'
    ],
    priceUSD: 3000,
    fileName: 'SupplierScoreCard.json',
  }
];

export default dashboardsData;
