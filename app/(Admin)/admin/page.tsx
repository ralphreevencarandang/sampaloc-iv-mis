import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg">
          <LayoutDashboard className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600">Welcome to the Sampaloc IV Admin Panel</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Residents', value: '10,000+', color: 'blue' },
          { label: 'Active Announcements', value: '12', color: 'emerald' },
          { label: 'Documents', value: '245', color: 'purple' },
          { label: 'Pending Tasks', value: '8', color: 'orange' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-white rounded-lg p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}
          >
            <p className="text-slate-600 text-sm font-medium mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome Admin!</h2>
        <p className="text-blue-50">
          Use the sidebar navigation to manage barangay officials, documents, residents, and other administrative tasks.
        </p>
      </div>
    </div>
  );
}