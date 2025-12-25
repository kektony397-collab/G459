import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { DashboardStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Package, AlertTriangle, FileText } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalInvoices: 0,
    lowStockItems: 0,
    expiringSoonItems: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const invoices = await db.invoices.toArray();
      const products = await db.products.toArray();

      const totalSales = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const totalInvoices = invoices.length;
      
      const lowStockItems = products.filter(p => p.stock < 50).length; // Threshold 50
      
      const today = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(today.getMonth() + 3);
      
      const expiringSoonItems = products.filter(p => {
        const expDate = new Date(p.expiry);
        return expDate > today && expDate < threeMonthsFromNow;
      }).length;

      setStats({ totalSales, totalInvoices, lowStockItems, expiringSoonItems });

      // Prepare chart data (Sales by Month for last 6 months)
      const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
          name: d.toLocaleString('default', { month: 'short' }),
          month: d.getMonth(),
          year: d.getFullYear(),
          sales: 0
        };
      });

      invoices.forEach(inv => {
        const d = new Date(inv.date);
        const monthEntry = last6Months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
        if (monthEntry) {
          monthEntry.sales += inv.grandTotal;
        }
      });

      setChartData(last6Months);
    };

    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center">
      <div className={`p-4 rounded-full ${color} bg-opacity-10 mr-4`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Sales" value={`₹${stats.totalSales.toLocaleString()}`} icon={TrendingUp} color="bg-green-600" />
        <StatCard title="Total Invoices" value={stats.totalInvoices} icon={FileText} color="bg-blue-600" />
        <StatCard title="Low Stock Items" value={stats.lowStockItems} icon={Package} color="bg-orange-500" />
        <StatCard title="Expiring Soon" value={stats.expiringSoonItems} icon={AlertTriangle} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4">Sales Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Sales']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold mb-4">Monthly Trend</h3>
             <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};