

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { db } from '../db';
import { CompanyProfile, AppTheme, PlatformMode, ColorScheme } from '../types';
import { Save, Building2, Palette, Monitor, Smartphone, Moon, Sun, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const { register, handleSubmit, setValue, watch } = useForm<CompanyProfile>();
  const currentPlatform = watch('platformMode');
  const currentDarkMode = watch('darkMode');

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await db.settings.get(1); 
      if (settings) {
        Object.keys(settings).forEach((key) => {
          setValue(key as keyof CompanyProfile, (settings as any)[key]);
        });
      }
    };
    loadSettings();
  }, [setValue]);

  const onSubmit = async (data: CompanyProfile) => {
    try {
      await db.settings.put({ ...data, id: 1 });
      toast.success('System Preferences Updated');
      // Small delay to allow db write before reload
      setTimeout(() => window.location.reload(), 500); 
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
        <div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">System Configuration</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage Identity, OS Appearance, and Behavior</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* --- OS & Appearance Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white dark:bg-[#2c2c2c] rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-[#383838]">
             <div className="flex items-center gap-3 mb-6">
               <Palette className="w-6 h-6 text-blue-600" />
               <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Operating System Mode</h3>
             </div>
             
             <div className="grid grid-cols-3 gap-4">
               <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentPlatform === 'windows' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-gray-700'}`}>
                 <input type="radio" {...register('platformMode')} value="windows" className="hidden" />
                 <Monitor className="w-8 h-8 mb-2 text-slate-700 dark:text-slate-300" />
                 <span className="text-xs font-bold uppercase text-slate-500">Windows 11</span>
               </label>
               
               <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentPlatform === 'android' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-gray-700'}`}>
                 <input type="radio" {...register('platformMode')} value="android" className="hidden" />
                 <Smartphone className="w-8 h-8 mb-2 text-slate-700 dark:text-slate-300" />
                 <span className="text-xs font-bold uppercase text-slate-500">Android 11</span>
               </label>

               <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentPlatform === 'auto' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-gray-700'}`}>
                 <input type="radio" {...register('platformMode')} value="auto" className="hidden" />
                 <ShieldCheck className="w-8 h-8 mb-2 text-slate-700 dark:text-slate-300" />
                 <span className="text-xs font-bold uppercase text-slate-500">Auto Detect</span>
               </label>
             </div>
          </section>

          <section className="bg-white dark:bg-[#2c2c2c] rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-[#383838]">
             <div className="flex items-center gap-3 mb-6">
               <Moon className="w-6 h-6 text-purple-600" />
               <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Color Scheme</h3>
             </div>
             
             <div className="grid grid-cols-3 gap-4">
               <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentDarkMode === 'light' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 dark:border-gray-700'}`}>
                 <input type="radio" {...register('darkMode')} value="light" className="hidden" />
                 <Sun className="w-8 h-8 mb-2 text-slate-700 dark:text-slate-300" />
                 <span className="text-xs font-bold uppercase text-slate-500">Light</span>
               </label>
               
               <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentDarkMode === 'dark' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 dark:border-gray-700'}`}>
                 <input type="radio" {...register('darkMode')} value="dark" className="hidden" />
                 <Moon className="w-8 h-8 mb-2 text-slate-700 dark:text-slate-300" />
                 <span className="text-xs font-bold uppercase text-slate-500">Dark</span>
               </label>

               <label className={`cursor-pointer flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentDarkMode === 'system' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 dark:border-gray-700'}`}>
                 <input type="radio" {...register('darkMode')} value="system" className="hidden" />
                 <Monitor className="w-8 h-8 mb-2 text-slate-700 dark:text-slate-300" />
                 <span className="text-xs font-bold uppercase text-slate-500">System</span>
               </label>
             </div>
          </section>
        </div>

        {/* --- Original Form Content --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white dark:bg-[#2c2c2c] rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-[#383838]">
              <div className="flex items-center gap-3 mb-8"><Building2 className="w-6 h-6 text-blue-600" /><h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Identity Details</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Company Legal Name</label>
                  <input {...register('companyName', { required: true })} className="w-full rounded-2xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-6 py-4 font-bold text-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">GSTIN Identification</label>
                  <input {...register('gstin')} className="w-full rounded-2xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-6 py-4 font-mono font-bold text-blue-600" />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Customer Support Phone</label>
                  <input {...register('phone')} className="w-full rounded-2xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-6 py-4 font-bold" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Registered Address</label>
                  <input {...register('addressLine1')} className="w-full rounded-2xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-6 py-4 font-medium mb-2" placeholder="Line 1" />
                  <input {...register('addressLine2')} className="w-full rounded-2xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-6 py-4 font-medium" placeholder="Line 2" />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white dark:bg-[#2c2c2c] rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-[#383838]">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Judicial Jurisdiction</label>
                  <input {...register('jurisdiction')} className="w-full rounded-xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-4 py-3 font-bold" placeholder="e.g. Ahmedabad" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Bank Name</label>
                  <input {...register('bankName')} className="w-full rounded-xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-4 py-3 font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Account No</label>
                  <input {...register('bankAccNo')} className="w-full rounded-xl bg-slate-50 dark:bg-[#1e1e1e] dark:text-white border-none px-4 py-3 font-mono" />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex justify-center md:justify-end sticky bottom-4 z-50">
          <button type="submit" className="flex items-center px-12 py-5 bg-blue-600 text-white font-black text-lg rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all ring-8 ring-white/80 dark:ring-[#121212]/80">
            <Save className="w-6 h-6 mr-3" /> APPLY & REBOOT
          </button>
        </div>
      </form>
    </div>
  );
};