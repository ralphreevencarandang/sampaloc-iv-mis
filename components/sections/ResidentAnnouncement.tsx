'use client'

import React, { useEffect, useState } from 'react'
import { ArrowRight, ShieldCheck, Users, FileText, ChevronLeft, ChevronRight, Calendar, Megaphone } from 'lucide-react';

const announcements = [
  {
    id: 1,
    title: "Barangay Assembly Meeting",
    date: "April 20, 2026",
    desc: "Join us for the quarterly barangay assembly to discuss upcoming community projects, budget allocations, and to hear your suggestions for our community's development.",
    color: "from-blue-500 to-cyan-400"
  },
  {
    id: 2,
    title: "Free Medical & Dental Mission",
    date: "April 25, 2026",
    desc: "Free medical checkups, dental extraction, and distribution of essential medicines for all registered residents. Please proceed to the Barangay Hall covered court.",
    color: "from-emerald-500 to-teal-400"
  },
  {
    id: 3,
    title: "Summer Sports League Registration",
    date: "May 1, 2026",
    desc: "Calling all youth! Registration for the Inter-Purok Basketball and Volleyball league is now open. Submit your requirements to the SK Council office.",
    color: "from-orange-500 to-amber-400"
  }
];

const ResidentAnnouncement = () => {
     const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-play functionality for the carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === announcements.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === announcements.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? announcements.length - 1 : prev - 1));
  };
  return (
      <section className="max-container w-full py-16 bg-slate-50 border-t border-gray-100 relative ">
      <div className="padding-x">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm">Barangay Board</h2>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900">Latest Announcements</h3>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-3">
            <button 
              onClick={prevSlide}
              className="p-2 rounded-full border border-gray-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={nextSlide}
              className="p-2 rounded-full border border-gray-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Carousel Viewport */}
        <div className="relative overflow-hidden rounded-2xl shadow-sm border border-gray-100 bg-white">
          <div 
            className="flex transition-transform duration-500 ease-in-out" 
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {announcements.map((announcement) => (
              <div key={announcement.id} className="min-w-full flex flex-col md:flex-row">
                
                {/* Image/Graphic Side */}
                <div className={`w-full md:w-2/5 h-48 md:h-auto bg-gradient-to-br ${announcement.color} p-8 flex items-center justify-center relative overflow-hidden`}>
                  {/* Abstract design for "image" fallback */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full transform -translate-x-5 translate-y-5"></div>
                  <Megaphone className="w-20 h-20 text-white opacity-20 absolute" />
                  
                  <h4 className="text-2xl font-bold text-white z-10 text-center ">
                    {announcement.title}
                  </h4>
                </div>
                
                {/* Text Content Side */}
                <div className="w-full md:w-3/5 p-8 md:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-3">
                    <Calendar className="w-4 h-4" />
                    {announcement.date}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{announcement.title}</h3>
                  <p className="text-slate-600 mb-8 leading-relaxed">
                    {announcement.desc}
                  </p>
                  
                  <button className="mt-auto self-start text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-1 group">
                    Read full details 
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>
            ))}
          </div>

          {/* Mobile Navigation Dots */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 md:hidden">
            {announcements.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentSlide === index ? 'bg-blue-600 w-4' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}

export default ResidentAnnouncement