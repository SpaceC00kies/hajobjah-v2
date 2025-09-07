

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isValidThaiMobileNumber } from '../utils/validation.ts';
import { useFormAccessibility } from '../hooks/useFormAccessibility.ts';

interface RegistrationFormProps {
  onRegister: (userData: Omit<User, 'id' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt' | 'savedWebboardPosts' | 'gender' | 'birthdate' | 'educationLevel' | 'lineId' | 'facebook'> & { password: string }) => Promise<boolean>;
  onSwitchToLogin: () => void;
}

type RegistrationFormErrorKeys =
  'publicDisplayName' | 'username' | 'email' | 'password' | 'confirmPassword' |
  'mobile' | 'businessName' | 'general';

const SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
const PUBLIC_DISPLAY_NAME_REGEX = /^[a-zA-Z0-9ก-๏\s.]{2,30}$/u; // Added 0-9

interface PasswordCriteria {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister, onSwitchToLogin }) => {
  const [publicDisplayName, setPublicDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [isBusinessProfile, setIsBusinessProfile] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [errors, setErrors] = useState<Partial<Record<RegistrationFormErrorKeys, string>>>({});
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  const {
    getInputProps,
    getLabelProps,
    getErrorProps,
    ErrorAnnouncement,
    handleValidationErrors
  } = useFormAccessibility();

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

    // Business profile validation
    if (isBusinessProfile && !businessName.trim()) {
      newErrors.businessName = 'กรุณากรอกชื่อธุรกิจ/ร้านค้า/บริษัท';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      // Enhanced accessibility for validation errors
      const errorRecord: Record<string, string> = {};
      Object.entries(errors).forEach(([key, value]) => {
        if (value) errorRecord[key] = value;
      });
      handleValidationErrors(errorRecord);
      return;
    }

    setIsLoading(true);
    const formDataToSubmit = {
      publicDisplayName,
      username,
      email,
      password,
      mobile,
      isBusinessProfile,
      businessName: isBusinessProfile ? businessName : '',
    };

    const success = await onRegister(formDataToSubmit as any);
    setIsLoading(false);
    if (success) {
      setPublicDisplayName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setMobile('');
      setIsBusinessProfile(false);
      setBusinessName('');
      setPasswordCriteria({ length: false, uppercase: false, lowercase: false, number: false, symbol: false });
      navigate('/');
    } else {
      const generalError = 'การลงทะเบียนล้มเหลว โปรดลองอีกครั้ง หรืออาจเป็นเพราะชื่อผู้ใช้หรืออีเมลนี้มีอยู่แล้ว';
      setErrors({ general: generalError });
      handleValidationErrors({ general: generalError });
    }
  };

  const PasswordCriteriaDisplay: React.FC<{ criteria: PasswordCriteria }> = ({ criteria }) => {
    const getItemClass = (isMet: boolean) => isMet ? 'text-green-600 font-medium' : 'text-text-tertiary';
    const getIcon = (isMet: boolean) => isMet ? '✓' : '○';

    return (
      <div className="bg-gray-50 rounded-lg p-3 mt-2">
        <p className="text-xs font-modern font-semibold text-text-secondary mb-2">รหัสผ่านต้องมี:</p>
        <ul className="text-xs font-modern space-y-1 grid grid-cols-1 gap-1">
          <li className={`flex items-center gap-2 ${getItemClass(criteria.length)}`}>
            <span className="w-4 text-center">{getIcon(criteria.length)}</span>
            <span>ความยาว 9-12 ตัวอักษร</span>
          </li>
          <li className={`flex items-center gap-2 ${getItemClass(criteria.uppercase)}`}>
            <span className="w-4 text-center">{getIcon(criteria.uppercase)}</span>
            <span>มีตัวพิมพ์ใหญ่ (A-Z)</span>
          </li>
          <li className={`flex items-center gap-2 ${getItemClass(criteria.lowercase)}`}>
            <span className="w-4 text-center">{getIcon(criteria.lowercase)}</span>
            <span>มีตัวพิมพ์เล็ก (a-z)</span>
          </li>
          <li className={`flex items-center gap-2 ${getItemClass(criteria.number)}`}>
            <span className="w-4 text-center">{getIcon(criteria.number)}</span>
            <span>มีตัวเลข (0-9)</span>
          </li>
          <li className={`flex items-center gap-2 ${getItemClass(criteria.symbol)}`}>
            <span className="w-4 text-center">{getIcon(criteria.symbol)}</span>
            <span>มีสัญลักษณ์พิเศษ (เช่น !@#$)</span>
          </li>
        </ul>
      </div>
    );
  };


  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 w-full max-w-lg border border-neutral-DEFAULT overflow-hidden p-6">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-sans font-bold text-primary mb-2 leading-tight">สร้างบัญชีใหม่</h2>
          <p className="text-text-secondary font-sans text-base">ยินดีต้อนรับสู่ HAJOBJA</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorAnnouncement />
          <div className="grid grid-cols-1 md:grid-cols-2 md:items-start gap-4">
            <div>
              <label {...getLabelProps('publicDisplayName', true)}>ชื่อสาธารณะบนเว็บ</label>
              <input
                type="text"
                value={publicDisplayName}
                onChange={(e) => setPublicDisplayName(e.target.value)}
                className={`form-input ${errors.publicDisplayName ? 'error' : ''}`}
                disabled={isLoading}
                autoComplete="name"
                {...getInputProps('publicDisplayName', !!errors.publicDisplayName, errors.publicDisplayName, '2-30 ตัวอักษร, ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด (.) เท่านั้น และเปลี่ยนได้ 2 ครั้งทุก 14 วัน')}
              />
              <p className="text-xs font-modern text-text-tertiary mt-1">
                2-30 ตัวอักษร, ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด (.) เท่านั้น และเปลี่ยนได้ 2 ครั้งทุก 14 วัน
              </p>
              {errors.publicDisplayName && <p {...getErrorProps('publicDisplayName')}>{errors.publicDisplayName}</p>}
            </div>
            <div>
              <label {...getLabelProps('username', true)}>ชื่อผู้ใช้ (สำหรับเข้าระบบ)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className={`form-input ${errors.username ? 'error' : ''}`}
                disabled={isLoading}
                autoComplete="username"
                {...getInputProps('username', !!errors.username, errors.username)}
              />
              {errors.username && <p {...getErrorProps('username')}>{errors.username}</p>}
            </div>
          </div>

          <div>
            <label {...getLabelProps('email', true)}>อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`form-input ${errors.email ? 'error' : ''}`}
              disabled={isLoading}
              autoComplete="email"
              {...getInputProps('email', !!errors.email, errors.email)}
            />
            {errors.email && <p {...getErrorProps('email')}>{errors.email}</p>}
          </div>

          <div className="pt-3 mt-3">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="isBusinessProfile"
                  checked={isBusinessProfile}
                  onChange={(e) => setIsBusinessProfile(e.target.checked)}
                  className="form-checkbox h-5 w-5 rounded focus:ring-2 focus:ring-offset-1 mt-0.5"
                  style={{ color: 'var(--primary-blue)', borderColor: 'var(--border-medium)' }}
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <label htmlFor="isBusinessProfile" className="cursor-pointer">
                    <span className="text-sm text-blue-800 font-modern">
                      🏢 โปรไฟล์นี้เป็นธุรกิจ/ร้านค้า
                    </span>
                  </label>
                </div>
              </div>

              {isBusinessProfile && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <label htmlFor="businessName" className="text-blue-800 font-modern text-sm block mb-1">
                    ชื่อธุรกิจ/ร้านค้า/บริษัท <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={`form-input ${errors.businessName ? 'error' : ''}`}
                    disabled={isLoading}
                    {...getInputProps('businessName', !!errors.businessName, errors.businessName)}
                  />
                  {errors.businessName && <p {...getErrorProps('businessName')}>{errors.businessName}</p>}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-neutral-DEFAULT/50">
            <h3 className="text-md font-sans font-medium text-neutral-dark mb-2">ข้อมูลติดต่อ</h3>
            <div>
              <label {...getLabelProps('mobile', true)}>เบอร์โทรศัพท์</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={`form-input ${errors.mobile ? 'error' : ''}`}
                disabled={isLoading}
                autoComplete="tel"
                {...getInputProps('mobile', !!errors.mobile, errors.mobile)}
              />
              {errors.mobile && <p {...getErrorProps('mobile')}>{errors.mobile}</p>}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-neutral-DEFAULT/50">
            <h3 className="text-md font-sans font-medium text-neutral-dark mb-2">ตั้งรหัสผ่าน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label {...getLabelProps('password', true)}>รหัสผ่าน</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                  {...getInputProps('password', !!errors.password, errors.password, 'รหัสผ่านต้องมีความยาว 9-12 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และสัญลักษณ์พิเศษ')}
                />
                {errors.password && <p {...getErrorProps('password')}>{errors.password}</p>}
                <PasswordCriteriaDisplay criteria={passwordCriteria} />
              </div>
              <div>
                <label {...getLabelProps('confirmPassword', true)}>ยืนยันรหัสผ่าน</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                  {...getInputProps('confirmPassword', !!errors.confirmPassword, errors.confirmPassword)}
                />
                {errors.confirmPassword && <p {...getErrorProps('confirmPassword')}>{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>

          {errors.general && (
            <div {...getErrorProps('general')} className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-600 font-sans text-sm font-medium">{errors.general}</p>
            </div>
          )}

          <div className="mt-2">
            <Button type="submit" variant="primary" size="lg" className="w-full font-sans font-semibold" disabled={isLoading} style={{ minHeight: '52px', fontSize: '16px' }}>
              {isLoading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
            </Button>
          </div>
          <div className="text-center pt-3 border-t border-gray-100 mt-3">
            <div className="text-text-secondary font-sans text-sm">
              <span>มีบัญชีอยู่แล้ว? </span>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="font-sans font-semibold text-primary hover:text-primary-hover transition-colors duration-200 focus:outline-none focus:text-primary-hover"
                disabled={isLoading}
              >
                เข้าสู่ระบบที่นี่
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};