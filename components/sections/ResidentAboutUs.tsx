'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight,  MapPin, Mail, Phone, Clock, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import img1 from '@/public/images/gallery-1.jpg'
import img2 from '@/public/images/gallery-2.jpg'
import img3 from '@/public/images/gallery-3.jpg'
import img4 from '@/public/images/gallery-4.jpg'
import img5 from '@/public/images/gallery-5.jpg'
import img6 from '@/public/images/gallery-6.jpg'
import img7 from '@/public/images/gallery-7.jpg'
import img8 from '@/public/images/gallery-8.jpg'
import img9 from '@/public/images/gallery-9.jpg'

const aboutImages = [
  { id: 1, title: "Barangay Hall Facade", src: img1 },
  { id: 2, title: "Covered Court & Plaza", src: img2 },
  { id: 3, title: "Health Center", src: img3 },
  { id: 4, title: "Health Center", src: img4 },
  { id: 5, title: "Health Center", src: img5 },
  { id: 6, title: "Health Center", src: img6 },
  { id: 7, title: "Health Center", src: img7 },
  { id: 8, title: "Health Center", src: img8 },
  { id: 9, title: "Health Center", src: img9 }

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
                <MapPin className="h-5 w-5 text-primary-600" />
                <h2 className="text-primary-600 font-bold tracking-wide uppercase text-sm">About Us</h2>
              </div>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Brgy. Sampaloc IV</h3>
              <p className="text-slate-600 text-lg leading-relaxed">
                We are committed to providing transparent, efficient, and accessible services to all residents. Our administration focuses on community development, health, safety, and empowering every citizen to participate in building a better barangay.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-2">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary-100 text-primary-600 rounded-xl">
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
            <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-primary-900/5 border border-gray-100 bg-white group">
              {/* Carousel Track */}
              <div 
                className="flex transition-transform duration-500 ease-in-out h-[400px] lg:h-[450px]"
                style={{ transform: `translateX(-${currentImg * 100}%)` }}
              >
                {aboutImages.map((img) => (
                  <div key={img.id} className={`min-w-full h-full relative group/item overflow-hidden`}>
                    <Image 
                      src={img.src} 
                      alt={img.title} 
                      fill
                      className="object-cover transition-transform duration-700 group-hover/item:scale-105"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                   
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              <button 
                onClick={prevImg}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:text-primary-600 shadow-md transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={nextImg}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:text-primary-600 shadow-md transition-all opacity-0 group-hover:opacity-100"
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
                      currentImg === idx ? 'bg-primary-600 w-8' : 'bg-slate-400/50 hover:bg-slate-400 w-2.5'
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