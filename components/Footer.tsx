// components/Footer.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';

export const Footer: React.FC = () => {
    const { setIsFeedbackModalOpen } = useData();
    
    return (
      <footer className="w-full bg-white text-center text-sm text-neutral-dark p-6 border-t border-primary-light mt-auto font-serif">
        <div className="mb-4 flex items-center justify-center font-sans">
            <Link href="/about-us" className="hover:text-primary transition-colors">เกี่ยวกับเรา</Link>
            <span className="mx-2">·</span>
            <Link href="/safety" className="hover:text-primary transition-colors">ความปลอดภัย</Link>
            <span className="mx-2">·</span>
            <button onClick={() => setIsFeedbackModalOpen(true)} className="hover:text-primary transition-colors">Feedback</button>
        </div>
        <div className="text-xs">
            <p>© 2025 HAJOBJA.COM - All rights reserved.</p>
            <div className="flex items-center justify-center mt-1">
                <span className="font-sans">Created by&nbsp;</span>
                <a 
                    href="https://www.facebook.com/bluecathousestudio/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-primary hover:underline font-medium font-sans"
                >
                    <img 
                        alt="Blue Cat House Logo" 
                        src="https://i.postimg.cc/wxrcQPHV/449834128-122096458958403535-3024125841409891827-n-1-removebg-preview.png" 
                        className="h-4 w-auto mr-1"
                    />
                    <span>Blue Cat House</span>
                </a>
            </div>
        </div>
      </footer>
    );
};
