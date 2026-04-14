'use client'

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
const ResidentNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "#" },
    { label: "Announcements", href: "#announcements" },
    { label: "Brgy. Officials", href: "#officials" },
    { label: "About Us", href: "#aboutUs" },
    { label: "Services", href: "#services" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <nav className="w-full bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-container padding-x">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Logo */}
          <div className="shrink-0 flex items-center gap-2">
            {/* <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div> */}
            <div className="">
              <p className="font-bold text-slate-900 text-lg">Sampaloc IV</p>
              <p className="text-xs text-slate-500 -mt-1">Dasmariñas City</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Login Button */}
          <div className="hidden md:flex items-center">
            <Link   href="/login" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md shadow-blue-600/30 hover:shadow-lg hover:shadow-blue-600/40 transition-all duration-300 hover:-translate-y-0.5">
              Login
            
            </Link>
           
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all duration-300">
              Login
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6 text-slate-600" />
              ) : (
                <Menu className="w-6 h-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block px-4 py-3 text-slate-600 font-medium hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default ResidentNavbar;
