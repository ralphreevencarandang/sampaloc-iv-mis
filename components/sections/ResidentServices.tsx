'use client'
import React, { useState, useEffect } from 'react';
import {  FileText, 
  FileSignature, CheckCircle2, Dog, AlertTriangle 
} from 'lucide-react';
import Link from 'next/link';

const ResidentServices = () => {

     const documentTypes = [
    "Barangay Clearance",
    "Certificate of Indigency",
    "Certificate of Residency",
    "Cedula (CTC)",
    "Barangay ID",
    "First Time Job Seeker"
  ];
  return (
     <section id='services' className="w-full py-20 bg-white">
      <div className="max-container padding-x">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <FileSignature className="h-5 w-5 text-blue-600" />
            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm">E-Services</h2>
          </div>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Barangay Services</h3>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Access essential barangay services online. Request documents, register pets, or file reports easily and conveniently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Service Card 1: Request Documents */}
          <div className="bg-slate-50 rounded-3xl p-8 border border-gray-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-bold text-slate-900 mb-4">Request Documents</h4>
            <ul className="space-y-4 mb-8 flex-1">
              {documentTypes.map((doc, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <span className="text-slate-700 font-medium">{doc}</span>
                </li>
              ))}
            </ul>
            <Link href="/request-documents">
              <button className="w-full py-3.5 bg-white border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-colors">
                Request Now
              </button>
            </Link>
          </div>

          {/* Service Card 2: Pet Registration */}
          <div className="bg-slate-50 rounded-3xl p-8 border border-gray-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
              <Dog className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-bold text-slate-900 mb-4">Pet Registration</h4>
            <p className="text-slate-600 leading-relaxed mb-8 flex-1">
              Register your pets to keep our community safe and ensure they are properly documented and vaccinated. Help us maintain a pet-friendly and responsible neighborhood.
            </p>
            <Link href="/pet-registration">
              <button className="w-full py-3.5 bg-white border-2 border-amber-600 text-amber-600 font-bold rounded-xl hover:bg-amber-600 hover:text-white transition-colors">
                Register Pet
              </button>
            </Link>
          </div>

          {/* Service Card 3: Blotter */}
          <div className="bg-slate-50 rounded-3xl p-8 border border-gray-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h4 className="text-2xl font-bold text-slate-900 mb-4">File a Blotter</h4>
            <p className="text-slate-600 leading-relaxed mb-8 flex-1">
              Report an incident or file a formal complaint. Our barangay officials are ready to mediate, assist in resolving disputes, and ensure the safety of our residents.
            </p>
            <Link href="/blotter">
              <button className="w-full py-3.5 bg-white border-2 border-red-600 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-colors">
                File Report
              </button>
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

export default ResidentServices