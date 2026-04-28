'use client'

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Home,
  BookOpen,
  Megaphone,
  Vote,
  PawPrint,
  AlertTriangle,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Archive,
  Venus,
  HeartPulse,
} from 'lucide-react';
import { logoutAdminAction } from '@/server/actions/auth.actions';
import Image from 'next/image';
import logo from '@/public/images/sampaloc-logo.png'
interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() =>
    pathname.startsWith('/admin/documents') ? 'documents' : null
  );
  const router = useRouter();

  const logoutMutation = useMutation({
    mutationFn: logoutAdminAction,
    onSuccess: () => {
      router.replace('/AdminLogin');
      router.refresh();
    },
  });

  const documentTypes = [
    { label: 'Clearance', href: '/admin/documents/clearance' },
    { label: 'Indigency', href: '/admin/documents/indigency' },
    { label: 'Residency', href: '/admin/documents/residency' },
    { label: 'Cedula', href: '/admin/documents/cedula' },
    { label: 'Barangay ID', href: '/admin/documents/barangay-id' },
    { label: 'First Time Job Seeker', href: '/admin/documents/job-seeker' },
  ];

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Announcement', href: '/admin/announcements', icon: <Megaphone className="w-5 h-5" /> },
    { label: 'Barangay Officials', href: '/admin/officials', icon: <Users className="w-5 h-5" /> },
    { label: 'Resident', href: '/admin/resident', icon: <Home className="w-5 h-5" /> },
    { label: 'Voters', href: '/admin/voters', icon: <Vote className="w-5 h-5" /> },
    { label: 'Documents', href: '/admin/documents', icon: <FileText className="w-5 h-5" /> },
    { label: 'Blotter', href: '/admin/blotter', icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Health', href: '/admin/health', icon: <HeartPulse className="w-5 h-5" /> },
    { label: 'VAWC', href: '/admin/vawc', icon: <Venus className="w-5 h-5" /> },
    { label: 'Pet Registration', href: '/admin/pets', icon: <PawPrint className="w-5 h-5" /> },
    { label: 'Crisis Inventory', href: '/admin/inventory', icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Archived', href: '/admin/archived', icon: <Archive className="w-5 h-5" /> },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin' || pathname === '/admin/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-primary-600 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-slate-900 text-white transition-all duration-300 z-40 flex flex-col ${
          isOpen ? 'w-50' : '-translate-x-full md:translate-x-0 md:w-20'
        }`}
      >
        {/* Logo Section */}
        <div className="h-20 border-b border-slate-700 flex items-center justify-center md:justify-start  gap-3 px-6">
          {/* <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">S</span>
          </div> */}
          {isOpen && (
            <div className=" flex items-center gap-3">
              <Image src={logo} alt="Logo" width={40} height={40} />
              <div>

                <p className="font-bold text-white text-sm">Sampaloc IV</p>
                <p className="text-xs text-slate-400">Admin Panel</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-2">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.label === 'Documents' ? (
                <>
                  <button
                    onClick={() => setExpandedMenu(expandedMenu === 'documents' ? null : 'documents')}
                    className={`group w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-xs transition-all duration-200 ${
                      isActive(item.href) || expandedMenu === 'documents'
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-primary-400'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {isOpen && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                            expandedMenu === 'documents' ? 'rotate-180' : ''
                          }`}
                        />
                      </>
                    )}
                  </button>

                  {/* Submenu */}
                  {isOpen && expandedMenu === 'documents' && (
                    <div className="ml-4 mt-2 space-y-1">
                      {documentTypes.map((doc) => (
                        <Link
                          key={doc.label}
                          href={doc.href}
                          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs transition-all duration-200 ${
                            pathname === doc.href
                              ? 'bg-primary-500 text-white'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-primary-300'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span className="truncate">{doc.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-xs transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-primary-400'
                  }`}
                  title={!isOpen ? item.label : ''}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer Section */}
        <div className="border-t border-slate-700 p-4">
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-red-400 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
              !isOpen ? 'justify-center' : ''
            }`}
          >
            <span className="shrink-0">
              <LogOut className="w-5 h-5" />
            </span>
            {isOpen && <span>{logoutMutation.isPending ? 'Signing Out...' : 'Logout'}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Spacer for Desktop */}
      <div className={`hidden md:block transition-all duration-300 ${isOpen ? 'w-50' : 'w-20'}`} />
    </>
  );
};

export default AdminSidebar;
