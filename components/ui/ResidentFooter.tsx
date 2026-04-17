import React from 'react'
import InstagramIcon from "@/public/icons/ig.svg";
import FacebookIcon from "@/public/icons/fb.svg";
;
import Image from 'next/image';
import { 
  ShieldCheck, 
 MapPin, Mail, Phone, 

} from 'lucide-react';
const ResidentFooter = () => {
  return (
     <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          
          {/* Brand & Paragraph */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {/* <ShieldCheck className="h-8 w-8 text-primary-500" /> */}
              <span className="text-xl font-bold text-white">Sampaloc<span className="text-primary-500"> IV</span></span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              We are dedicated to serving the residents of Brgy. Sampaloc IV with transparency, integrity, and efficiency. Together, we are building a safer and more progressive community.
            </p>
          </div>
          
          {/* Sections / Quick Links */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold uppercase tracking-wider text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-400 transition-colors">Home</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">E-Services</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Announcements</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Officials</a></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold uppercase tracking-wider text-sm">Contact Info</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-500 shrink-0" />
                <span>Barangay Hall, Sampaloc IV<br/>Dasmariñas City, Cavite</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary-500 shrink-0" />
                <span>(046) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-500 shrink-0" />
                <span>contact@sampaloc4.gov.ph</span>
              </li>
            </ul>
          </div>
          
          {/* Socials */}
          <div className="flex flex-col gap-4">
            <h4 className="text-white font-bold uppercase tracking-wider text-sm">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="p-2.5 bg-slate-800 rounded-full hover:bg-primary-600 transition-colors text-white" aria-label="Facebook">
           
                <Image src={FacebookIcon} alt="Facebook" className='w-4 h-4' />

              </a>
              <a href="#" className="p-2.5 bg-slate-800 rounded-full hover:bg-pink-600 transition-colors text-white" aria-label="Instagram">
                
                <Image src={InstagramIcon} alt="Instagram" className='w-4 h-4' />
              </a>
            </div>
          </div>
          
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 text-center text-sm flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500">
          <p>&copy; {new Date().getFullYear()} Brgy. Sampaloc IV. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
        
      </div>
    </footer>
  )
}

export default ResidentFooter