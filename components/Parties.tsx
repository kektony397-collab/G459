
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { Party } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Upload, Trash2, Edit2, X, Phone, MapPin, FileText, Loader2, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export const Parties: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  
  // Accurate Search: Split keywords and ensure all match (AND logic)
  const parties = useLiveQuery(
    async () => {
      const allParties = await db.parties.toArray();
      if (!searchTerm.trim()) return allParties.slice(0, 50);

      const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
      return allParties.filter(p => {
        const text = `${p.name} ${p.gstin} ${p.phone} ${p.address}`.toLowerCase();
        return terms.every(term => text.includes(term));
      }).slice(0, 50);
    },
    [searchTerm]
  );

  const { register, handleSubmit, reset, setValue } = useForm<Party>();

  React.useEffect(() => {
    if (editingParty) {
      Object.keys(editingParty).forEach((key) => {
        setValue(key as keyof Party, (editingParty as any)[key]);
      });
    } else {
      reset({ type: 'WHOLESALE' });
    }
  }, [editingParty, setValue, reset]);

  const onSubmit = async (data: Party) => {
    try {
      if (editingParty?.id) {
        await db.parties.update(editingParty.id, data);
        toast.success('Party updated');
      } else {
        await db.parties.add(data);
        toast.success('Party added');
      }
      setIsModalOpen(false);
      setEditingParty(null);
      reset();
    } catch (error) {
      console.error(error);
      toast.error('Error saving party');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this party?')) {
      await db.parties.delete(id);
      toast.success('Party deleted');
    }
  };

  // Robust Excel Import with Fuzzy Matching
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) throw new Error("Empty File");

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const getValue = (row: any, synonyms: string[]) => {
            const keys = Object.keys(row);
            for (const s of synonyms) {
              const target = normalize(s);
              const match = keys.find(k => normalize(k) === target);
              if (match) return row[match];
            }
            return '';
        };

        const partiesToAdd: any[] = data.map((row: any) => ({
          name: String(getValue(row, ['Name', 'Party Name', 'Customer', 'Client']) || 'Unknown'),
          gstin: String(getValue(row, ['GSTIN', 'GST', 'GST No']) || ''),
          address: String(getValue(row, ['Address', 'Addr', 'City']) || ''),
          phone: String(getValue(row, ['Phone', 'Mobile', 'Contact', 'Tel']) || ''),
          email: String(getValue(row, ['Email', 'Mail']) || ''),
          dlNo1: String(getValue(row, ['DL No 1', 'DL1', 'Drug Lic 1', '20B']) || ''),
          dlNo2: String(getValue(row, ['DL No 2', 'DL2', 'Drug Lic 2', '21B']) || ''),
          type: 'WHOLESALE'
        })).filter(p => p.name !== 'Unknown');

        await db.parties.bulkAdd(partiesToAdd);
        toast.success(`Imported ${partiesToAdd.length} parties successfully!`);
      } catch (e) {
        console.error(e);
        toast.error('Import failed. Check format.');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Parties & Customers</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage your wholesale and retail contacts</p>
        </div>
        
        <div className="flex gap-3">
          {isImporting ? (
             <div className="flex items-center px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl font-medium">
               <Loader2 className="w-5 h-5 mr-2 animate-spin" />
               Processing...
             </div>
          ) : (
            <label className="cursor-pointer flex items-center px-5 py-3 bg-white dark:bg-[#2c2c2c] border border-slate-200 dark:border-[#383838] rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#323232] shadow-sm transition-all font-medium">
              <Upload className="w-5 h-5 mr-2" />
              Import Excel
               <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          
          <button 
            onClick={() => { setEditingParty(null); setIsModalOpen(true); }}
            className="flex items-center px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30 transition-all font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Party
          </button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
        <input
          type="text"
          placeholder="Accurate Search (Name, GST, Phone)..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-[#383838] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white dark:bg-[#2c2c2c] dark:text-white shadow-sm transition-all dark:placeholder:text-slate-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parties?.map((party) => (
          <div key={party.id} className="group bg-white dark:bg-[#2c2c2c] rounded-[24px] p-6 shadow-sm border border-slate-100 dark:border-[#383838] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{party.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide inline-block mt-1 ${party.type === 'RETAIL' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                  {party.type || 'WHOLESALE'}
                </span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onClick={() => { setEditingParty(party); setIsModalOpen(true); }} className="p-2 bg-slate-100 dark:bg-[#383838] text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"><Edit2 className="w-4 h-4" /></button>
                 <button onClick={() => handleDelete(party.id!)} className="p-2 bg-slate-100 dark:bg-[#383838] text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {party.gstin && (
                <div className="flex items-center bg-slate-50 dark:bg-[#323232] p-2 rounded-lg">
                   <FileText className="w-4 h-4 mr-2 text-slate-400" />
                   <span className="font-mono font-bold tracking-wide">{party.gstin}</span>
                </div>
              )}
              {party.phone && (
                <div className="flex items-center">
                   <Phone className="w-4 h-4 mr-3 text-slate-400" />
                   {party.phone}
                </div>
              )}
              {party.address && (
                <div className="flex items-start">
                   <MapPin className="w-4 h-4 mr-3 text-slate-400 mt-1" />
                   <span className="line-clamp-2">{party.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-8 border-b border-slate-50 dark:border-[#333]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl">
                   <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingParty ? 'Edit Profile' : 'New Party'}</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Customer Registration</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-[#333] rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Full Name / Firm Name</label>
                    <input {...register('name', {required: true})} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4 font-bold focus:ring-2 focus:ring-blue-500" placeholder="e.g. M/S Pharma Corp" />
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Type</label>
                    <select {...register('type')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4 font-bold appearance-none">
                      <option value="WHOLESALE">Wholesale (B2B)</option>
                      <option value="RETAIL">Retail (B2C)</option>
                    </select>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">GSTIN</label>
                    <input {...register('gstin')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4 font-mono font-bold uppercase" placeholder="24AAAAA0000A1Z5" />
                 </div>

                 <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Billing Address</label>
                    <input {...register('address')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4 font-medium" placeholder="Shop No, Street, City" />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Mobile Contact</label>
                    <input {...register('phone')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4 font-bold" />
                 </div>
                 
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Drug License 1 (20B)</label>
                    <input {...register('dlNo1')} className="w-full bg-slate-50 dark:bg-[#2c2c2c] dark:text-white border-none rounded-2xl p-4 font-mono text-sm" />
                 </div>
              </div>

              <div className="flex justify-end pt-4">
                 <button type="submit" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95">
                   {editingParty ? 'Update Record' : 'Create Record'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
