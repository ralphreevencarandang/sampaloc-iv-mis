import React from 'react'
import { ArrowRight, ShieldCheck, Users, FileText } from 'lucide-react';
const ResidentHero = () => {
  return (
    <div className=" bg-white font-sans flex flex-col max-container">
    

       {/* Main Hero Section */}
      <main className=" flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Subtle background decoration */}
        {/* <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-120 h-120 bg-blue-100 rounded-full blur-3xl opacity-40"></div> */}

        <div className="w-full  px-6 sm:px-8 lg:px-12 py-16 md:py-24 flex flex-col md:flex-row items-center relative ">
          
          {/* Left Side: Text Content */}
          <div className="w-full md:w-1/2 flex flex-col items-start gap-6 pr-0 md:pr-10 lg:pr-16">
           
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
              Welcome to <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                Brgy. Sampaloc IV
              </span> <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl text-slate-700 mt-2 block">Dasmariñas City, Cavite</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-lg italic font-medium border-l-4 border-blue-400 pl-4">
              "Kaagapay sa Pag-unlad, Serbisyo para sa Bawat Mamamayan, Tapat at Maasahan"
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
              <button className="group flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all duration-300 hover:-translate-y-0.5">
                Get in touch
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-slate-700 bg-white border-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300">
                View Features
              </button>
            </div>

            {/* Quick stats / trust indicators */}
            <div className="flex items-center gap-6 mt-8 pt-8 border-t border-gray-100 w-full max-w-md">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">10k+</span>
                <span className="text-sm text-slate-500 font-medium">Resident</span>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">24/7</span>
                <span className="text-sm text-slate-500 font-medium">Support</span>
              </div>
              <div className="w-px h-10 bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-slate-900">100%</span>
                <span className="text-sm text-slate-500 font-medium">Tapat</span>
              </div>
            </div>
          </div>

          {/* Right Side: Image/Illustration */}
          <div className="w-full md:w-1/2 mt-16 md:mt-0 relative">
            {/* Decorative background behind the illustration */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-white rounded-3xl transform rotate-3 scale-105 opacity-50 z-0"></div>
            
            <div className="relative z-10 bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-gray-100 overflow-hidden flex flex-col h-[28rem] lg:h-[32rem] transform transition-transform hover:scale-[1.01] duration-500">
              {/* Mockup Top Bar */}
              <div className="bg-slate-50 border-b border-gray-100 p-4 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-auto w-1/2 h-6 bg-white rounded-md border border-gray-200 shadow-sm"></div>
              </div>
              
              {/* Mockup Content Area */}
              <div className="flex-1 p-6 flex flex-col gap-6 bg-[#f8fafc]">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="h-4 w-24 bg-blue-100 rounded mb-2"></div>
                    <div className="h-8 w-48 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-10 w-32 bg-blue-600 rounded-lg shadow-md shadow-blue-200"></div>
                </div>

                {/* Grid Cards Mockup */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                      <Users size={24} />
                    </div>
                    <div className="h-3 w-16 bg-slate-200 rounded"></div>
                    <div className="h-6 w-24 bg-slate-800 rounded"></div>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start gap-3">
                    <div className="p-2 bg-green-50 rounded-lg text-green-600">
                      <FileText size={24} />
                    </div>
                    <div className="h-3 w-20 bg-slate-200 rounded"></div>
                    <div className="h-6 w-16 bg-slate-800 rounded"></div>
                  </div>
                </div>

                {/* List Mockup */}
                <div className="bg-white flex-1 rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100"></div>
                      <div className="flex-1">
                        <div className="h-3 w-1/2 bg-slate-800 rounded mb-2"></div>
                        <div className="h-2 w-1/3 bg-slate-300 rounded"></div>
                      </div>
                      <div className="h-6 w-16 bg-blue-50 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl shadow-blue-900/10 border border-gray-100 flex items-center gap-4 z-20 animate-bounce" style={{ animationDuration: '3s' }}>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Ligtas na Datos</p>
                <p className="text-xs text-slate-500">Sumusunod sa DPA</p>
              </div>
            </div>
            
          </div>
        </div>
      </main>
    </div>
  )
}

export default ResidentHero