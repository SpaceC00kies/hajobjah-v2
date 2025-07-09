



import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebaseConfig.ts'; // Firebase auth instance
import { verifyPasswordResetCode, confirmPasswordReset, type AuthError } from '@firebase/auth';
import { Button } from './Button.tsx';
import { View } from '../types/types.ts';

interface PasswordResetPageProps {
  navigateTo: (view: View) => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ navigateTo }) => {
  const [oobCode, setOobCode] = useState<string | null>(null);
  // mode is read but not directly used in logic beyond initial check, oobCode is key
  // const [mode, setMode] = useState<string | null>(null); 

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

    // setMode(_modeParam); // Store if needed for other UI logic
    setOobCode(_codeParam);

    if (_modeParam !== 'resetPassword' || !_codeParam) {
      setVerificationError('ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้องหรือไม่สมบูรณ์ โปรดลองขอลิงก์ใหม่อีกครั้ง');
      setIsLoadingVerification(false);
      setIsCodeVerified(false);
      return;
    }

    verifyPasswordResetCode(auth, _codeParam)
      .then((email) => {
        setEmailForReset(email);
        setIsCodeVerified(true);
        setVerificationError(null);
      })
      .catch((error: AuthError) => {
        let message = 'ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว โปรดลองขอลิงก์ใหม่อีกครั้ง';
        // Firebase specific error codes can provide more context
        const errorCode = (error as any).code;
        if (errorCode === 'auth/invalid-action-code') {
          message = 'ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้อง ถูกใช้ไปแล้ว หรือหมดอายุแล้ว โปรดลองขอลิงก์ใหม่อีกครั้ง';
        }
        setVerificationError(message);
        setIsCodeVerified(false);
      })
      .finally(() => {
        setIsLoadingVerification(false);
      });
  }, []);

  useEffect(() => {
    if (isCodeVerified && !passwordResetSuccess && newPasswordRef.current) {
      newPasswordRef.current.focus();
    }
  }, [isCodeVerified, passwordResetSuccess]);

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResetError(null);
    setPasswordResetSuccess(false);

    if (!newPassword || !confirmNewPassword) {
      setPasswordResetError('กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordResetError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }
    // Basic password strength check (Firebase also does this server-side)
    if (newPassword.length < 6) {
      setPasswordResetError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (!oobCode) {
      setPasswordResetError('ไม่พบรหัสสำหรับรีเซ็ต โปรดลองใช้ลิงก์อีกครั้ง');
      return;
    }

    setIsResettingPassword(true);
    confirmPasswordReset(auth, oobCode, newPassword)
      .then(() => {
        setPasswordResetSuccess(true);
        setPasswordResetError(null);
        setNewPassword('');
        setConfirmNewPassword('');
      })
      .catch((error: AuthError) => {
        let message = 'ไม่สามารถรีเซ็ตรหัสผ่านได้ โปรดลองอีกครั้ง';
        const errorCode = (error as any).code;
        if (errorCode === 'auth/weak-password') {
          message = 'รหัสผ่านใหม่อ่อนแอเกินไป โปรดเลือกรหัสผ่านที่คาดเดายากกว่านี้';
        } else if (errorCode === 'auth/invalid-action-code') {
          message = 'ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว โปรดลองขอลิงก์ใหม่อีกครั้ง';
        }
        setPasswordResetError(message);
        setPasswordResetSuccess(false);
      })
      .finally(() => {
        setIsResettingPassword(false);
      });
  };

  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-sans font-normal focus:outline-none";
  const inputFocusStyle = "focus:border-brandGreen focus:ring-1 focus:ring-brandGreen focus:ring-opacity-50";
  const inputErrorStyle = "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:ring-opacity-50";

  const renderContent = () => {
    if (isLoadingVerification) {
      return <p className="text-xl font-sans text-neutral-dark">กำลังตรวจสอบลิงก์...</p>;
    }

    if (verificationError) {
      return (
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center border border-neutral-DEFAULT">
          <h2 className="text-2xl font-sans font-semibold text-accent mb-4">เกิดข้อผิดพลาด</h2>
          <p className="text-neutral-dark mb-6 font-normal">{verificationError}</p>
          <Button onClick={() => navigateTo(View.Login)} variant="login" size="md">
            กลับไปหน้าเข้าสู่ระบบ
          </Button>
        </div>
      );
    }
    
    if (!isCodeVerified && !isLoadingVerification) { // Fallback for unhandled invalid states
        return (
             <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center border border-neutral-DEFAULT">
                <h2 className="text-2xl font-sans font-semibold text-accent mb-4">ลิงก์ไม่ถูกต้อง</h2>
                <p className="text-neutral-dark mb-6 font-normal">
                    ลิงก์สำหรับรีเซ็ตรหัสผ่านนี้ไม่ถูกต้อง อาจเกิดจากการพิมพ์ผิด, ถูกใช้ไปแล้ว, หรือหมดอายุ
                </p>
                <Button onClick={() => navigateTo(View.Login)} variant="login" size="md">
                    ขอลืมรหัสผ่านอีกครั้ง
                </Button>
            </div>
        );
    }


    return (
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-neutral-DEFAULT">
        <h2 className="text-2xl font-sans font-semibold text-brandGreen mb-2 text-center">
          🔑 ตั้งรหัสผ่านใหม่
        </h2>
        {emailForReset && (
          <p className="text-sm font-sans text-neutral-medium mb-6 text-center">
            กรอกรหัสผ่านใหม่สำหรับบัญชี: {emailForReset}
          </p>
        )}

        {passwordResetSuccess ? (
          <div className="text-center">
            <p className="text-green-600 font-sans mb-4 text-lg">
              ✅ ตั้งรหัสผ่านใหม่สำเร็จแล้ว!
            </p>
            <Button onClick={() => navigateTo(View.Login)} variant="login" size="md">
              ไปยังหน้าเข้าสู่ระบบ
            </Button>
          </div>
        ) : (
          <form onSubmit={handlePasswordResetSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-sans font-medium text-neutral-dark mb-1"
              >
                รหัสผ่านใหม่
              </label>
              <input
                ref={newPasswordRef}
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`${inputBaseStyle} ${passwordResetError && (newPassword === '' || newPassword !== confirmNewPassword) ? inputErrorStyle : inputFocusStyle}`}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                disabled={isResettingPassword}
                required
                aria-required="true"
              />
            </div>
            <div>
              <label
                htmlFor="confirmNewPassword"
                className="block text-sm font-sans font-medium text-neutral-dark mb-1"
              >
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className={`${inputBaseStyle} ${passwordResetError && (confirmNewPassword === '' || newPassword !== confirmNewPassword) ? inputErrorStyle : inputFocusStyle}`}
                placeholder="ยืนยันรหัสผ่านใหม่อีกครั้ง"
                disabled={isResettingPassword}
                required
                aria-required="true"
              />
            </div>

            {passwordResetError && (
              <p className="text-red-500 font-sans text-xs text-center">{passwordResetError}</p>
            )}

            <Button type="submit" variant="login" size="lg" className="w-full" disabled={isResettingPassword}>
              {isResettingPassword ? 'กำลังรีเซ็ต...' : 'ยืนยันรหัสผ่านใหม่'}
            </Button>
          </form>
        )}
         <p className="text-center text-xs font-sans text-neutral-medium mt-6">
            จำรหัสผ่านได้แล้ว?{' '}
            <button
            type="button"
            onClick={() => navigateTo(View.Login)}
            className="font-sans font-medium text-brandGreen hover:underline"
            >
            เข้าสู่ระบบที่นี่
            </button>
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-neutral-light">
      {renderContent()}
    </div>
  );
};