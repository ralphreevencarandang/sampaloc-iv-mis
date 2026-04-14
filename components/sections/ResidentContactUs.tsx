import React from 'react'
import { 
 MapPin, Phone, Send, MessageSquare 
} from 'lucide-react';

const ResidentContactUs = () => {
  return (
     <section className="w-full py-20 bg-slate-50 border-t border-gray-100">
      <div className="max-container padding-x">
          <div className="flex flex-col lg:flex-row gap-12">

          {/* Left Column: Text & Info */}
          <div className="w-full lg:w-5/12 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h2 className="text-blue-600 font-bold tracking-wide uppercase text-sm">Get in Touch</h2>
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">We'd love to hear from you</h3>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              Have questions, concerns, or suggestions for our barangay? Fill out the form and our team will get back to you as soon as possible.
            </p>

            <div className="w-full h-64 sm:h-[300px] rounded-3xl overflow-hidden shadow-md border border-gray-200">
              <iframe 
                title="Brgy Sampaloc IV Map"
                src="https://maps.google.com/maps?q=Barangay+Sampaloc+IV,+Dasmari%C3%B1as+City,+Cavite&t=&z=14&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="w-full lg:w-7/12">
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100">
              <form className="flex flex-col gap-6" >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input type="text" placeholder="Juan Dela Cruz" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <input type="email" placeholder="juan@example.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Subject</label>
                  <input type="text" placeholder="How can we help you?" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Message</label>
                  <textarea rows={4} placeholder="Write your message here..." className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"></textarea>
                </div>

                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-2 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5">
                  Send Message
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default ResidentContactUs