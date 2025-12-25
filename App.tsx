
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { Parties } from './components/Parties';
import { InvoiceForm } from './components/InvoiceForm';
import { InvoiceList } from './components/InvoiceList';
import { Settings } from './components/Settings';
import { seedDatabase, db } from './db';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Open the database connection before seeding and initialization
        // This ensures properties like 'open' and 'version' are available on the db instance
        await (db as any).open();
        await seedDatabase();
        setIsReady(true);
      } catch (err) {
        console.error("Critical System Failure:", err);
      }
    };
    initApp();
  }, []);

  if (!isReady) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-white rounded-3xl shadow-2xl animate-bounce">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-black text-slate-800 tracking-tighter">GOPI DISTRIBUTORS</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">W.B.S. Engine Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/billing" element={<InvoiceForm />} />
          <Route path="/invoices" element={<InvoiceList />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" expand={true} richColors />
    </HashRouter>
  );
};

export default App;
