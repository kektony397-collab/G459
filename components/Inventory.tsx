
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { db } from '../db';
import { Product, GSTRate } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Upload, Trash2, Edit2, X, Loader2, Database, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';

export const Inventory: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [stats, setStats] = useState({ processed: 0, total: 0 });
  
  // High-Performance Search Logic:
  // 1. Split search term into keywords
  // 2. Use simple filter if no search, else ensure ALL keywords are present (AND logic)
  const products = useLiveQuery(
    async () => {
      const allProducts = await db.products.toArray(); // Get all to memory (Dexie is fast enough for <50k in memory)
      if (!searchTerm.trim()) return allProducts.slice(0, 100);

      const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      
      const filtered = allProducts.filter(p => {
        const text = `${p.name} ${p.batch} ${p.hsn} ${p.manufacturer}`.toLowerCase();
        return terms.every(term => text.includes(term));
      });
      
      return filtered.slice(0, 100); // Limit render
    },
    [searchTerm]
  );

  const { register, handleSubmit, reset, setValue } = useForm<Product>();

  useEffect(() => {
    if (editingProduct) {
      Object.keys(editingProduct).forEach((key) => {
        setValue(key as keyof Product, (editingProduct as any)[key]);
      });
    } else {
      reset({ gstRate: GSTRate.GST_12 });
    }
  }, [editingProduct, setValue, reset]);

  const onSubmit = async (data: Product) => {
    try {
      const formattedData = {
        ...data,
        mrp: Number(data.mrp),
        oldMrp: Number(data.oldMrp || data.mrp),
        purchaseRate: Number(data.purchaseRate),
        saleRate: Number(data.saleRate),
        stock: Number(data.stock),
        gstRate: Number(data.gstRate),
      };

      if (editingProduct?.id) {
        await db.products.update(editingProduct.id, formattedData);
        toast.success('Product updated');
      } else {
        await db.products.add(formattedData);
        toast.success('Product added');
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (e) { toast.error('Error saving product'); }
  };

  // Improved Fuzzy Column Mapping
  const getCellValue = (row: any, synonyms: string[]): any => {
    const keys = Object.keys(row);
    // Remove special chars and lowercase for comparison
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const s of synonyms) {
      const target = normalize(s);
      const match = keys.find(k => normalize(k) === target);
      if (match) return row[match];
    }
    return null;
  };

  const cleanNumber = (val: any, fallback = 0): number => {
    if (val === null || val === undefined) return fallback;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        const workbook = XLSX.read(dataBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          setIsImporting(false);
          return toast.error('Excel file is empty');
        }

        setStats({ processed: 0, total: jsonData.length });

        const CHUNK_SIZE = 500;
        const totalRows = jsonData.length;
        
        for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
          const chunk = jsonData.slice(i, i + CHUNK_SIZE).map((row: any) => {
            const mrp = cleanNumber(getCellValue(row, ['MRP', 'Price', 'Retail Price']));
            
            return {
              name: String(getCellValue(row, ['Name', 'Item Name', 'Product', 'Description', 'Particulars']) || 'New Item'),
              batch: String(getCellValue(row, ['Batch', 'BatchNo', 'Lot']) || 'N/A'),
              expiry: String(getCellValue(row, ['Expiry', 'Exp', 'Exp Date']) || '2025-12-31'),
              hsn: String(getCellValue(row, ['HSN', 'HSN Code']) || '3004'),
              gstRate: cleanNumber(getCellValue(row, ['GST', 'Tax', 'GST Rate']), 12),
              mrp: mrp,
              oldMrp: mrp,
              purchaseRate: cleanNumber(getCellValue(row, ['Purchase Rate', 'Rate', 'Cost'])),
              saleRate: cleanNumber(getCellValue(row, ['Sale Rate', 'Selling Price', 'Rate']), mrp), // Default sale rate to MRP if missing
              stock: cleanNumber(getCellValue(row, ['Stock', 'Qty', 'Quantity', 'Closing Stock'])),
              manufacturer: String(getCellValue(row, ['Manufacturer', 'Mfg', 'Company']) || ''),
            };
          });

          await db.products.bulkAdd(chunk);
          
          const processedCount = Math.min(i + CHUNK_SIZE, totalRows);
          setImportProgress(Math.round((processedCount / totalRows) * 100));
          setStats(s => ({ ...s, processed: processedCount }));
          await new Promise(r => setTimeout(r, 0));
        }
        
        toast.success(`Imported ${totalRows} products successfully`);
      } catch (err) {
        console.error(err);
        toast.error('Import failed. Please check Excel format.');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#2c2c2c] p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-[#383838]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
             <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventory Dashboard</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Indexed & Searchable</p>
          </div>
        </div>
        <div className="flex gap-2">
          <label className={clsx(
            "cursor-pointer flex items-center px-4 py-2.5 rounded-xl transition-all font-bold",
            isImporting ? "bg-slate-100 dark:bg-[#383838] text-slate-400 cursor-not-allowed" : "bg-slate-100 dark:bg-[#383838] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#424242]"
          )}>
            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {isImporting ? 'Processing...' : 'Bulk Import'}
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={isImporting} />
          </label>
          <button 
            disabled={isImporting}
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} 
            className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all font-bold disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </button>
        </div>
      </div>

      {isImporting && (
        <div className="bg-white dark:bg-[#2c2c2c] p-6 rounded-[24px] shadow-xl border border-blue-100 dark:border-blue-900 animate-in slide-in-from-top-4 duration-300">
           <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Processing Data...</span>
              </div>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">{importProgress}%</span>
           </div>
           <div className="w-full bg-slate-100 dark:bg-[#383838] rounded-full h-4 overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300 ease-out" style={{ width: `${importProgress}%` }}></div>
           </div>
        </div>
      )}

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Fast Accurate Search (Name, Batch, HSN)..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#2c2c2c] dark:text-white shadow-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-[#2c2c2c] rounded-[24px] shadow-sm border border-slate-100 dark:border-[#383838] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#323232] border-b border-slate-100 dark:border-[#383838] text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-5">Product Details</th>
                <th className="px-4 py-5">Batch & Exp</th>
                <th className="px-4 py-5 text-right">Inventory</th>
                <th className="px-4 py-5 text-right">Pricing (MRP / Rate)</th>
                <th className="px-6 py-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-[#383838]">
              {products?.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#323232] transition-colors text-sm">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-white">{p.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-tighter">HSN: {p.hsn}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-slate-600 dark:text-slate-300 font-mono text-xs">{p.batch}</div>
                    <div className="text-[10px] text-slate-400">{p.expiry}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={clsx(
                      "px-2 py-1 rounded-lg font-black text-xs", 
                      p.stock < 100 ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    )}>
                      {p.stock.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-xs text-slate-400 line-through">₹{p.mrp.toFixed(2)}</div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">₹{p.saleRate.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-2">
                    <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => db.products.delete(p.id!)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit Modal Omitted for Brevity - follows same theme logic */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-8 border-b border-slate-50 dark:border-[#333]">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{editingProduct ? 'Edit Profile' : 'New Product Profile'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-[#333] rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Product Name</label>
                    <input {...register('name', {required: true})} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4 font-bold" />
                 </div>
                 {/* Replicated fields for dark mode */}
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">HSN</label>
                    <input {...register('hsn')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Batch</label>
                    <input {...register('batch')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Expiry</label>
                    <input {...register('expiry')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4" />
                 </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Stock</label>
                    <input type="number" {...register('stock')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">MRP</label>
                    <input type="number" step="0.01" {...register('mrp')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Sale Rate</label>
                    <input type="number" step="0.01" {...register('saleRate')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4" />
                 </div>
               </div>
               <div className="flex justify-end pt-6">
                 <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">Save Changes</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
