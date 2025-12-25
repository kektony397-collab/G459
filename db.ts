

import Dexie, { type Table } from 'dexie';
import { Product, Party, Invoice, CompanyProfile } from './types';

// AppDatabase class extending Dexie to manage the local IndexedDB
export class AppDatabase extends Dexie {
  products!: Table<Product>;
  parties!: Table<Party>;
  invoices!: Table<Invoice>;
  settings!: Table<CompanyProfile>;

  constructor() {
    super('GopiDistributorsDB');
    // Using version().stores() to define the database schema and store structures
    this.version(1).stores({
      products: '++id, name, hsn, batch',
      parties: '++id, name, gstin',
      invoices: '++id, invoiceNo, date, partyId',
      settings: '++id'
    });
  }
}

// Exporting a singleton instance of the database
export const db = new AppDatabase();

export const seedDatabase = async () => {
  try {
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      await db.settings.add({
        companyName: 'GOPI DISTRIBUTOR',
        addressLine1: '74/20/4, Navyug Colony',
        addressLine2: 'Bhulabhai Park Crossroad, Ahmedabad–22',
        gstin: '24AADPO7411Q1ZE',
        dlNo1: 'GJ-ADC-AA/1946',
        dlNo2: 'GJ-ADC-AA/4967',
        dlNo3: 'GJ-ADC-AA/1953',
        dlNo4: 'GJ-ADC-AA/4856',
        phone: '07925383834, 8460143984',
        email: 'info@gopidistributor.com',
        terms: 'Bill No. is must while returning EXP. Products\nE.&.O.E.\nSubject to Ahmedabad Jurisdiction.',
        theme: 'blue',
        invoiceTemplate: 'authentic',
        useDefaultGST: true,
        defaultGSTRate: 12,
        bankName: 'HDFC BANK LTD',
        bankAccNo: '50200021458796',
        bankIfsc: 'HDFC0001425',
        jurisdiction: 'Ahmedabad',
        platformMode: 'auto',
        darkMode: 'system'
      });
    }
  } catch (error) {
    console.error("Database Seeding Failed:", error);
  }
};