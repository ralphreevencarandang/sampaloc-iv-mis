'use client';
import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Briefcase, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  FileText,
  Megaphone,
  Scale,
  Shield,
  Clock
} from 'lucide-react';

// --- Mock Data based on Official Schema ---
const MOCK_OFFICIAL = {
  id: "cuid98765off0001xyz",
  officialProfile: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=400",
  firstName: "Roberto",
  lastName: "Mendoza",
  middleName: "Alvarez",
  email: "roberto.mendoza@barangay.gov.ph",
  isActive: true,
  position: "Barangay Captain",
  termStart: "2023-12-01T00:00:00Z",
  termEnd: "2026-11-30T00:00:00Z",
  // Mock aggregations for the relationship fields in the schema
  _count: {
    announcements: 24,
    blottersHandled: 156,
    requestsApproved: 892
  }
};

// --- Helper Components ---
const Card = ({ children, title, icon: Icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
    {title && (
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
        {Icon && <Icon className="w-5 h-5 text-[#027032]" />}
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const InfoItem = ({ label, value, colSpan = 1 }) => (
  <div className={`col-span-1 md:col-span-${colSpan}`}>
    <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
    <dd className="text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100 min-h-[40px] flex items-center">
      {value || <span className="text-gray-400 italic">Not provided</span>}
    </dd>
  </div>
);

const StatusBadge = ({ isActive }) => {
  return isActive ? (
    <span className="px-3 py-1 text-sm font-medium rounded-full border bg-green-100 text-green-800 border-green-200 flex items-center gap-1.5 w-fit">
      <CheckCircle2 className="w-4 h-4" /> Active Term
    </span>
  ) : (
    <span className="px-3 py-1 text-sm font-medium rounded-full border bg-gray-100 text-gray-800 border-gray-200 flex items-center gap-1.5 w-fit">
      <XCircle className="w-4 h-4" /> Inactive
    </span>
  );
};

export default function page() {
  const [official] = useState(MOCK_OFFICIAL);
  const [imageError, setImageError] = useState(false);

  const fullName = `${official.firstName} ${official.middleName ? official.middleName.charAt(0) + '.' : ''} ${official.lastName}`;

  // Format dates safely
  const formatDate = (dateString) => {
    if (!dateString) return "Present";
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Official Profile Summary */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <div className="flex flex-col items-center text-center">
                {/* Profile Image with Fallback */}
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg mb-4 overflow-hidden bg-gray-100 flex items-center justify-center relative">
                  {official.officialProfile && !imageError ? (
                    <img 
                      src={official.officialProfile} 
                      alt={fullName}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-1">{fullName}</h2>
                <div className="flex items-center gap-1.5 text-[#027032] font-medium mb-3">
                  <Shield className="w-4 h-4" />
                  <span>{official.position}</span>
                </div>
                
                <div className="w-full border-t border-gray-100 pt-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Official ID</span>
                    <span className="text-sm font-mono text-gray-600">{official.id.slice(-8).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status</span>
                    <StatusBadge isActive={official.isActive} />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Contact Information" icon={Mail}>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 break-all">{official.email}</p>
                    <p className="text-xs text-gray-500">Official Email Address</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Detailed Information & Stats */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Identity Information */}
            <Card title="Identity Information" icon={User}>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <InfoItem label="First Name" value={official.firstName} />
                <InfoItem label="Middle Name" value={official.middleName} />
                <InfoItem label="Last Name" value={official.lastName} />
              </dl>
            </Card>

            {/* Term Information */}
            <Card title="Service Term Details" icon={Briefcase}>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-1 md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 mb-1">Designated Position</dt>
                  <dd className="text-lg font-bold text-[#027032] bg-[#027032]/10 px-4 py-2 rounded-md inline-flex items-center gap-2 border border-[#027032]/20">
                    <Shield className="w-5 h-5" /> {official.position}
                  </dd>
                </div>
                
                <div className="col-span-1">
                  <dt className="text-sm font-medium text-gray-500 mb-1">Term Start Date</dt>
                  <dd className="text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {formatDate(official.termStart)}
                  </dd>
                </div>

                <div className="col-span-1">
                  <dt className="text-sm font-medium text-gray-500 mb-1">Term End Date</dt>
                  <dd className="text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {formatDate(official.termEnd)}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* System Activity / Relationships (Bonus Section based on schema) */}
            <Card title="Official Activity & Records" icon={FileText}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Megaphone className="w-5 h-5" />
                    <span className="font-medium text-sm">Announcements</span>
                  </div>
                  <span className="text-3xl font-bold text-blue-900 mt-auto">
                    {official._count?.announcements || 0}
                  </span>
                  <span className="text-xs text-blue-600/80 mt-1">Created & published</span>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 text-orange-800 mb-2">
                    <Scale className="w-5 h-5" />
                    <span className="font-medium text-sm">Blotters</span>
                  </div>
                  <span className="text-3xl font-bold text-orange-900 mt-auto">
                    {official._count?.blottersHandled || 0}
                  </span>
                  <span className="text-xs text-orange-600/80 mt-1">Cases handled</span>
                </div>

            
              </div>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}