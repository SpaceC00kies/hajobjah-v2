import React from 'react';

export const SiteLockOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-neutral-light dark:bg-dark-pageBg flex flex-col justify-center items-center z-[9999] p-8 text-center">
      <div className="bg-white dark:bg-dark-cardBg p-10 rounded-xl shadow-2xl border border-neutral-DEFAULT dark:border-dark-border">
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-6">🚫</h1>
        <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-dark dark:text-dark-text mb-4">
          ระบบถูกระงับชั่วคราว
        </h2>
        <p className="text-lg text-neutral-medium dark:text-dark-textMuted">
          โปรดกลับมาใหม่ภายหลัง
        </p>
      </div>
    </div>
  );
};
