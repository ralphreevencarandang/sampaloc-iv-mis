'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight,  MapPin, Mail, Phone, Clock, ImageIcon } from 'lucide-react';

const aboutImages = [
  { id: 1, bg: "bg-blue-100", title: "Barangay Hall Facade" },
  { id: 2, bg: "bg-emerald-100", title: "Covered Court & Plaza" },
  { id: 3, bg: "bg-amber-100", title: "Health Center" }
];
const ResidentAboutUs = () => {

    const [currentImg, setCurrentImg] = useState(0);

  const nextImg = () => setCurrentImg((prev) => (prev === aboutImages.length - 1 ? 0 : prev + 1));
  const prevImg = () => setCurrentImg((prev) => (prev === 0 ? aboutImages.length - 1 : prev - 1));
  return (
     <section id='aboutUs' className="w-full py-20 bg-slate-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          
          {/* Left Column: Text & Info */}
          <div className="w-full lg:w-1/2 flex flex-col gap-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm">About Us</h2>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Brgy. Sampaloc IV</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                We are committed to providing transparent, efficient, and accessible services to all residents. Our administration focuses on community development, health, safety, and empowering every citizen to participate in building a better barangay.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-2">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Address</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">Barangay Hall, Sampaloc IV<br/>Dasmariñas City, Cavite</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Email</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">contact@sampaloc4.gov.ph<br/>admin@sampaloc4.gov.ph</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Phone</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">(046) 123-4567<br/>+63 912 345 6789</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Open Hours</h4>
                  <p className="text-slate-600 text-sm mt-1 leading-relaxed">Mon - Fri: 8:00 AM - 5:00 PM<br/>Sat - Sun: Closed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Image Carousel */}
          <div className="w-full lg:w-1/2">
            <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-blue-900/5 border border-gray-100 bg-white group">
              {/* Carousel Track */}
              <div 
                className="flex transition-transform duration-500 ease-in-out h-[400px] lg:h-[450px]"
                style={{ transform: `translateX(-${currentImg * 100}%)` }}
              >
                {aboutImages.map((img) => (
                  <div key={img.id} className={`min-w-full h-full flex flex-col items-center justify-center ${img.bg}`}>
                    <ImageIcon className="w-24 h-24 text-slate-400 opacity-50 mb-4" />
                    <p className="text-slate-600 font-semibold">{img.title}</p>
                    <p className="text-slate-400 text-sm">(Image Placeholder)</p>
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={prevImg}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:text-blue-600 shadow-md transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={nextImg}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:text-blue-600 shadow-md transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Indicators */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                {aboutImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    className={`h-2.5 rounded-full transition-all ${
                      currentImg === idx ? 'bg-blue-600 w-8' : 'bg-slate-400/50 hover:bg-slate-400 w-2.5'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default ResidentAboutUs