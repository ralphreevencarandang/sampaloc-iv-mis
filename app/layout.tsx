import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { ResidentAuthProvider } from "@/components/providers/resident-auth-provider";
import { getCurrentResidentFromSession } from "@/lib/resident-session";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sampaloc IV - Barangay Information System",
  description: "Sampaloc IV - Barangay Information System",
  icons: {
    icon: "/images/sampaloc-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentResident = await getCurrentResidentFromSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <QueryProvider>
          <ResidentAuthProvider initialResident={currentResident}>{children}</ResidentAuthProvider>
        </QueryProvider>
        <Toaster />

      </body>
    </html>
  );
}
