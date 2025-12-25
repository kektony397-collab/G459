
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Party, Product, InvoiceItem, Invoice, CompanyProfile } from '../types';
import { Search, Trash2, Printer, ShoppingBag, Truck, User, TruckIcon, ClipboardList, ShoppingCart, MessageSquare, ShieldCheck } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const profile = useLiveQuery(() => db.settings.get(1));
  const [invoiceType, setInvoiceType] = useState<'WHOLESALE' | 'RETAIL'>('WHOLESALE');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState(''); 
  const [grNo, setGrNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [transport, setTransport] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [partySearch, setPartySearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // --- Fast & Accurate Search Logic ---

  // Party Search: Matches ALL keywords against name, gstin, phone, or address
  const parties = useLiveQuery(async () => {
    if (!partySearch.trim()) return db.parties.limit(10).toArray();

    const all = await db.parties.toArray();
    const terms = partySearch.toLowerCase().split(/\s+/).filter(Boolean);
    
    return all.filter(p => {
      const text = `${p.name} ${p.gstin} ${p.phone} ${p.address}`.toLowerCase();
      return terms.every(term => text.includes(term));
    }).slice(0, 10);
  }, [partySearch]);

  // Product Search: Matches ALL keywords against name, batch, hsn, manufacturer
  const products = useLiveQuery(async () => {
    if (!productSearch.trim()) return db.products.limit(20).toArray();

    const all = await db.products.toArray();
    const terms = productSearch.toLowerCase().split(/\s+/).filter(Boolean);

    return all.filter(p => {
      const text = `${p.name} ${p.batch} ${p.hsn} ${p.manufacturer} ${p.saleRate}`.toLowerCase();
      return terms.every(term => text.includes(term));
    }).slice(0, 50);
  }, [productSearch]);

  // ------------------------------------

  useEffect(() => {
    const genId = async () => {
      const count = await db.invoices.count();
      const typeCode = invoiceType === 'RETAIL' ? 'RET' : 'TI';
      setInvoiceNo(`${typeCode} -${count + 65}`); 
    };
    genId();
  }, [invoiceType]);

  const addItem = (product: Product) => {
    if (items.find(i => i.id === product.id)) {
      toast.warning('Product already added');
      return;
    }

    const gstToUse = profile?.useDefaultGST ? (profile?.defaultGSTRate || 5) : product.gstRate;

    const newItem: InvoiceItem = {
      ...product,
      productId: product.id!,
      quantity: 1,
      freeQuantity: 0,
      oldMrp: product.oldMrp || product.mrp,
      gstRate: gstToUse,
      discountPercent: 0,
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
    };
    setItems([...items, calculateRow(newItem, selectedParty, profile)]);
    setShowProductDropdown(false);
    setProductSearch('');
  };

  const calculateRow = (item: InvoiceItem, party: Party | null, prof: CompanyProfile | undefined): InvoiceItem => {
    const baseAmount = item.saleRate * item.quantity;
    const discountAmount = (baseAmount * item.discountPercent) / 100;
    const taxableValue = baseAmount - discountAmount;
    
    const sellerStateCode = prof?.gstin?.trim().substring(0, 2) || '24';
    const buyerStateCode = party?.gstin?.trim().substring(0, 2) || sellerStateCode;
    
    const isInterState = sellerStateCode !== buyerStateCode;
    const totalTaxRate = item.gstRate;
    const totalTaxAmount = (taxableValue * totalTaxRate) / 100;
    
    let sgst = 0, cgst = 0, igst = 0;
    if (isInterState) {
      igst = totalTaxAmount;
    } else {
      sgst = totalTaxAmount / 2;
      cgst = totalTaxAmount / 2;
    }

    return {
      ...item,
      taxableValue,
      sgstAmount: sgst,
      cgstAmount: cgst,
      igstAmount: igst,
      totalAmount: taxableValue + totalTaxAmount
    };
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    newItems[index] = calculateRow(item, selectedParty, profile);
    setItems(newItems);
  };

  useEffect(() => {
    if (items.length > 0) {
      setItems(items.map(it => calculateRow(it, selectedParty, profile)));
    }
  }, [selectedParty]);

  const totalTaxable = items.reduce((sum, i) => sum + i.taxableValue, 0);
  const totalCGST = items.reduce((sum, i) => sum + i.cgstAmount, 0);
  const totalSGST = items.reduce((sum, i) => sum + i.sgstAmount, 0);
  const totalIGST = items.reduce((sum, i) => sum + i.igstAmount, 0);
  const grandTotal = items.reduce((sum, i) => sum + i.totalAmount, 0);

  const handleSave = async () => {
    if (invoiceType === 'WHOLESALE' && !selectedParty) { toast.error('Select a party'); return; }
    if (items.length === 0) { toast.error('Add items'); return; }

    const invoice: Invoice = {
      invoiceNo, date: new Date(invoiceDate).toISOString(), invoiceType,
      partyId: selectedParty?.id || 0,
      partyName: selectedParty?.name || 'Cash Sale',
      partyGstin: selectedParty?.gstin || '',
      partyAddress: selectedParty?.address || '',
      partyStateCode: selectedParty?.gstin?.substring(0, 2) || '24',
      grNo, vehicleNo, transport, notes,
      items, totalTaxable, totalCGST, totalSGST, totalIGST,
      grandTotal, roundOff: Math.round(grandTotal) - grandTotal,
      status: 'PAID',
    };

    try {
      await (db as any).transaction('rw', [db.invoices, db.products], async () => {
        await db.invoices.add(invoice);
        for (const item of items) {
          const product = await db.products.get(item.productId);
          if (product) {
            await db.products.update(item.productId, { 
              stock: product.stock - (item.quantity + item.freeQuantity)
            });
          }
        }
      });
      toast.success('ORIGINAL Invoice Registered');
      if (window.confirm('Do you want to print the ORIGINAL COPY?')) {
        await generateInvoicePDF(invoice, profile?.invoiceTemplate || 'authentic');
      }
      navigate('/invoices');
    } catch (e) { 
      console.error(e);
      toast.error('Sync failed');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-[#2c2c2c] p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-[#383838]">
         <div className="flex bg-slate-100 dark:bg-[#1e1e1e] p-1.5 rounded-2xl">
            <button onClick={() => setInvoiceType('WHOLESALE')} className={`flex items-center px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${invoiceType === 'WHOLESALE' ? 'bg-white dark:bg-[#2c2c2c] shadow-lg text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}><Truck className="w-4 h-4 mr-2" /> Wholesale</button>
            <button onClick={() => setInvoiceType('RETAIL')} className={`flex items-center px-8 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${invoiceType === 'RETAIL' ? 'bg-white dark:bg-[#2c2c2c] shadow-lg text-green-600 dark:text-green-400' : 'text-slate-400'}`}><ShoppingBag className="w-4 h-4 mr-2" /> Retail</button>
         </div>
         <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Serial Identifier</div>
            <div className="text-3xl font-black font-mono text-slate-800 dark:text-white">{invoiceNo}</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
           <div className="bg-white dark:bg-[#2c2c2c] p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-[#383838] grid grid-cols-1 md:grid-cols-2 gap-8 relative z-30">
              <div className="space-y-5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Associate (Party)</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-[#1e1e1e] rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 transition-all font-bold text-slate-800 dark:text-white" 
                    placeholder="Identify Purchaser..." 
                    value={selectedParty ? selectedParty.name : partySearch} 
                    onChange={(e) => {setPartySearch(e.target.value); setSelectedParty(null); setShowPartyDropdown(true);}} 
                  />
                  {showPartyDropdown && !selectedParty && partySearch && (
                    <div className="absolute top-full left-0 w-full mt-4 bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#383838] z-50 overflow-hidden ring-4 ring-blue-50 dark:ring-blue-900/20">
                      {parties?.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => {setSelectedParty(p); setShowPartyDropdown(false); setPartySearch('');}} 
                          className="p-5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-slate-50 dark:border-[#2c2c2c] last:border-0"
                        >
                          <div className="font-black text-slate-800 dark:text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{p.address} | GST: {p.gstin || 'URD'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {selectedParty && (
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl text-[10px] space-y-1.5 border border-blue-100 dark:border-blue-800 animate-in slide-in-from-top-4">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300"><span><span className="font-black text-blue-800 dark:text-blue-400 uppercase">GST:</span> {selectedParty.gstin || 'UNREGISTERED'}</span> <span><span className="font-black text-blue-800 dark:text-blue-400 uppercase">ST_CODE:</span> {selectedParty.gstin?.substring(0,2) || '24'}</span></div>
                    <div className="text-slate-700 dark:text-slate-300"><span className="font-black text-blue-800 dark:text-blue-400 uppercase">OFFICE:</span> {selectedParty.address}</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch & Logistics</label></div>
                <div className="relative"><TruckIcon className="absolute left-4 top-4 w-4 h-4 text-slate-400" /><input type="text" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} className="w-full pl-10 py-3.5 bg-slate-50 dark:bg-[#1e1e1e] dark:text-white rounded-2xl text-xs border-2 border-transparent focus:border-blue-100 outline-none font-bold" placeholder="Vehicle ID" /></div>
                <div className="relative"><ClipboardList className="absolute left-4 top-4 w-4 h-4 text-slate-400" /><input type="text" value={grNo} onChange={e => setGrNo(e.target.value)} className="w-full pl-10 py-3.5 bg-slate-50 dark:bg-[#1e1e1e] dark:text-white rounded-2xl text-xs border-2 border-transparent focus:border-blue-100 outline-none font-bold" placeholder="GR Identification" /></div>
                <div className="col-span-2"><input type="text" value={transport} onChange={e => setTransport(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-[#1e1e1e] dark:text-white rounded-2xl text-xs border-2 border-transparent focus:border-blue-100 outline-none font-bold uppercase" placeholder="Carrier Agency Name" /></div>
              </div>
           </div>

           <div className="bg-white dark:bg-[#2c2c2c] rounded-[3rem] shadow-sm border border-slate-100 dark:border-[#383838] overflow-hidden relative z-20">
              <div className="p-6 border-b border-slate-100 dark:border-[#383838]">
                <div className="relative">
                  <Search className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-[#1e1e1e] rounded-2xl outline-none focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/20 transition-all font-bold dark:text-white" 
                    placeholder="Query medical inventory for line entry..." 
                    value={productSearch} 
                    onChange={e => {setProductSearch(e.target.value); setShowProductDropdown(true);}} 
                  />
                  {showProductDropdown && productSearch && (
                    <div className="absolute top-full left-0 w-full mt-4 bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-2xl border border-slate-100 dark:border-[#383838] z-50 max-h-[400px] overflow-y-auto ring-4 ring-blue-50 dark:ring-blue-900/20">
                      {products?.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => addItem(p)} 
                          className="p-5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-slate-50 dark:border-[#2c2c2c] last:border-0 flex justify-between items-center group"
                        >
                          <div>
                            <div className="font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{p.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Batch: {p.batch} | Exp: {p.expiry} | HSN: {p.hsn}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-blue-600 dark:text-blue-400">₹{p.saleRate.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400 font-bold">STOCK: {p.stock}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 dark:bg-[#1e1e1e] font-black uppercase text-slate-400 tracking-widest text-[9px] whitespace-nowrap">
                    <tr><th className="p-5">Inventory Description</th><th className="p-3">Batch</th><th className="p-3">MRP</th><th className="p-3 text-center">Qty</th><th className="p-3 text-center">Fr</th><th className="p-3">Rate</th><th className="p-3 text-center">Disc%</th><th className="p-3 text-center">GST%</th><th className="p-5 text-right">Net</th><th className="p-3"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-[#383838]">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#323232] transition-colors">
                        <td className="p-5 font-black text-slate-800 dark:text-white max-w-[180px] truncate">{item.name}</td>
                        <td className="p-3"><input type="text" className="w-20 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#383838] dark:text-white rounded-lg p-1.5 font-mono font-bold uppercase text-[10px]" value={item.batch} onChange={e => updateItem(idx, 'batch', e.target.value)} /></td>
                        <td className="p-3"><input type="number" step="0.01" className="w-16 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#383838] dark:text-white rounded-lg p-1.5 text-[10px] font-bold" value={item.mrp} onChange={e => updateItem(idx, 'mrp', parseFloat(e.target.value)||0)} /></td>
                        <td className="p-3 text-center"><input type="number" className="w-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-1.5 font-black text-center text-[11px] text-blue-600 dark:text-blue-400" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value)||0)} /></td>
                        <td className="p-3 text-center"><input type="number" className="w-10 bg-slate-50 dark:bg-[#1e1e1e] rounded-lg p-1.5 text-center text-[10px] font-bold text-slate-400" value={item.freeQuantity} onChange={e => updateItem(idx, 'freeQuantity', parseInt(e.target.value)||0)} /></td>
                        <td className="p-3"><input type="number" step="0.01" className="w-20 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#383838] dark:text-white rounded-lg p-1.5 text-[10px] font-bold" value={item.saleRate} onChange={e => updateItem(idx, 'saleRate', parseFloat(e.target.value)||0)} /></td>
                        <td className="p-3 text-center"><input type="number" className="w-10 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#383838] dark:text-white rounded-lg p-1.5 text-center text-[10px] font-bold" value={item.discountPercent} onChange={e => updateItem(idx, 'discountPercent', parseFloat(e.target.value)||0)} /></td>
                        <td className="p-3 text-center font-black text-slate-500">{item.gstRate}%</td>
                        <td className="p-5 text-right font-black text-slate-900 dark:text-white">₹{item.totalAmount.toFixed(2)}</td>
                        <td className="p-3 text-center"><button onClick={() => setItems(items.filter((_,i)=>i!==idx))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-24 text-center">
                          <div className="flex flex-col items-center opacity-10">
                            <ShoppingCart className="w-20 h-20 mb-4 text-slate-500 dark:text-white" />
                            <p className="text-xl font-black uppercase tracking-widest text-slate-500 dark:text-white">Entry Buffer Empty</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-[#1e1e1e] border-t border-slate-100 dark:border-[#383838]">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Custom ORIGINAL COPY footnotes or instructions..." 
                    className="bg-transparent border-none outline-none w-full font-bold text-slate-600 dark:text-slate-400 text-sm"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="bg-slate-900 dark:bg-black text-white p-8 rounded-[3.5rem] shadow-2xl space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
              <div className="flex justify-between items-center opacity-40 text-[9px] uppercase tracking-[0.3em] font-black"><span>Consolidated Taxable</span><span>₹{totalTaxable.toFixed(2)}</span></div>
              <div className="flex justify-between items-center opacity-40 text-[9px] uppercase tracking-[0.3em] font-black"><span>GST Breakdown</span><span>₹{(totalCGST + totalSGST + totalIGST).toFixed(2)}</span></div>
              <div className="h-px bg-white/5 my-4"></div>
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">Total Payable Amount</div>
                <div className="text-5xl font-black text-green-400 tracking-tighter">₹{Math.round(grandTotal).toLocaleString('en-IN')}</div>
              </div>
              <div className="text-[8px] text-white/20 text-center font-bold uppercase tracking-[0.2em] pt-2">Original Document Confirmation Required</div>
              <button 
                onClick={handleSave} 
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-4 mt-6 shadow-2xl active:scale-95 group"
              >
                <Printer className="w-7 h-7 group-hover:rotate-12 transition-transform" /> SAVE & PRINT
              </button>
           </div>
           
           <div className="bg-white dark:bg-[#2c2c2c] p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-[#383838]">
              <label className="text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-widest">Document Registry Date</label>
              <input 
                type="date" 
                value={invoiceDate} 
                onChange={e => setInvoiceDate(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-[#1e1e1e] dark:text-white p-4 rounded-2xl outline-none font-black text-slate-800 border-2 border-transparent focus:border-blue-500" 
              />
           </div>

           <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 p-8 rounded-[2.5rem] shadow-inner">
             <h4 className="font-black text-blue-800 dark:text-blue-400 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
               <ShieldCheck className="w-4 h-4" /> Professional Check
             </h4>
             <ul className="text-[10px] space-y-3 text-blue-600/80 dark:text-blue-300 font-bold uppercase tracking-wide leading-relaxed">
               <li>• Verify Batch & Expiry precision before locking.</li>
               <li>• Original Copy serves as the final legal tender.</li>
               <li>• Free units bypass taxable calculation.</li>
               <li>• Rounding applied to the nearest rupee.</li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
};
