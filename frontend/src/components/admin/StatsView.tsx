import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import statsService from '../../services/statsService';
import type { DashboardStats } from '../../types';
import useAsync from '../../hooks/useAsync';

export default function StatsView() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const { data, isLoading } = useAsync<DashboardStats>(
    () => statsService.getDashboard(period),
    [period],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Chargement des données statistiques...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-red-400">
        Impossible de charger les données du tableau de bord.
      </div>
    );
  }

  const chartTooltipStyle = {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
    borderRadius: '8px',
    color: '#fff',
  };
  const paymentColors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e'];
  const orderTypeLabels: Record<string, string> = {
    DINE_IN: 'Sur place',
    TAKEOUT: 'À emporter',
    DELIVERY: 'Livraison',
  };

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen text-slate-100">
      {/* En-tête + Filtres */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-slate-400">
            Aperçu des performances de votre établissement
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p === 'today' && "Aujourd'hui"}
              {p === 'week' && '7 derniers jours'}
              {p === 'month' && '30 derniers jours'}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800 border border-slate-700/60 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Chiffre d'Affaires</span>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {data.total_revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA
          </div>
          <span className={`text-xs mt-1 inline-block ${data.revenue_growth_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.revenue_growth_percent >= 0 ? '+' : ''}{data.revenue_growth_percent}% vs période précédente
          </span>
        </div>

        <div className="p-4 bg-slate-800 border border-slate-700/60 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Commandes</span>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {data.total_orders}
          </div>
          <span className="text-xs text-slate-400 mt-1 inline-block">
            Commandes validées
          </span>
        </div>

        <div className="p-4 bg-slate-800 border border-slate-700/60 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Panier Moyen</span>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {data.average_basket.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA
          </div>
          <span className="text-xs text-slate-400 mt-1 inline-block">
            Par commande
          </span>
        </div>

        <div className="p-4 bg-slate-800 border border-slate-700/60 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Affluence Max</span>
          <div className="mt-2 text-2xl font-extrabold text-amber-400">
            {data.peak_hour}
          </div>
          <span className="text-xs text-slate-400 mt-1 inline-block">
            Créneau le plus actif
          </span>
        </div>
        <div className="p-4 bg-slate-800 border border-slate-700/60 rounded-xl">
          <span className="text-xs font-medium text-slate-400">TVA collectée</span>
          <div className="mt-2 text-2xl font-extrabold text-cyan-400">
            {data.total_tax.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA
          </div>
          <span className="text-xs text-slate-400 mt-1 inline-block">Sur les ventes payées</span>
        </div>
        <div className="p-4 bg-slate-800 border border-slate-700/60 rounded-xl">
          <span className="text-xs font-medium text-slate-400">Annulations</span>
          <div className="mt-2 text-2xl font-extrabold text-rose-400">{data.cancelled_orders}</div>
          <span className="text-xs text-slate-400 mt-1 inline-block">Sur la période</span>
        </div>
      </div>

      {/* Section Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graphique de Tendance (Ventes) */}
        <div className="lg:col-span-2 p-5 bg-slate-800 border border-slate-700/60 rounded-xl space-y-4">
          <h2 className="text-base font-semibold text-white">
            Évolution du Chiffre d'Affaires
          </h2>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.sales_chart}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val.toLocaleString('fr-FR')}`}
                />
                <Tooltip 
  contentStyle={chartTooltipStyle}
  formatter={(value: ValueType | undefined) => [
    `${Number(value || 0).toLocaleString('fr-FR')} FCFA`,
    'Ventes'
  ]}
/>
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histogramme (Top Produits) */}
        <div className="p-5 bg-slate-800 border border-slate-700/60 rounded-xl space-y-4">
          <h2 className="text-base font-semibold text-white">Top 4 Produits (Quantités)</h2>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_products} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  width={90}
                />
                <Tooltip 
  contentStyle={chartTooltipStyle}
  formatter={(value: ValueType | undefined) => [
    `${Number(value || 0)} unités`,
    'Vendus'
  ]}
/>
                <Bar 
                  dataKey="sales" 
                  fill="#10b981" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-slate-800 border border-slate-700/60 rounded-xl space-y-4">
          <h2 className="text-base font-semibold text-white">Volume de commandes</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.orders_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: ValueType | undefined) => [`${Number(value || 0)} commandes`, 'Volume']} />
                <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 bg-slate-800 border border-slate-700/60 rounded-xl space-y-4">
          <h2 className="text-base font-semibold text-white">Modes de paiement</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.payment_methods} dataKey="amount" nameKey="method" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {data.payment_methods.map((entry, index) => <Cell key={entry.method} fill={paymentColors[index % paymentColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: ValueType | undefined) => [`${Number(value || 0).toLocaleString('fr-FR')} FCFA`, 'Montant']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 text-xs">
            {data.payment_methods.map((payment, index) => (
              <div key={payment.method} className="flex items-center justify-between text-slate-300"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: paymentColors[index % paymentColors.length] }} />{payment.method}</span><span>{payment.count} paiement(s)</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-slate-800 border border-slate-700/60 rounded-xl space-y-4">
          <h2 className="text-base font-semibold text-white">Chiffre d’affaires par produit</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_products}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} angle={-20} textAnchor="end" height={55} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: ValueType | undefined) => [`${Number(value || 0).toLocaleString('fr-FR')} FCFA`, 'CA']} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 bg-slate-800 border border-slate-700/60 rounded-xl space-y-4">
          <h2 className="text-base font-semibold text-white">Répartition des commandes</h2>
          <div className="space-y-4 pt-3">
            {data.order_types.length === 0 ? <p className="text-sm text-slate-500">Aucune commande sur cette période.</p> : data.order_types.map((orderType) => {
              const percentage = data.total_orders ? Math.round((orderType.count / data.total_orders) * 100) : 0;
              return <div key={orderType.order_type}>
                <div className="flex justify-between text-sm text-slate-300"><span>{orderTypeLabels[orderType.order_type] || orderType.order_type}</span><span>{orderType.count} · {percentage}%</span></div>
                <div className="mt-2 h-2 rounded-full bg-slate-700"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${percentage}%` }} /></div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}