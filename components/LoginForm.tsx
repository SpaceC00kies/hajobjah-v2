"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './Button.tsx';
import { useAuthActions } from '../hooks/useAuthActions.ts';
import { useData } from '../context/DataContext.tsx';


export const LoginForm: React.FC = () => {
  const [loginIdentifier, setLoginIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { login } = useAuthActions();
  const { setIsForgotPasswordModalOpen } = useData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    if (!loginIdentifier.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน');
      return;
    }
    setIsLoading(true);
    const result = await login(loginIdentifier, password);
    setIsLoading(false);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-auto my-10 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-primary-dark mb-6 text-center">เข้าสู่ระบบ</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="loginIdentifier" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            ชื่อผู้ใช้ หรือ อีเมล
          </label>
          <input
            type="text"
            id="loginIdentifier"
            value={loginIdentifier}
            onChange={(e) => setLoginIdentifier(e.target.value)}
            className={`w-full ${error && !password ? 'input-error' : ''}`}
            placeholder="กรอกชื่อผู้ใช้หรืออีเมลของคุณ"
            disabled={isLoading}
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-sm font-sans font-medium text-neutral-dark">
              รหัสผ่าน
            </label>
            <button 
              type="button" 
              onClick={() => setIsForgotPasswordModalOpen(true)}
              className="text-xs font-sans text-neutral-medium hover:text-primary hover:underline focus:outline-none"
              disabled={isLoading}
            >
              ลืมรหัสผ่าน?
            </button>
          </div>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full ${error ? 'input-error' : ''}`}
            placeholder="กรอกรหัสผ่าน"
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-red-500 font-sans text-sm text-center">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </Button>
        <p className="text-center text-sm font-serif text-neutral-dark font-normal">
          ยังไม่มีบัญชี?{' '}
          <button type="button" onClick={() => router.push('/register')} className="font-sans font-medium text-primary hover:underline" disabled={isLoading}>
            ลงทะเบียนที่นี่
          </button>
        </p>
      </form>
    </div>
  );
};
