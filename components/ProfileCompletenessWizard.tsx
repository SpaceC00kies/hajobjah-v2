"use client";
import React from 'react';
import type { User } from '../types/types';
import { calculateProfileCompleteness } from '../utils/profileUtils';
import { motion } from 'framer-motion';

interface ProfileCompletenessWizardProps {
  currentUser: User;
}

export const ProfileCompletenessWizard: React.FC<ProfileCompletenessWizardProps> = ({ currentUser }) => {
  const { score, checklist } = calculateProfileCompleteness(currentUser);

  const handleScrollToSection = (anchorId: string) => {
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  
  if (score === 100) {
    return (
        <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
            <p className="font-sans font-semibold text-green-800">🎉 โปรไฟล์ของคุณสมบูรณ์ 100% แล้ว!</p>
            <p className="text-xs font-sans text-green-700 mt-1">ขอบคุณที่ให้ข้อมูลครบถ้วน ซึ่งจะช่วยเพิ่มความน่าเชื่อถือของคุณ</p>
        </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
      <h3 className="text-md font-sans font-semibold text-amber-800 mb-2 text-center">
        ทำให้โปรไฟล์ของคุณสมบูรณ์ขึ้น!
      </h3>
      <div className="w-full bg-amber-200 rounded-full h-2.5 mb-3">
        <motion.div
          className="bg-secondary h-2.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeInOut' as const }}
        />
      </div>
      <p className="text-center text-sm font-sans text-amber-700 mb-3">
        โปรไฟล์ของคุณสมบูรณ์ {score}% แล้ว
      </p>
      <ul className="space-y-1 text-xs font-sans">
        {checklist.map((item, index) => (
          <li key={index} className="flex items-center">
            <span className={`mr-2 ${item.completed ? 'text-green-500' : 'text-amber-500'}`}>
              {item.completed ? '✓' : '•'}
            </span>
            {item.completed ? (
              <span className="text-neutral-500 line-through">{item.label}</span>
            ) : (
              <button
                onClick={() => handleScrollToSection(item.anchorId)}
                className="text-neutral-700 hover:text-secondary hover:underline text-left"
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};