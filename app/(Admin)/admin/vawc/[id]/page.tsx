"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { ArrowLeft, MapPin, Calendar, Clock, User, ShieldAlert, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import type { VawcRecordType } from '@/server/actions/vawc.actions';

export default function VawcViewPage() {
  const router = useRouter();
  const params = useParams();
  const vawcId = params.id as string;

  const { data: vawc, isLoading, error } = useQuery<VawcRecordType>({
    queryKey: ['vawc', vawcId],
    queryFn: async () => {
      const response = await axios.get(`/vawc/${vawcId}`);
      return response.data;
    },
    enabled: !!vawcId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REPORTED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'SUMMONED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DISMISSED': return 'bg-slate-200 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getAbuseBadge = (type: string) => {
    switch (type) {
      case 'PHYSICAL': return 'bg-red-50 text-red-700 border-red-200';
      case 'SEXUAL': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PSYCHOLOGICAL': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ECONOMIC': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
        <p className="text-slate-600 font-medium">Loading Case Details...</p>
      </div>
    );
  }

  if (error || !vawc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-xl font-bold text-slate-800">Case Record Not Found</p>
        <button 
          onClick={() => router.push('/admin/vawc')}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          Return to directory
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 mb-12">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/admin/vawc')}
          className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{vawc.caseNumber}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide tracking-wider ${getStatusBadge(vawc.status)}`}>
              {vawc.status}
            </span>
          </div>
          <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4" /> Date Filed: {new Date(vawc.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <ShieldAlert className="w-5 h-5 text-red-500" />
                 Incident Report
               </h2>
               <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${getAbuseBadge(vawc.abuseType)}`}>
                 {vawc.abuseType} ABUSE
               </span>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date of Incident</span>
                <p className="flex items-center gap-2 text-slate-800 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {new Date(vawc.incidentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Time of Incident</span>
                <p className="flex items-center gap-2 text-slate-800 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {new Date(vawc.incidentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="col-span-2 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</span>
                <p className="flex items-center gap-2 text-slate-800 font-medium">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {vawc.incidentLocation}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Narrative summary</span>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                {vawc.narrative}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">Evidentiary Attachments</h2>
            {vawc.vawcImage ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 group relative">
                <img src={vawc.vawcImage} alt="Evidentiary Image" className="w-full h-auto object-contain bg-slate-50 max-h-96" />
                <a 
                  href={vawc.vawcImage} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white font-medium flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> View Full Image</span>
                </a>
              </div>
            ) : (
               <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                 <p className="text-slate-500 font-medium">No evidentiary files attached</p>
               </div>
            )}
          </div>
        </div>

        {/* Right Column - People Logs */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Complainant</h3>
                <span className="text-xs font-semibold text-slate-500 uppercase">Victim Details</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Full Name</p>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{vawc.victimName}</p>
                  {vawc.isMinor && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded">MINOR</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Age</p>
                  <p className="font-medium text-slate-900">{vawc.victimAge} yrs</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sex</p>
                  <p className="font-medium text-slate-900">{vawc.victimSex}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Civil Status</p>
                <p className="font-medium text-slate-900">{vawc.victimCivilStatus}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Address</p>
                <p className="font-medium text-slate-900">{vawc.victimAddress}</p>
              </div>
              {vawc.victimContactNumber && (
                <div>
                  <p className="text-sm text-slate-500">Contact Number</p>
                  <p className="font-medium text-slate-900">{vawc.victimContactNumber}</p>
                </div>
              )}
              {vawc.isMinor && vawc.guardianName && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Guardian</p>
                  <p className="font-medium text-slate-900">{vawc.guardianName}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Respondent</h3>
                <span className="text-xs font-semibold text-slate-500 uppercase">Accused Details</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">Full Name</p>
                <p className="font-semibold text-slate-900 text-lg">{vawc.respondentName}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-widest text-red-500 uppercase mb-1">Relationship to Victim</p>
                <p className="font-medium text-slate-900 bg-red-50 px-3 py-1.5 rounded-lg w-fit border border-red-100">{vawc.relationshipToVictim.replace('_', ' ')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Age</p>
                  <p className="font-medium text-slate-900">{vawc.respondentAge} yrs</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Sex</p>
                  <p className="font-medium text-slate-900">{vawc.respondentSex}</p>
                </div>
              </div>
              <div>
                 <p className="text-sm text-slate-500">Address</p>
                 <p className="font-medium text-slate-900">{vawc.respondentAddress}</p>
              </div>
              {vawc.respondentContactNumber && (
                <div>
                  <p className="text-sm text-slate-500">Contact Number</p>
                  <p className="font-medium text-slate-900">{vawc.respondentContactNumber}</p>
                </div>
              )}
              {vawc.respondentOccupation && (
                <div>
                  <p className="text-sm text-slate-500">Occupation</p>
                  <p className="font-medium text-slate-900">{vawc.respondentOccupation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}