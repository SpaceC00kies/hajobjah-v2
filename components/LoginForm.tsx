
import React, { useState } from 'react';
import { Button } from './Button';

interface LoginFormProps {
  onLogin: (loginIdentifier: string, passwordAttempt: string) => Promise<boolean>; // Returns true on success
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToRegister }) => {
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Can be username or email
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border border-[#CCCCCC] dark:border-dark-border rounded-[10px] text-neutral-dark dark:text-dark-text font-serif font-normal focus:outline-none";
  const inputFocusStyle = "focus:border-brandGreen dark:focus:border-dark-brandGreen-DEFAULT focus:ring-2 focus:ring-brandGreen focus:ring-opacity-70 dark:focus:ring-dark-brandGreen-DEFAULT dark:focus:ring-opacity-70";
  const inputErrorStyle = "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    if (!loginIdentifier.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน');
      return;
    }
    const success = await onLogin(loginIdentifier, password);
    if (!success) {
      // Error message is shown by App.tsx alert, but we can set local error for immediate feedback if needed.
      // For now, relying on alert.
    } else {
      setLoginIdentifier('');
      setPassword('');
    }
  };

  return (
    <div className="bg-white dark:bg-dark-cardBg p-8 rounded-xl shadow-2xl w-full max-w-md mx-auto my-10 border border-neutral-DEFAULT dark:border-dark-border">
      <h2 className="text-3xl font-sans font-semibold text-brandGreen dark:text-dark-brandGreen-DEFAULT mb-6 text-center">เข้าสู่ระบบ</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="loginIdentifier" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            ชื่อผู้ใช้ หรือ อีเมล
          </label>
          <input
            type="text"
            id="loginIdentifier"
            value={loginIdentifier}
            onChange={(e) => setLoginIdentifier(e.target.value)}
            className={`${inputBaseStyle} ${error ? inputErrorStyle : inputFocusStyle}`}
            placeholder="กรอกชื่อผู้ใช้หรืออีเมลของคุณ"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            รหัสผ่าน
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputBaseStyle} ${error ? inputErrorStyle : inputFocusStyle}`}
            placeholder="กรอกรหัสผ่าน"
          />
        </div>
        {error && <p className="text-red-500 font-sans dark:text-red-400 text-sm text-center">{error}</p>}
        <Button type="submit" variant="login" size="lg" className="w-full">
          เข้าสู่ระบบ
        </Button>
        <p className="text-center text-sm font-serif text-neutral-dark dark:text-dark-textMuted font-normal">
          ยังไม่มีบัญชี?{' '}
          <button type="button" onClick={onSwitchToRegister} className="font-sans font-medium text-brandGreen dark:text-dark-brandGreen-DEFAULT hover:underline">
            ลงทะเบียนที่นี่
          </button>
        </p>
      </form>
    </div>
  );
};
