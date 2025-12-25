
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, Package, FileText, Menu, X, Settings as SettingsIcon, ShieldCheck } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import clsx from 'clsx';
import { AppTheme, PlatformMode, ColorScheme } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'New Bill', path: '/billing', icon: ShoppingCart },
  { label: 'Invoices', path: '/invoices', icon: FileText },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'Parties', path: '/parties', icon: Users },
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const profile = useLiveQuery(() => db.settings.get(1));

  // --- OS Detection & Theme Logic ---
  const [activePlatform, setActivePlatform] = useState<'windows' | 'android'>('windows');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (!profile) return;

    // Platform Detection
    if (profile.platformMode === 'auto' || !profile.platformMode) {
      const ua = navigator.userAgent.toLowerCase();
      setActivePlatform(ua.includes('android') ? 'android' : 'windows');
    } else {
      setActivePlatform(profile.platformMode as 'windows' | 'android');
    }

    // Dark Mode Detection
    if (profile.darkMode === 'system' || !profile.darkMode) {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(systemDark);
    } else {
      setIsDark(profile.darkMode === 'dark');
    }
  }, [profile]);

  // Apply Dark Mode Class to HTML/Body
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // --- Style Constants based on Platform ---
  const isWindows = activePlatform === 'windows';

  // Windows 11 Styles (Acrylic, rounded corners, compact)
  const winStyles = {
    bg: isDark ? 'bg-[#202020]' : 'bg-[#f3f3f3]',
    navContainer: isDark ? 'bg-[#2c2c2c]/80 backdrop-blur-xl border-r border-[#383838]' : 'bg-white/80 backdrop-blur-xl border-r border-[#e5e5e5]',
    navItem: (active: boolean) => active 
      ? (isDark ? 'bg-[#3c3c3c] text-blue-400' : 'bg-[#e5f1fb] text-[#005fb8]')
      : (isDark ? 'text-gray-300 hover:bg-[#323232]' : 'text-gray-600 hover:bg-[#f0f0f0]'),
    card: isDark ? 'bg-[#2c2c2c] border-[#383838]' : 'bg-white border-[#e5e5e5]',
    radius: 'rounded-xl', // Windows 11 standard (12px approx)
    font: 'font-sans', // Using system sans (Segoe UI usually)
    headingColor: isDark ? 'text-white' : 'text-[#1a1a1a]',
    subTextColor: isDark ? 'text-[#a0a0a0]' : 'text-[#5e5e5e]',
  };

  // Android 11+ Styles (Material You, large curves, solid colors)
  const androidStyles = {
    bg: isDark ? 'bg-[#121212]' : 'bg-[#fffbff]',
    navContainer: isDark ? 'bg-[#1e1e1e]' : 'bg-[#f3edf7]',
    navItem: (active: boolean) => active 
      ? (isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]')
      : (isDark ? 'text-[#c4c7c5] hover:bg-[#1e1e1e]' : 'text-[#444746] hover:bg-[#f3edf7]'),
    card: isDark ? 'bg-[#1e1e1e] border-none' : 'bg-[#f7f2fa] border-none',
    radius: 'rounded-[28px]', // Material 3 standard
    font: 'font-sans', // Roboto-ish
    headingColor: isDark ? 'text-[#e3e2e6]' : 'text-[#1b1b1f]',
    subTextColor: isDark ? 'text-[#c4c7c5]' : 'text-[#444746]',
  };

  const styles = isWindows ? winStyles : androidStyles;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={clsx("min-h-screen flex transition-colors duration-500 font-sans", styles.bg, isDark ? 'dark' : '')}>
      
      {/* --- Sidebar (Windows) or Drawer (Android Tablet) --- */}
      <aside className={clsx(
        "hidden md:flex flex-col w-72 h-screen sticky top-0 z-40 p-4 gap-2 transition-colors",
        styles.navContainer,
        !isWindows && "shadow-none border-r-0"
      )}>
        <div className="flex items-center gap-3 px-4 py-4 mb-2">
          <div className={clsx("flex items-center justify-center w-10 h-10", isWindows ? "bg-blue-600 rounded-lg text-white shadow-lg" : "bg-blue-200 text-blue-900 rounded-2xl")}>
             <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className={clsx("text-lg font-bold leading-tight", styles.headingColor)}>
              {profile?.companyName || 'Gopi Distributors'}
            </h1>
            <p className={clsx("text-[10px] uppercase tracking-widest font-bold", styles.subTextColor)}>
              {activePlatform === 'windows' ? 'Win11 Enterprise' : 'Android Pro'}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center px-4 py-3 font-medium transition-all duration-200',
                styles.radius,
                styles.navItem(isActive(item.path)),
                isWindows ? "text-sm" : "text-base tracking-wide"
              )}
            >
              <item.icon className={clsx("mr-4", isWindows ? "w-5 h-5" : "w-6 h-6")} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={clsx("p-4 mt-auto text-center border-t", isWindows ? (isDark ? "border-[#383838]" : "border-[#e5e5e5]") : "border-transparent")}>
           <p className={clsx("text-xs font-medium", styles.subTextColor)}>v2.5.0 • {isDark ? 'Dark Mode' : 'Light Mode'}</p>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        
        {/* Mobile Header (Both Platforms) */}
        <div className={clsx("md:hidden flex items-center justify-between p-4 sticky top-0 z-50 backdrop-blur-md", styles.navContainer)}>
           <div className="flex items-center gap-2">
             <ShieldCheck className={clsx("w-6 h-6", isDark ? "text-blue-400" : "text-blue-600")} />
             <span className={clsx("font-bold", styles.headingColor)}>Gopi Dist.</span>
           </div>
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={clsx("p-2 rounded-full", styles.subTextColor)}>
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
            <div className={clsx("absolute right-0 top-0 bottom-0 w-3/4 p-6 shadow-2xl overflow-y-auto", isWindows ? (isDark ? "bg-[#2c2c2c]" : "bg-white") : (isDark ? "bg-[#1e1e1e]" : "bg-[#fffbff]"))} onClick={e => e.stopPropagation()}>
               <div className="space-y-2 mt-12">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={clsx(
                        'flex items-center px-6 py-4 font-bold',
                        styles.radius,
                        styles.navItem(isActive(item.path))
                      )}
                    >
                      <item.icon className="w-6 h-6 mr-4" />
                      {item.label}
                    </Link>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className={clsx("flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-[1920px] mx-auto transition-all", isWindows ? "animate-in fade-in zoom-in-95 duration-300" : "animate-in slide-in-from-bottom-4 duration-500")}>
          {children}
        </main>

        {/* Android Bottom Nav (Mobile Only) */}
        {!isWindows && (
          <div className={clsx("md:hidden fixed bottom-0 left-0 right-0 h-20 flex justify-around items-center border-t z-50", isDark ? "bg-[#1e1e1e] border-[#383838]" : "bg-[#f3edf7] border-slate-200")}>
             {navItems.slice(0, 4).map(item => (
               <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1">
                 <div className={clsx("px-5 py-1 rounded-full transition-colors", isActive(item.path) ? (isDark ? 'bg-[#004a77] text-[#c2e7ff]' : 'bg-[#c2e7ff] text-[#001d35]') : styles.subTextColor)}>
                   <item.icon className="w-6 h-6" />
                 </div>
                 <span className={clsx("text-[10px] font-medium", styles.subTextColor)}>{item.label}</span>
               </Link>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
