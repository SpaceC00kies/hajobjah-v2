
import React, { useState, useEffect } from 'react';
import { subscribeToSiteConfigService } from '../services/adminService.ts';

export const SiteLockOverlay: React.FC = () => {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToSiteConfigService((config) => {
      setIsLocked(config.isSiteLocked);
    });
    return () => unsubscribe();
  }, []);
  
  if (!isLocked) {
    return null;
  }
  return (
    <div className="fixed inset-0 bg-neutral-light flex flex-col justify-center items-center z-[9999] p-8 text-center">
      <div className="bg-white p-10 rounded-xl shadow-2xl border border-neutral-DEFAULT">
        <h1 className="text-4xl font-bold text-red-600 mb-6">🚫</h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-dark mb-4">
          ระบบถูกระงับชั่วคราว
        </h2>
        <p className="text-lg text-neutral-medium">
          โปรดกลับมาใหม่ภายหลัง
        </p>
      </div>
    </div>
  );
};
