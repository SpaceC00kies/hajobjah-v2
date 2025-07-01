
import React, { useState } from 'react';
import { Button } from './Button.tsx';

interface LoginFormProps {
  onLogin: (loginIdentifier: string, passwordAttempt: string) => Promise<boolean>; // Returns true on success
  onSwitchToRegister: () => void;
  onForgotPassword: () => void; 
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToRegister, onForgotPassword }) => {
  const [loginIdentifier, setLoginIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const brandGreenFocusStyle = "focus:!border-brandGreen focus:!ring-1 focus:!ring-brandGreen focus:!bg-gray-50/70";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    if (!loginIdentifier.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน');
      return;
    }
    const success = await onLogin(loginIdentifier, password);
    if (!success) {
      // Error message is shown by App.tsx alert
    } else {
      setLoginIdentifier('');
      setPassword('');
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-auto my-10 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-brandGreen mb-6 text-center">เข้าสู่ระบบ</h2>
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
            className={`w-full ${error && !password ? 'input-error' : brandGreenFocusStyle}`} // Apply error only if loginIdentifier might be the cause
            placeholder="กรอกชื่อผู้ใช้หรืออีเมลของคุณ"
          />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-sm font-sans font-medium text-neutral-dark">
              รหัสผ่าน
            </label>
            <button 
              type="button" 
              onClick={onForgotPassword} 
              className="text-xs font-sans text-neutral-medium hover:text-brandGreen hover:underline focus:outline-none"
            >
              ลืมรหัสผ่าน?
            </button>
          </div>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full ${error ? 'input-error' : brandGreenFocusStyle}`} // Apply error if any error exists
            placeholder="กรอกรหัสผ่าน"
          />
        </div>
        {error && <p className="text-red-500 font-sans text-sm text-center">{error}</p>}
        <Button type="submit" variant="login" size="lg" className="w-full">
          เข้าสู่ระบบ
        </Button>
        <p className="text-center text-sm font-serif text-neutral-dark font-normal">
          ยังไม่มีบัญชี?{' '}
          <button type="button" onClick={onSwitchToRegister} className="font-sans font-medium text-brandGreen hover:underline">
            ลงทะเบียนที่นี่
          </button>
        </p>
      </form>
    </div>
  );
};
