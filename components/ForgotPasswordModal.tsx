

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';
import type { View } from '../types/types.ts';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendResetEmail: (email: string) => Promise<string | void>; 
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSendResetEmail,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError(null);
      setSuccessMessage(null);
      setIsLoading(false);
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const isValidEmail = (emailToTest: string): boolean => {
    return /\S+@\S+\.\S+/.test(emailToTest);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('กรุณากรอกอีเมลของคุณ');
      return;
    }
    if (!isValidEmail(email)) {
      setError('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    setIsLoading(true);
    try {
      await onSendResetEmail(email);
      setSuccessMessage('หากอีเมลนี้มีอยู่ในระบบของเรา คุณจะได้รับอีเมลพร้อมคำแนะนำในการรีเซ็ตรหัสผ่านในไม่ช้า');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการส่งอีเมล');
    } finally {
      setIsLoading(false);
    }
  };

  const modalDescription = "กรอกอีเมลที่คุณใช้ลงทะเบียนเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่";

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="🔑 ลืมรหัสผ่าน?"
      description={modalDescription}
      initialFocusRef={emailInputRef}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm font-serif text-neutral-dark">
          กรอกอีเมลที่คุณใช้ลงทะเบียนเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
        </p>
        <div>
          <label htmlFor="resetEmail" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            อีเมล:
          </label>
          <input
            ref={emailInputRef}
            type="email"
            id="resetEmail"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
              if (successMessage) setSuccessMessage(null);
            }}
            className={`w-full focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 ${error ? 'input-error border-red-500' : ''}`}
            placeholder="your.email@example.com"
            disabled={isLoading}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'email-error' : 'email-help'}
            required
          />
          <p id="email-help" className="text-xs text-neutral-dark mt-1">
            ใส่อีเมลที่คุณใช้สมัครสมาชิก
          </p>
          {error && (
            <p id="email-error" className="text-red-500 font-sans text-xs mt-1" role="alert">
              {error}
            </p>
          )}
        </div>

        {successMessage && (
          <div className="p-3 bg-green-50 border border-green-300 rounded-md text-sm text-green-700 font-sans" role="status" aria-live="polite">
            {successMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            variant="primary" 
            size="md"
            className="w-full sm:flex-grow"
            disabled={isLoading}
            aria-describedby={isLoading ? 'submit-status' : undefined}
          >
            {isLoading ? 'กำลังส่ง...' : '📧 ส่งอีเมลรีเซ็ต'}
          </Button>
          {isLoading && (
            <span id="submit-status" className="sr-only">กำลังส่งอีเมลรีเซ็ตรหัสผ่าน</span>
          )}
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            colorScheme="neutral" 
            size="md"
            className="w-full sm:w-auto"
            disabled={isLoading}
          >
            ยกเลิก
          </Button>
        </div>
      </form>
    </Modal>
  );
};