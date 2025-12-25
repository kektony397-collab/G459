
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { FileText, Printer, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import clsx from 'clsx';

export const InvoiceList: React.FC = () => {
  const invoices = useLiveQuery(() => db.invoices.reverse().toArray());
  const profile = useLiveQuery(() => db.settings.get(1));

  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices?.filter(inv => inv.date.startsWith(todayStr)) || [];
  const totalToday = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Invoice History</h2>
          <p className="text-sm text-slate-500">Manage and reprint your wholesale bills</p>
        </div>
      </div>

      {/* Finishing Detail: Daily Analytics Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Sales</p>
            <h3 className="text-xl font-black text-slate-800">₹{totalToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bills Generated</p>
            <h3 className="text-xl font-black text-slate-800">{todayInvoices.length} Invoices</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Life Time Total</p>
            <h3 className="text-xl font-black text-slate-800">₹{(invoices?.reduce((s,i) => s + i.grandTotal, 0) || 0).toLocaleString('en-IN')}</h3>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">Date & Time</th>
                <th className="px-6 py-5">Invoice No</th>
                <th className="px-6 py-5">Party Name</th>
                <th className="px-6 py-5 text-right">Items</th>
                <th className="px-6 py-5 text-right">Grand Total</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices?.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors text-sm">
                  <td className="px-6 py-4 text-slate-600">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-slate-400" />
                       {new Date(inv.date).toLocaleDateString('en-GB')}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-blue-600">
                    {inv.invoiceNo}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {inv.partyName}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-500">{inv.items.length} ITMS</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => generateInvoicePDF(inv, profile?.invoiceTemplate)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all font-bold text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Reprint Original
                    </button>
                  </td>
                </tr>
              ))}
              {invoices?.length === 0 && (
                <tr><td colSpan={6} className="text-center py-20 text-slate-400 italic">No invoices generated yet. Create your first bill in the 'New Bill' section.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
