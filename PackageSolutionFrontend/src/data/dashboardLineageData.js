const dashboardLineageData = [
  {
    id: 'profit-and-loss',
    name: 'Profit and Loss',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Financial Accounting Records', 'General Ledger Entries'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Combines Financial Records with Cost Data', 'Calculates Profit = Revenue - Expenses', 'Standardizes Currency to USD'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Profit & Loss Dashboard', 'Aggregated by Profit Center and Region'] }
    ]
  },
  {
    id: 'balance-sheet',
    name: 'Balance Sheet',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Financial Accounting Records', 'Asset Accounting Data'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Aligns Accounts with Financial Statement Structure', 'Categorizes Assets, Liabilities, and Equity', 'Calculates Net Worth = Total Assets - Total Liabilities'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Balance Sheet Dashboard', 'Live Period-End Reporting'] }
    ]
  },
  {
    id: 'trial-balance',
    name: 'Trial Balance',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['General Ledger Totals'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Aggregates Debits and Credits', 'Validates Accounting Balance', 'Calculates Balance = Total Debits - Total Credits'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Trial Balance Dashboard', 'Audit & Compliance Reporting'] }
    ]
  },
  {
    id: 'accounts-receivable',
    name: 'Accounts Receivable',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Open and Cleared Invoices', 'Customer Master Data'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Calculates Payment Ageing (30/60/90 days)', 'Calculates Days Sales Outstanding = (Accounts Receivable / Total Credit Sales) * 365'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Accounts Receivable Dashboard', 'Risk & Collections Focus'] }
    ]
  },
  {
    id: 'accounts-payable',
    name: 'Accounts Payable',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Open and Cleared Invoices', 'Vendor Master Data'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Calculates Payment Due Dates', 'Evaluates Early Payment Discounts', 'Calculates Days Payable Outstanding = (Accounts Payable / Cost of Goods Sold) * 365'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Accounts Payable Dashboard', 'Working Capital Focus'] }
    ]
  },
  {
    id: 'delivery-lead-time',
    name: 'Delivery Lead Time',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Sales Order Data', 'Delivery Confirmations'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Calculates Time Between Order and Delivery', 'Identifies Delivery Delays', 'Calculates Lead Time = Delivery Date - Order Date'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Delivery Performance Dashboard', 'Customer Satisfaction Focus'] }
    ]
  },
  {
    id: 'sales-revenue',
    name: 'Sales Revenue',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Sales Invoices', 'Billing Documents'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Consolidates Sales Data by Region and Customer', 'Applies Currency Conversions', 'Calculates Net Revenue = Gross Sales - Discounts - Returns'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Sales Revenue Dashboard', 'Executive Sales Summary'] }
    ]
  },
  {
    id: 'days-sales-outstanding',
    name: 'Days Sales Outstanding',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Accounts Receivable Data', 'Customer Invoices'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Calculates Average Collection Period', 'Benchmarks Collection Efficiency', 'Calculates Days Sales Outstanding = (Accounts Receivable / Credit Sales) * 365'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['DSO & Collections Dashboard', 'Treasury & Risk Focus'] }
    ]
  },
  {
    id: 'customer-performance',
    name: 'Customer Performance',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Customer Master Data', 'Product Sales Records'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Maps Customers to Purchased Products', 'Identifies Top Revenue Contributors', 'Calculates Customer Margin = Revenue - Cost to Serve'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Customer Performance Dashboard', 'Account Management Focus'] }
    ]
  },
  {
    id: 'material-performance',
    name: 'Material Performance',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Product Sales Records', 'Material Master Data'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Maps Materials to Sales Transactions', 'Identifies Top Selling Products', 'Calculates Material Margin = Revenue - Cost of Goods Sold'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Material Performance Dashboard', 'Product Portfolio Focus'] }
    ]
  },
  {
    id: 'stock-on-hand',
    name: 'Inventory Analysis',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Inventory Movement Records', 'Material Master Data'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Aggregates Current Stock Quantities', 'Evaluates Inventory Value', 'Calculates Stock Value = Quantity on Hand * Unit Cost'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Inventory Analysis Dashboard', 'Warehouse & Stock Focus'] }
    ]
  },
  {
    id: 'stock-overview',
    name: 'Stock Overview',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Historical Inventory Movements', 'Goods Receipts and Issues'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Tracks Stock Movements Over Time', 'Calculates Closing Stock = Opening Stock + Receipts - Issues'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Stock Overview Dashboard', 'Period-End Inventory Focus'] }
    ]
  },
  {
    id: 'spend-analysis',
    name: 'Spend Analysis',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Purchase Orders', 'Supplier Invoices'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Categorizes Spend by Supplier and Material', 'Calculates Total Spend = Sum of Purchase Order Values'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Spend Analysis Dashboard', 'Procurement & Sourcing Focus'] }
    ]
  },
  {
    id: 'supplier-score-card',
    name: 'Supplier Score Card',
    lineage: [
      { stage: 'Source', name: 'SAP S/4HANA', type: 'System', details: ['Delivery Confirmations', 'Quality Inspection Reports'] },
      { stage: 'Harmonization', name: 'SAP Datasphere', type: 'Data Builder', details: ['Evaluates Delivery Timeliness and Quality', 'Calculates On-Time In-Full = (On Time Deliveries / Total Deliveries) * 100'] },
      { stage: 'Output', name: 'SAP Analytics Cloud', type: 'Reporting Model', details: ['Supplier Scorecard Dashboard', 'Supplier Relationship Management'] }
    ]
  }
];

export default dashboardLineageData;
