import React from 'react'
import {  Users, User } from 'lucide-react';

const officials = [
  { id: 1, name: "Hon. Juan Dela Cruz", position: "Barangay Captain", term: "2023 - 2026" },
  { id: 2, name: "Hon. Maria Santos", position: "Barangay Kagawad - Health", term: "2023 - 2026" },
  { id: 3, name: "Hon. Pedro Reyes", position: "Barangay Kagawad - Peace & Order", term: "2023 - 2026" },
  { id: 4, name: "Hon. Ana Garcia", position: "Barangay Kagawad - Education", term: "2023 - 2026" },
  { id: 5, name: "Hon. Luis Mendoza", position: "Barangay Kagawad - Infrastructure", term: "2023 - 2026" },
  { id: 6, name: "Hon. Rosa Lim", position: "Barangay Kagawad - Environment", term: "2023 - 2026" },
  { id: 7, name: "Hon. Carlos Bautista", position: "Barangay Kagawad - Agriculture", term: "2023 - 2026" },
  { id: 8, name: "Hon. Elena Castro", position: "Barangay Kagawad - Finance", term: "2023 - 2026" },
  { id: 9, name: "Hon. Mark Villanueva", position: "SK Chairperson", term: "2023 - 2026" },
  { id: 10, name: "Mr. Jose Fernando", position: "Barangay Secretary", term: "Appointed" },

];

const ResidentOfficials = () => {
  return (
      <section id='officials' className="w-full py-20 bg-white">
      <div className="max-container padding-x">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center gap-2 mb-3">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm">Leadership</h2>
          </div>
          <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Barangay Officials</h3>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Meet the dedicated individuals serving our community. Together, we work towards a progressive and peaceful barangay.
          </p>
        </div>

        {/* Grid Layout for Officials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
          {/* Captain Card - Highlighted */}
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-3 flex justify-center mb-8">
            <div className="group w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400 relative">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
              </div>
              <div className="flex flex-col items-center px-6 pb-8">
                {/* Image Placeholder */}
                <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md flex items-center justify-center -mt-12 mb-4 group-hover:scale-105 transition-transform duration-300 z-10">
                  <User className="h-10 w-10 text-slate-400" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 text-center mb-1">{officials[0].name}</h4>
                <p className="text-blue-600 font-semibold text-center mb-3">{officials[0].position}</p>
                <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-medium border border-gray-100">
                  Term: {officials[0].term}
                </div>
              </div>
            </div>
          </div>

          {/* Other Officials */}
          {officials.slice(1).map((official) => (
            <div key={official.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-blue-100 transition-all duration-300 hover:-translate-y-1">
              <div className="h-20 bg-slate-50 border-b border-gray-100 relative group-hover:bg-blue-50 transition-colors duration-300">
                 {/* Decorative background pattern */}
                 <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, blue 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
              </div>
              <div className="flex flex-col items-center px-6 pb-6">
                {/* Image Placeholder */}
                <div className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 shadow-sm flex items-center justify-center -mt-10 mb-4 group-hover:shadow-md group-hover:scale-105 transition-all duration-300 z-10">
                   <User className="h-8 w-8 text-slate-400" />
                </div>
                <h4 className="text-lg font-bold text-slate-900 text-center mb-1 line-clamp-1" title={official.name}>{official.name}</h4>
                <p className="text-slate-600 text-sm font-medium text-center mb-3 min-h-[40px]">{official.position}</p>
                <div className="px-3 py-1 bg-slate-50 group-hover:bg-white text-slate-500 rounded-full text-xs font-medium border border-gray-100 transition-colors">
                  Term: {official.term}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ResidentOfficials