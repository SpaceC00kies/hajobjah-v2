
import React, { useState } from 'react';
import { Button } from './Button.tsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEnhancedFormAccessibility } from '../hooks/useWCAGCompliance.ts';

interface LoginFormProps {
  onLogin: (loginIdentifier: string, passwordAttempt: string) => Promise<boolean>; // Returns true on success
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToRegister, onForgotPassword }) => {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    getInputProps,
    getLabelProps,
    getErrorProps,
    AnnouncementRegion,
    setFieldError,
    clearAllErrors,
    hasErrors
  } = useEnhancedFormAccessibility();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Enhanced validation with WCAG 2.2 accessibility
    clearAllErrors();
    
    if (!loginIdentifier.trim()) {
      setFieldError('loginIdentifier', 'กรุณากรอกชื่อผู้ใช้หรืออีเมล');
    }
    if (!password) {
      setFieldError('password', 'กรุณากรอกรหัสผ่าน');
    }
    
    if (hasErrors) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    setIsLoading(true);
    const success = await onLogin(loginIdentifier, password);
    setIsLoading(false);

    if (success) {
      const from = location.state?.from?.pathname || '/';
      const fromState = { ...location.state?.from?.state };
      navigate(from, { state: fromState, replace: true });
      setLoginIdentifier('');
      setPassword('');
    } else {
      setError('ชื่อผู้ใช้/อีเมล หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 w-full max-w-md border border-neutral-DEFAULT overflow-hidden p-6">
        <div className="text-center mb-4">
          <h2 className="text-4xl font-sans font-bold text-primary mb-2 leading-tight">เข้าสู่ระบบ</h2>
          <p className="text-text-secondary font-sans text-base">เจอกันอีกแล้วนะเจ้าคนขยัน</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AnnouncementRegion />
          <div className="form-field-container">
            <label {...getLabelProps('loginIdentifier', true)}>
              ชื่อผู้ใช้ หรือ อีเมล
            </label>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              className="form-input"
              placeholder="กรอกชื่อผู้ใช้หรืออีเมลของคุณ"
              disabled={isLoading}
              autoComplete="username"
              {...getInputProps('loginIdentifier', false)}
            />
            {getErrorProps('loginIdentifier') && (
              <div {...getErrorProps('loginIdentifier')}>
                <span className="sr-only">Error: </span>
                <span aria-hidden="true">⚠️</span>
                {getErrorProps('loginIdentifier')?.children}
              </div>
            )}
          </div>
          <div className="form-field-container">
            <label {...getLabelProps('password', true)}>
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="กรอกรหัสผ่าน"
              disabled={isLoading}
              autoComplete="current-password"
              {...getInputProps('password', false)}
            />
            {getErrorProps('password') && (
              <div {...getErrorProps('password')}>
                <span className="sr-only">Error: </span>
                <span aria-hidden="true">⚠️</span>
                {getErrorProps('password')?.children}
              </div>
            )}
          </div>
          {error && (
            <div {...getErrorProps('login-form')} className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-600 font-sans text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="mt-2">
            <Button type="submit" variant="primary" size="lg" className="w-full font-sans font-semibold" disabled={isLoading} style={{ minHeight: '52px', fontSize: '16px' }}>
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>
          </div>

          <div className="text-center pt-3 border-t border-gray-100 mt-3">
            <div className="text-text-secondary font-sans text-sm">
              <span>ยังไม่มีบัญชี? </span>
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-sans font-semibold text-primary hover:text-primary-hover transition-colors duration-200 focus:outline-none focus:text-primary-hover"
                disabled={isLoading}
              >
                ลงทะเบียนที่นี่
              </button>
              <span> หรือ </span>
              <button
                type="button"
                onClick={onForgotPassword}
                className="font-sans font-semibold text-primary hover:text-primary-hover transition-colors duration-200 focus:outline-none focus:text-primary-hover"
                disabled={isLoading}
              >
                ลืมรหัสผ่าน
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
