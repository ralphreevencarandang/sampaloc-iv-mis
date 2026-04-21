"use client";

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { 
  BadgeCheck, 
  FileText, 
  LayoutDashboard, 
  Megaphone, 
  Scale, 
  ShieldAlert, 
  UserCheck, 
  Users,
  Loader2,
  AlertCircle
} from 'lucide-react';
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type DashboardStats = {
  totalResidents: number;
  totalVoters: number;
  genderDistribution: {
    male: number;
    female: number;
  };
  ageGroups: {
    minor: number;
    teen: number;
    adult: number;
  };
  totalVawc: number;
  totalBlotters: number;
  totalDocumentRequests: number;
  activeAnnouncements: number;
  barangayOfficials: number;
};

const COLORS = ['#3b82f6', '#ec4899']; // Blue, Pink for gender
const BAR_COLORS = ['#fbbf24', '#f97316', '#8b5cf6']; // Minor, Teen, Adult colors

function SkeletonLoader() {
  return (
    <div className="space-y-8 animate-pulse text-transparent">
      {/* Header Skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-slate-200" />
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-md bg-slate-200" />
          <div className="h-4 w-48 rounded-md bg-slate-200" />
        </div>
      </div>
      
      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-[96px] rounded-[24px] bg-slate-200" />
        ))}
      </div>
      
      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-[400px] rounded-[28px] bg-slate-200" />
        <div className="h-[400px] rounded-[28px] bg-slate-200" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await axios.get('/api/dashboard/stats');
      return response.data;
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 px-6 py-5 text-rose-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="flex-1">
            <h3 className="text-base font-semibold">Unable to load dashboard metrics</h3>
            <p className="mt-1 text-sm text-rose-800">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
            >
              <Loader2 className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Residents', value: data?.totalResidents || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Registered Voters', value: data?.totalVoters || 0, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'VAWC Cases', value: data?.totalVawc || 0, icon: ShieldAlert, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Blotter Records', value: data?.totalBlotters || 0, icon: Scale, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Doc Requests', value: data?.totalDocumentRequests || 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Announcements', value: data?.activeAnnouncements || 0, icon: Megaphone, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Barangay Officials', value: data?.barangayOfficials || 0, icon: BadgeCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const genderData = [
    { name: 'Male', value: data?.genderDistribution.male || 0 },
    { name: 'Female', value: data?.genderDistribution.female || 0 },
  ];

  const ageData = [
    { name: 'Minor (0-12)', count: data?.ageGroups.minor || 0 },
    { name: 'Teen (13-17)', count: data?.ageGroups.teen || 0 },
    { name: 'Adult (18+)', count: data?.ageGroups.adult || 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
          <LayoutDashboard className="h-6 w-6 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600">Overview of the Sampaloc IV management system</p>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>
              <kpi.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gender Demographics */}
        <div className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Gender Distribution</h2>
          <div className="relative mt-4 flex min-h-[320px] w-full flex-1 items-center justify-center -ml-4">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                   {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [value, 'Residents']}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Demographics */}
        <div className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-slate-900 border-b border-slate-100 pb-4">Age Demographics</h2>
          <div className="relative mt-4 flex min-h-[320px] w-full flex-1 items-center justify-center">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={ageData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [value, 'Residents']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}