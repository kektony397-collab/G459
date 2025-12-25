
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { FileText, Printer, TrendingUp, Calendar, CreditCard, Search, X } from 'lucide-react';
import clsx from 'clsx';

export const InvoiceList: React.FC = () => {
  const allInvoices = useLiveQuery(() => db.invoices.reverse().toArray()) || [];
  const profile = useLiveQuery(() => db.settings.get(1));
  const [searchTerm, setSearchTerm] = useState('');

  // Stats Logic - Always based on full dataset
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = allInvoices.filter(inv => inv.date.startsWith(todayStr));
  const totalToday = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  // Search Logic - Fast & Accurate (AND based token matching)
  const filteredInvoices = useMemo(() => {
    if (!searchTerm.trim()) return allInvoices;
    
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    return allInvoices.filter(inv => {
      const text = `${inv.invoiceNo} ${inv.partyName} ${inv.grandTotal} ${inv.date} ${inv.items.length}`.toLowerCase();
      return terms.every(term => text.includes(term));
    });
  }, [allInvoices, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Invoice History</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage and reprint your wholesale bills</p>
        </div>
      </div>

      {/* Daily Analytics Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#2c2c2c] p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-[#383838] flex items-center gap-4 group hover:scale-[1.02] transition-transform">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Sales</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">₹{totalToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#2c2c2c] p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-[#383838] flex items-center gap-4 group hover:scale-[1.02] transition-transform">
          <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-colors">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bills Generated</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{todayInvoices.length}</h3>
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#2c2c2c] p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-[#383838] flex items-center gap-4 group hover:scale-[1.02] transition-transform">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Life Time Total</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">₹{(allInvoices.reduce((s,i) => s + i.grandTotal, 0)).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group z-10">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Search Invoices (Number, Party, Amount)..."
          className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-200 dark:border-[#383838] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:bg-[#2c2c2c] dark:text-white shadow-sm transition-all dark:placeholder:text-slate-600 font-bold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-[#383838] rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>
      
      <div className="bg-white dark:bg-[#2c2c2c] rounded-[2rem] shadow-sm border border-slate-100 dark:border-[#383838] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#323232] border-b border-slate-100 dark:border-[#383838] text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">Date & Time</th>
                <th className="px-6 py-5">Invoice No</th>
                <th className="px-6 py-5">Party Name</th>
                <th className="px-6 py-5 text-right">Items</th>
                <th className="px-6 py-5 text-right">Grand Total</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#383838]">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-[#323232] transition-colors text-sm group">
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2 font-bold">
                       <Calendar className="w-3.5 h-3.5 text-slate-400" />
                       {new Date(inv.date).toLocaleDateString('en-GB')}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {inv.invoiceNo}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                    {inv.partyName}
                    <div className="text-[10px] text-slate-400 font-normal uppercase">{inv.partyGstin || 'URD'}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="bg-slate-100 dark:bg-[#383838] px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400">{inv.items.length} ITMS</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white text-lg">
                    ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => generateInvoicePDF(inv, profile?.invoiceTemplate)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white rounded-xl transition-all font-bold text-xs shadow-sm hover:shadow-md active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" /> Reprint
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center opacity-30">
                       <FileText className="w-16 h-16 text-slate-400 mb-4" />
                       <p className="text-lg font-bold text-slate-500 dark:text-slate-400 italic">No invoices found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
