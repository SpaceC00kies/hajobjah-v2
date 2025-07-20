// components/PasswordResetPage.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase/clientApp';
import { verifyPasswordResetCode, confirmPasswordReset, type AuthError } from 'firebase/auth';
import { Button } from './Button.tsx';

export const PasswordResetPage: React.FC = () => {
  const router = useRouter();
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isCodeVerified, setIsCodeVerified] = useState(false);
  const [emailForReset, setEmailForReset] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const newPasswordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const _modeParam = params.get('mode');
    const _codeParam = params.get('oobCode');

    setOobCode(_codeParam);

    if (_modeParam !== 'resetPassword' || !_codeParam) {
      setVerificationError('ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้องหรือไม่สมบูรณ์ โปรดลองขอลิงก์ใหม่อีกครั้ง');
      setIsLoadingVerification(false);
      return;
    }

    verifyPasswordResetCode(auth, _codeParam)
      .then((email) => {
        setEmailForReset(email);
        setIsCodeVerified(true);
      })
      .catch((error: AuthError) => {
        let message = 'ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว โปรดลองขอลิงก์ใหม่อีกครั้ง';
        if ((error as any).code === 'auth/invalid-action-code') {
          message = 'ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้อง ถูกใช้ไปแล้ว หรือหมดอายุแล้ว โปรดลองขอลิงก์ใหม่อีกครั้ง';
        }
        setVerificationError(message);
      })
      .finally(() => setIsLoadingVerification(false));
  }, []);

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPasswordResetError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordResetError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (!oobCode) return;

    setIsResettingPassword(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setPasswordResetSuccess(true);
    } catch (error: any) {
      setPasswordResetError(error.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const renderContent = () => {
    if (isLoadingVerification) return <p>กำลังตรวจสอบลิงก์...</p>;
    if (verificationError) return (
      <>
        <h2 className="text-2xl font-semibold text-accent mb-4">เกิดข้อผิดพลาด</h2>
        <p className="mb-6">{verificationError}</p>
        <Button onClick={() => router.push('/login')} variant="primary">กลับไปหน้าเข้าสู่ระบบ</Button>
      </>
    );
    if (passwordResetSuccess) return (
      <>
        <h2 className="text-2xl font-semibold text-brandGreen mb-4">✅ ตั้งรหัสผ่านใหม่สำเร็จแล้ว!</h2>
        <Button onClick={() => router.push('/login')} variant="primary">ไปยังหน้าเข้าสู่ระบบ</Button>
      </>
    );
    return (
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-neutral-DEFAULT">
        <h2 className="text-2xl font-sans font-semibold text-brandGreen mb-2 text-center">🔑 ตั้งรหัสผ่านใหม่</h2>
        {emailForReset && <p className="text-sm text-center text-neutral-medium mb-6">สำหรับบัญชี: {emailForReset}</p>}
        <form onSubmit={handlePasswordResetSubmit} className="space-y-5">
          <div>
            <label htmlFor="newPassword">รหัสผ่านใหม่</label>
            <input ref={newPasswordRef} type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="confirmNewPassword">ยืนยันรหัสผ่านใหม่</label>
            <input type="password" id="confirmNewPassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
          </div>
          {passwordResetError && <p className="text-red-500 text-xs text-center">{passwordResetError}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isResettingPassword}>{isResettingPassword ? 'กำลังรีเซ็ต...' : 'ยืนยัน'}</Button>
        </form>
      </div>
    );
  };

  return <div className="flex flex-col items-center justify-center min-h-screen p-4">{renderContent()}</div>;
};
