import React from 'react';
import type { Metadata } from "next";
import { Prompt, Sarabun } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalModals } from "@/components/GlobalModals";
import "./globals.css";

// Configure fonts using next/font for performance optimization
const prompt = Prompt({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["latin", "thai"],
  weight: ["400", "600"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HAJOBJA.COM",
  description: "เว็บแอปสำหรับโพสต์งานพาร์ทไทม์ งานช่วยด่วน และค้นหาคนว่างพร้อมรับงานในเชียงใหม่",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${sarabun.variable}`}>
      <body className="bg-neutral-light font-sans text-neutral-dark">
        <AuthProvider>
          <DataProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                {children}
              </main>
              <Footer />
              <GlobalModals />
            </div>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}