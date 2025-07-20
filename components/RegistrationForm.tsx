"use client";


import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isValidThaiMobileNumber } from '../utils/validation.ts';
import { useAuthActions } from '../hooks/useAuthActions.ts';

type RegistrationFormErrorKeys =
  'publicDisplayName' | 'username' | 'email' | 'password' | 'confirmPassword' |
  'mobile' | 'general';

const SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
const PUBLIC_DISPLAY_NAME_REGEX = /^[a-zA-Z0-9ก-๏\s.]{2,30}$/u; // Added 0-9

interface PasswordCriteria {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
}

export const RegistrationForm: React.FC = () => {
  const [publicDisplayName, setPublicDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [errors, setErrors] = useState<Partial<Record<RegistrationFormErrorKeys, string>>>({});
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  const router = useRouter();
  const { register } = useAuthActions();

  useEffect(() => {
    const newCriteria: PasswordCriteria = {
      length: password.length >= 9 && password.length <= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: SYMBOL_REGEX.test(password),
    };
    setPasswordCriteria(newCriteria);
  }, [password]);

  const validateForm = () => {
    const newErrors: Partial<Record<RegistrationFormErrorKeys, string>> = {};
    if (!publicDisplayName.trim()) {
      newErrors.publicDisplayName = 'กรุณากรอกชื่อที่ต้องการให้แสดงบนเว็บไซต์';
    } else if (!PUBLIC_DISPLAY_NAME_REGEX.test(publicDisplayName)) {
      newErrors.publicDisplayName = 'ต้องมี 2-30 ตัวอักษร (ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด)';
    }

    if (!username.trim()) newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
    else if (username.trim().length < 3) newErrors.username = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร';
    else if (!/^[a-zA-Z0-9_]+$/.test(username)) newErrors.username = 'ชื่อผู้ใช้สามารถมีเฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข และ _ เท่านั้น';

    if (!email.trim()) newErrors.email = 'กรุณากรอกอีเมล';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';

    if (!password) {
      newErrors.password = 'กรุณากรอกรหัสผ่าน';
    } else {
      const criteriaMessages = [];
      if (!passwordCriteria.length) criteriaMessages.push('ความยาว 9-12 ตัวอักษร');
      if (!passwordCriteria.uppercase) criteriaMessages.push('ตัวพิมพ์ใหญ่ (A-Z)');
      if (!passwordCriteria.lowercase) criteriaMessages.push('ตัวพิมพ์เล็ก (a-z)');
      if (!passwordCriteria.number) criteriaMessages.push('ตัวเลข (0-9)');
      if (!passwordCriteria.symbol) criteriaMessages.push('สัญลักษณ์พิเศษ');
      if (criteriaMessages.length > 0) {
        newErrors.password = `รหัสผ่านต้องประกอบด้วย: ${criteriaMessages.join(', ')}`;
      }
    }

    if (password !== confirmPassword) newErrors.confirmPassword = 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน';

    if (!mobile.trim()) newErrors.mobile = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!isValidThaiMobileNumber(mobile)) newErrors.mobile = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 08X-XXX-XXXX)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) return;
    
    setIsLoading(true);
    const formDataToSubmit = {
        publicDisplayName,
        username,
        email,
        password,
        mobile,
    };

    const success = await register(formDataToSubmit as any);
    setIsLoading(false);
    if (success) {
      alert('ลงทะเบียนสำเร็จ! กรุณาเข้าสู่ระบบ');
      router.push('/login');
    } else {
        setErrors({ general: 'การลงทะเบียนล้มเหลว โปรดลองอีกครั้ง หรืออาจเป็นเพราะชื่อผู้ใช้หรืออีเมลนี้มีอยู่แล้ว' });
    }
  };

  const PasswordCriteriaDisplay: React.FC<{ criteria: PasswordCriteria }> = ({ criteria }) => {
    const getItemClass = (isMet: boolean) => isMet ? 'text-brandGreen' : 'text-accent';
    const getIcon = (isMet: boolean) => isMet ? '✓' : '✗';

    return (
      <ul className="text-xs font-sans mt-1 space-y-0.5">
        <li className={getItemClass(criteria.length)}>{getIcon(criteria.length)} ความยาว 9-12 ตัวอักษร</li>
        <li className={getItemClass(criteria.uppercase)}>{getIcon(criteria.uppercase)} มีตัวพิมพ์ใหญ่ (A-Z)</li>
        <li className={getItemClass(criteria.lowercase)}>{getIcon(criteria.lowercase)} มีตัวพิมพ์เล็ก (a-z)</li>
        <li className={getItemClass(criteria.number)}>{getIcon(criteria.number)} มีตัวเลข (0-9)</li>
        <li className={getItemClass(criteria.symbol)}>{getIcon(criteria.symbol)} มีสัญลักษณ์พิเศษ (เช่น !@#$)</li>
      </ul>
    );
  };


  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto my-10 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-primary-dark mb-6 text-center">สร้างบัญชีใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
            <label htmlFor="publicDisplayName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อที่แสดงบนเว็บไซต์ (สาธารณะ) <span className="text-red-500">*</span></label>
            <input type="text" id="publicDisplayName" value={publicDisplayName} onChange={(e) => setPublicDisplayName(e.target.value)}
                    className={`w-full ${errors.publicDisplayName ? 'input-error' : ''}`} placeholder="เช่น Sunny Y., ช่างภาพใจดี123" disabled={isLoading} />
            <p className="text-xs font-sans text-neutral-medium mt-1">
              ชื่อแสดงสาธารณะ (2-30 ตัวอักษร): ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด (.) เท่านั้น เช่น Sunny J. 123
            </p>
            {errors.publicDisplayName && <p className="text-red-500 font-sans text-xs mt-1">{errors.publicDisplayName}</p>}
            </div>
            <div>
            <label htmlFor="username" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อผู้ใช้ (สำหรับเข้าระบบ) <span className="text-red-500">*</span></label>
            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className={`w-full ${errors.username ? 'input-error' : ''}`} placeholder="เช่น somchai_j (อังกฤษ/ตัวเลข)" disabled={isLoading} />
            {errors.username && <p className="text-red-500 font-sans text-xs mt-1">{errors.username}</p>}
            </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-sans font-medium text-neutral-dark mb-1">อีเมล <span className="text-red-500">*</span></label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 className={`w-full ${errors.email ? 'input-error' : ''}`} placeholder="เช่น user@example.com" disabled={isLoading} />
          {errors.email && <p className="text-red-500 font-sans text-xs mt-1">{errors.email}</p>}
        </div>

        <div className="pt-3 mt-3 border-t border-neutral-DEFAULT/50">
          <h3 className="text-md font-sans font-medium text-neutral-dark mb-2">ข้อมูลติดต่อ (จะแสดงในโพสต์ของคุณ)</h3>
            <div>
            <label htmlFor="mobile" className="block text-sm font-sans font-medium text-neutral-dark mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
            <input type="tel" id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)}
                    className={`w-full ${errors.mobile ? 'input-error' : ''}`} placeholder="เช่น 0812345678" disabled={isLoading}/>
            {errors.mobile && <p className="text-red-500 font-sans text-xs mt-1">{errors.mobile}</p>}
            </div>
        </div>

        <div className="pt-3 mt-3 border-t border-neutral-DEFAULT/50">
            <h3 className="text-md font-sans font-medium text-neutral-dark mb-2">ตั้งรหัสผ่าน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                <label htmlFor="password" className="block text-sm font-sans font-medium text-neutral-dark mb-1">รหัสผ่าน <span className="text-red-500">*</span></label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        className={`w-full ${errors.password ? 'input-error' : ''}`} placeholder="9-12 ตัวอักษร, ตัวใหญ่/เล็ก, เลข, สัญลักษณ์" disabled={isLoading}/>
                {errors.password && <p className="text-red-500 font-sans text-xs mt-1">{errors.password}</p>}
                <PasswordCriteriaDisplay criteria={passwordCriteria} />
                </div>
                <div>
                <label htmlFor="confirmPassword" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ยืนยันรหัสผ่าน <span className="text-red-500">*</span></label>
                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full ${errors.confirmPassword ? 'input-error' : ''}`} placeholder="กรอกรหัสผ่านอีกครั้ง" disabled={isLoading}/>
                {errors.confirmPassword && <p className="text-red-500 font-sans text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
            </div>
        </div>

        {errors.general && <p className="text-red-500 font-sans text-sm text-center">{errors.general}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
        </Button>
        <p className="text-center text-sm font-serif text-neutral-dark font-normal">
          มีบัญชีอยู่แล้ว?{' '}
          <Link href="/login" className="font-sans font-medium text-primary hover:underline">
            เข้าสู่ระบบที่นี่
          </Link>
        </p>
      </form>
    </div>
  );
};
