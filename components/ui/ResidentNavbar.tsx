"use client";

import { LogOut, Menu, Settings, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useResidentAuth } from "@/components/providers/resident-auth-provider";
import { logoutResidentAction } from "@/server/actions/auth.actions";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import logo from "@/public/images/dasma-logo.png";

function ResidentProfileMenu({
  residentInitial,
  onLogout,
  isLoggingOut,
}: {
  residentInitial: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        event.target instanceof Node &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        type="button"
        onClick={() => setIsProfileMenuOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white shadow-md shadow-primary-600/30 transition-all duration-300 hover:bg-primary-700"
      >
        {residentInitial}
      </button>

      {isProfileMenuOpen && (
        <div className="absolute right-0 mt-3 w-48 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            type="button"
            onClick={() => {
              setIsProfileMenuOpen(false);
              onLogout();
            }}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}

const ResidentNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { isAuthenticated, resident, signOut } = useResidentAuth();

  const logoutMutation = useMutation({
    mutationFn: logoutResidentAction,
    onSuccess: () => {
      signOut();
      router.refresh();
    },
  });

  const navLinks = [
    { label: "Home", href: "#" },
    { label: "Announcements", href: "#announcements" },
    { label: "Brgy. Officials", href: "#officials" },
    { label: "About Us", href: "#aboutUs" },
    { label: "Services", href: "#services" },
    { label: "Contact", href: "#contact" },
  ];

  const residentInitial = resident?.firstName?.charAt(0).toUpperCase() ?? "R";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white shadow-sm">
      <div className="max-container padding-x">
        <div className="flex h-16 items-center justify-between md:h-20">
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Image src={logo} alt="Logo" width={50} height={50} />
              <div>

              <p className="text-lg font-bold text-slate-900">Sampaloc IV</p>
              <p className="-mt-1 text-xs text-slate-500">Dasmarinas City</p>
              </div>
            </Link>
          </div>

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-4 py-2 font-medium text-slate-600 transition-all duration-300 hover:bg-primary-50 hover:text-primary-600"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center lg:flex">
            {isAuthenticated ? (
              <ResidentProfileMenu
                residentInitial={residentInitial}
                onLogout={() => logoutMutation.mutate()}
                isLoggingOut={logoutMutation.isPending}
              />
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-primary-600 px-6 py-2.5 font-semibold text-white shadow-md shadow-primary-600/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/40"
              >
                Login
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            {isAuthenticated ? (
              <ResidentProfileMenu
                residentInitial={residentInitial}
                onLogout={() => logoutMutation.mutate()}
                isLoggingOut={logoutMutation.isPending}
              />
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-primary-700"
              >
                Login
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 transition-colors hover:bg-slate-100"
            >
              {isOpen ? (
                <X className="h-6 w-6 text-slate-600" />
              ) : (
                <Menu className="h-6 w-6 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="animate-in slide-in-from-top-2 space-y-2 border-t border-gray-100 bg-white px-4 py-4 duration-200 fade-in lg:hidden">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block rounded-lg px-4 py-3 font-medium text-slate-600 transition-all duration-300 hover:bg-primary-50 hover:text-primary-600"
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
