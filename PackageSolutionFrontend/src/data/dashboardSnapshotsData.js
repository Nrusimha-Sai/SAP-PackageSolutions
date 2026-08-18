const dashboardSnapshotsData = [
  {
    id: 'profit-and-loss',
    name: 'Profit and Loss',
    snapshots: [
      { image: '/Profit and Loss/Slide1.JPG', label: 'Revenue & Expense Summary',     description: 'Overview of revenue and expense summary for the reporting period.' },
      { image: '/Profit and Loss/Slide2.JPG', label: 'Cost Breakdown & Margins',      description: 'Detailed breakdown of cost categories and profit margins.' },
      { image: '/Profit and Loss/Slide3.JPG', label: 'Period-over-Period Comparison', description: 'Period-over-period comparison of key P&L metrics.' },
    ]
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    snapshots: [
      { image: '/Balance sheet/Slide1.JPG', label: 'Assets, Liabilities & Equity', description: 'High-level view of total assets, liabilities, and equity.' },
    ]
  },
  {
    id: 'trial-balance',
    name: 'Trial Balance',
    snapshots: [
      { image: '/Trail Balance/Slide1.JPG', label: 'GL Account Balances',  description: 'Full general ledger account list with debit/credit balances.' },
      { image: '/Trail Balance/Slide2.JPG', label: 'Account Group Totals', description: 'Aggregated view by account group with totals check.' },
    ]
  },
  {
    id: 'accounts-receivable',
    name: 'Accounts Receivable',
    snapshots: [
      { image: '/PL and balance sheet Hierarchy Dashboard/307227a5-0e5d-4a10-9944-904160dd2959-0.jpg', label: 'Customer Ageing Analysis', description: 'Customer-level ageing analysis with bucket breakdown.' },
      { image: '/PL and balance sheet Hierarchy Dashboard/307227a5-0e5d-4a10-9944-904160dd2959-1.jpg', label: 'Top Overdue Customers',    description: 'Top overdue customers and outstanding amounts.' },
      { image: '/PL and balance sheet Hierarchy Dashboard/307227a5-0e5d-4a10-9944-904160dd2959-2.jpg', label: 'Collection Trend & DSO',   description: 'Collection trend and DSO analysis over time.' },
    ]
  },
  {
    id: 'accounts-payable',
    name: 'Accounts Payable',
    snapshots: [
      { image: '/Accounts Payable/Slide1.JPG', label: 'Vendor Ageing Analysis', description: 'Vendor-level ageing analysis with payment due dates.' },
    ]
  },
  {
    id: 'delivery-lead-time',
    name: 'Delivery Lead Time',
    snapshots: [
      { image: '/Delivery Lead Time/Slide1.JPG', label: 'Lead Time by Region',   description: 'Average delivery lead time by region and customer segment.' },
      { image: '/Delivery Lead Time/Slide2.JPG', label: 'On-Time Delivery Rate', description: 'On-time delivery rate trend over selected periods.' },
      { image: '/Delivery Lead Time/Slide3.JPG', label: 'Lead Time Breakdown',   description: 'Lead time breakdown by order processing, shipping, and last-mile.' },
    ]
  },
  {
    id: 'sales-revenue',
    name: 'Sales Revenue',
    snapshots: [
      { image: '/Sales Revenue/Slide1.JPG', label: 'Revenue Trend Overview', description: 'Total revenue overview with trend line by period.' },
    ]
  },
  {
    id: 'days-sales-outstanding',
    name: 'Days Sales Outstanding',
    snapshots: [
      { image: '/Days Sales Outstanding/Slide1.JPG', label: 'DSO Trend – 12 Months', description: 'DSO trend over trailing 12 months by business unit.' },
      { image: '/Days Sales Outstanding/Slide2.JPG', label: 'DSO Benchmarking',      description: 'DSO benchmarking against industry and internal targets.' },
    ]
  },
  {
    id: 'customer-performance',
    name: 'Customer Performance',
    snapshots: [
      { image: '/Customer Performance/Slide1.JPG', label: 'Top Customers by Revenue',   description: 'Top customers by revenue and growth rate.' },
      { image: '/Customer Performance/Slide2.JPG', label: 'Product Mix & Wallet Share', description: 'Customer product mix and wallet share analysis.' },
      { image: '/Customer Performance/Slide3.JPG', label: 'Profitability Waterfall',    description: 'Customer profitability and margin waterfall.' },
      { image: '/Customer Performance/Slide4.JPG', label: 'YoY Revenue Trend',          description: 'Year-over-year customer revenue trend.' },
    ]
  },
  {
    id: 'material-performance',
    name: 'Material Performance',
    snapshots: [
      { image: '/Material Performance/Slide1.JPG', label: 'Top Materials by Revenue', description: 'Top materials by revenue and units sold.' },
    ]
  },
  {
    id: 'stock-on-hand',
    name: 'Inventory Analysis',
    snapshots: [
      { image: '/PL and balance sheet Hierarchy Dashboard/307227a5-0e5d-4a10-9944-904160dd2959-0.jpg', label: 'Stock by Material & Plant',    description: 'Current stock levels by material and plant.' },
      { image: '/PL and balance sheet Hierarchy Dashboard/307227a5-0e5d-4a10-9944-904160dd2959-1.jpg', label: 'Inventory Value Distribution', description: 'Inventory value distribution across storage locations.' },
      { image: '/PL and balance sheet Hierarchy Dashboard/307227a5-0e5d-4a10-9944-904160dd2959-2.jpg', label: 'Low-Stock Alerts',             description: 'Low-stock and out-of-stock material alerts.' },
      { image: '/PL and balance sheet Hierarchy Dashboard/307227a5-0e5d-4a10-9944-904160dd2959-3.jpg', label: 'Stock Aging Analysis',         description: 'Stock aging and slow-mover analysis.' },
    ]
  },
  {
    id: 'stock-overview',
    name: 'Stock Overview',
    snapshots: [
      { image: '/Stock Overview/Slide1.JPG', label: 'Period Movement Summary', description: 'Period inventory movement summary: opening to closing.' },
    ]
  },
  {
    id: 'spend-analysis',
    name: 'Spend Analysis',
    snapshots: [
      { image: '/Spend Analysis/Slide1.JPG', label: 'Spend by Category & Supplier', description: 'Total spend overview by category and supplier.' },
      { image: '/Spend Analysis/Slide2.JPG', label: 'Spend Trend & Compliance',    description: 'Spend trend over time with supplier compliance rate.' },
    ]
  },
  {
    id: 'supplier-score-card',
    name: 'Supplier Score Card',
    snapshots: [
      { image: '/Supplier Score Card/Slide1.JPG', label: 'OTIF Scorecard',             description: 'Supplier scorecard with OTIF and quality metrics.' },
      { image: '/Supplier Score Card/Slide2.JPG', label: 'Top & Bottom Performers',    description: 'Top and bottom performing suppliers by category.' },
      { image: '/Supplier Score Card/Slide3.JPG', label: 'Delivery Performance Trend', description: 'Delivery performance trend by supplier over time.' },
      { image: '/Supplier Score Card/Slide4.JPG', label: 'Supplier Risk Matrix',       description: 'Supplier risk matrix: performance vs spend exposure.' },
    ]
  }
];

export default dashboardSnapshotsData;
