
export enum GSTRate {
  GST_0 = 0,
  GST_5 = 5,
  GST_12 = 12,
  GST_18 = 18,
  GST_28 = 28,
}

export type AppTheme = 'blue' | 'green' | 'purple' | 'dark';
export type InvoiceTemplate = 'standard' | 'modern' | 'thermal' | 'authentic' | 'landscape';
export type PlatformMode = 'windows' | 'android' | 'auto';
export type ColorScheme = 'light' | 'dark' | 'system';

export interface CompanyProfile {
  id?: number;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  gstin: string;
  dlNo1: string; 
  dlNo2: string; 
  dlNo3?: string;
  dlNo4?: string;
  phone: string;
  email: string;
  terms: string;
  bankName?: string;
  bankAccNo?: string;
  bankIfsc?: string;
  jurisdiction?: string;
  theme?: AppTheme;
  invoiceTemplate?: InvoiceTemplate;
  useDefaultGST?: boolean;
  defaultGSTRate?: number;
  // New Platform Settings
  platformMode?: PlatformMode;
  darkMode?: ColorScheme;
}

export interface Product {
  id?: number;
  name: string;
  batch: string;
  expiry: string; 
  hsn: string;
  gstRate: number;
  mrp: number;
  oldMrp?: number;
  purchaseRate: number;
  saleRate: number;
  stock: number;
  manufacturer?: string;
}

export interface Party {
  id?: number;
  name: string;
  gstin: string;
  address: string;
  phone: string;
  email?: string;
  dlNo1?: string; 
  dlNo2?: string; 
  type?: 'WHOLESALE' | 'RETAIL';
  stateCode?: string;
}

export interface InvoiceItem extends Product {
  productId: number;
  quantity: number;
  freeQuantity: number;
  discountPercent: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id?: number;
  invoiceNo: string;
  date: string; 
  invoiceType: 'WHOLESALE' | 'RETAIL';
  partyId: number;
  partyName: string;
  partyGstin: string;
  partyAddress: string;
  partyStateCode?: string;
  grNo?: string;
  vehicleNo?: string;
  transport?: string;
  items: InvoiceItem[];
  totalTaxable: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  grandTotal: number;
  roundOff: number;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  notes?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalInvoices: number;
  lowStockItems: number;
  expiringSoonItems: number;
}
