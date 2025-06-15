
import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendResetEmail: (email: string) => Promise<string | void>; // Returns error message string or void for success
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
      // Focus the email input when the modal opens
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
    const result = await onSendResetEmail(email);
    setIsLoading(false);

    if (typeof result === 'string') {
      setError(result);
    } else {
      setSuccessMessage('หากอีเมลนี้มีอยู่ในระบบของเรา คุณจะได้รับอีเมลพร้อมคำแนะนำในการรีเซ็ตรหัสผ่านในไม่ช้า');
      setEmail(''); // Clear email field on success
    }
  };

  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border rounded-[10px] text-neutral-dark dark:text-dark-text font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  // Consistent green focus style with login/registration
  const inputFocusStyle = "focus:border-brandGreen dark:focus:border-dark-brandGreen-DEFAULT focus:ring-2 focus:ring-brandGreen focus:ring-opacity-70 dark:focus:ring-dark-brandGreen-DEFAULT dark:focus:ring-opacity-70";
  const inputErrorStyle = "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔑 ลืมรหัสผ่าน?">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm font-serif text-neutral-dark dark:text-dark-textMuted">
          กรอกอีเมลที่คุณใช้ลงทะเบียนเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
        </p>
        <div>
          <label htmlFor="resetEmail" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
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
            className={`${inputBaseStyle} ${error ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`}
            placeholder="your.email@example.com"
            disabled={isLoading}
          />
          {error && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1">{error}</p>}
        </div>

        {successMessage && (
          <div className="p-3 bg-green-50 dark:bg-green-700/20 border border-green-300 dark:border-green-600/40 rounded-md text-sm text-green-700 dark:text-green-200 font-sans">
            {successMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            variant="login" // Use 'login' variant for brandGreen styling
            className="w-full sm:flex-grow"
            disabled={isLoading}
            size="md"
          >
            {isLoading ? 'กำลังส่ง...' : '📧 ส่งอีเมลรีเซ็ต'}
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            colorScheme="neutral" // Kept neutral for cancel, or could be brandGreen outline
            className="w-full sm:w-auto"
            disabled={isLoading}
            size="md"
          >
            ยกเลิก
          </Button>
        </div>
      </form>
    </Modal>
  );
};
