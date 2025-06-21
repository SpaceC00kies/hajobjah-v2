
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { GenderOption, HelperEducationLevelOption } from '../types';
import { Button } from './Button';

interface RegistrationFormProps {
  onRegister: (userData: Omit<User, 'id' | 'photo' | 'address' | 'userLevel' | 'profileComplete' | 'isMuted' | 'nickname' | 'firstName' | 'lastName' | 'role' | 'postingLimits' | 'activityBadge' | 'favoriteMusic' | 'favoriteBook' | 'favoriteMovie' | 'hobbies' | 'favoriteFood' | 'dislikedThing' | 'introSentence' | 'createdAt' | 'updatedAt' | 'savedWebboardPosts'> & { password: string }) => Promise<boolean>;
  onSwitchToLogin: () => void;
}

type RegistrationFormErrorKeys =
  'publicDisplayName' | 'username' | 'email' | 'password' | 'confirmPassword' |
  'mobile' | 'lineId' | 'facebook' | 'gender' | 'birthdate' | 'educationLevel' | 'general';

const isValidThaiMobileNumber = (mobile: string): boolean => {
  if (!mobile) return false;
  const cleaned = mobile.replace(/[\s-]/g, ''); // Remove spaces and hyphens
  return /^0[689]\d{8}$/.test(cleaned); // 10 digits, starting 06, 08, 09
};

const calculateAge = (birthdateString?: string): number | null => {
  if (!birthdateString) return null;
  const birthDate = new Date(birthdateString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  if (birthDate > today) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

interface PasswordCriteria {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  symbol: boolean;
}

const SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
const PUBLIC_DISPLAY_NAME_REGEX = /^[a-zA-Zก-๏\s.]{2,30}$/u;


export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister, onSwitchToLogin }) => {
  const [publicDisplayName, setPublicDisplayName] = useState(''); 
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [lineId, setLineId] = useState('');
  const [facebook, setFacebook] = useState('');
  const [gender, setGender] = useState<GenderOption | undefined>(undefined);
  const [birthdate, setBirthdate] = useState('');
  const [educationLevel, setEducationLevel] = useState<HelperEducationLevelOption | undefined>(undefined);
  const [currentAge, setCurrentAge] = useState<number | null>(null);

  const [errors, setErrors] = useState<Partial<Record<RegistrationFormErrorKeys, string>>>({});
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  const brandGreenFocusStyle = "focus:!border-brandGreen focus:!ring-1 focus:!ring-brandGreen focus:!bg-gray-50/70";

  const handleBirthdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBirthdate = e.target.value;
    setBirthdate(newBirthdate);
    const age = calculateAge(newBirthdate);
    setCurrentAge(age);
    if (age !== null || newBirthdate === '') {
        setErrors(prev => ({ ...prev, birthdate: undefined }));
    }
  };

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
      newErrors.publicDisplayName = 'ต้องมี 2-30 ตัวอักษร (ไทย/อังกฤษ, เว้นวรรค, จุด)';
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

    if (!gender) newErrors.gender = 'กรุณาเลือกเพศ';
    if (!birthdate) newErrors.birthdate = 'กรุณาเลือกวันเกิด';
    else if (calculateAge(birthdate) === null) newErrors.birthdate = 'กรุณาเลือกวันเกิดที่ถูกต้อง (ต้องไม่ใช่วันในอนาคต)';

    if (!educationLevel || educationLevel === HelperEducationLevelOption.NotStated) newErrors.educationLevel = 'กรุณาเลือกระดับการศึกษา';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) return;

    const formDataToSubmit = {
        publicDisplayName, 
        username,
        email,
        password,
        mobile,
        lineId: lineId || undefined, 
        facebook: facebook || undefined,
        gender,
        birthdate,
        educationLevel,
    };

    const success = await onRegister(formDataToSubmit as any); 
    if (success) {
      setPublicDisplayName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setMobile('');
      setLineId('');
      setFacebook('');
      setGender(undefined);
      setBirthdate('');
      setEducationLevel(undefined);
      setCurrentAge(null);
      setPasswordCriteria({ length: false, uppercase: false, lowercase: false, number: false, symbol: false });
    }
  };

  const PasswordCriteriaDisplay: React.FC<{ criteria: PasswordCriteria }> = ({ criteria }) => {
    const getItemClass = (isMet: boolean) => isMet ? 'text-green-600' : 'text-red-500';
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
      <h2 className="text-3xl font-sans font-semibold text-brandGreen mb-6 text-center">สร้างบัญชีใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
            <label htmlFor="publicDisplayName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อที่แสดงบนเว็บไซต์ (สาธารณะ) <span className="text-red-500">*</span></label>
            <input type="text" id="publicDisplayName" value={publicDisplayName} onChange={(e) => setPublicDisplayName(e.target.value)}
                    className={`w-full ${errors.publicDisplayName ? 'input-error' : brandGreenFocusStyle}`} placeholder="เช่น Sunny Y., ช่างภาพใจดี123"/>
            <p className="text-xs font-sans text-neutral-medium mt-1">
              ชื่อนี้จะแสดงบนที่สาธารณะ เช่น ประกาศงาน, โปรไฟล์และกระทู้ โปรดตั้งอย่างเหมาะสม (เช่น ชื่อจริงและนามสกุลย่อ Sunny J., หรือเกี่ยวกับตัวเรา นักการตลาดมือฉมัง1993) ห้ามใช้คำหยาบหรือสื่ออะไรที่ไม่เหมาะสม
            </p>
            {errors.publicDisplayName && <p className="text-red-500 font-sans text-xs mt-1">{errors.publicDisplayName}</p>}
            </div>
            <div>
            <label htmlFor="username" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อผู้ใช้ (สำหรับเข้าระบบ) <span className="text-red-500">*</span></label>
            <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className={`w-full ${errors.username ? 'input-error' : brandGreenFocusStyle}`} placeholder="เช่น somchai_j (อังกฤษ/ตัวเลข)"/>
            {errors.username && <p className="text-red-500 font-sans text-xs mt-1">{errors.username}</p>}
            </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-sans font-medium text-neutral-dark mb-1">อีเมล <span className="text-red-500">*</span></label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                 className={`w-full ${errors.email ? 'input-error' : brandGreenFocusStyle}`} placeholder="เช่น user@example.com"/>
          {errors.email && <p className="text-red-500 font-sans text-xs mt-1">{errors.email}</p>}
        </div>

        <div className="pt-3 mt-3 border-t border-neutral-DEFAULT/50">
             <h3 className="text-md font-sans font-medium text-neutral-dark mb-2">ข้อมูลส่วนตัว (ใช้แสดงในโปรไฟล์)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                    <label className="block text-sm font-sans font-medium text-neutral-dark mb-1">เพศ <span className="text-red-500">*</span></label>
                    <div className="space-y-1">
                        {Object.values(GenderOption).map(optionValue => (
                        <label key={optionValue} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="gender" value={optionValue} checked={gender === optionValue}
                                    onChange={() => setGender(optionValue)}
                                    className="form-radio h-4 w-4 text-brandGreen border-[#CCCCCC] focus:ring-brandGreen"/>
                            <span className="text-neutral-dark font-sans font-normal text-sm">{optionValue}</span>
                        </label>
                        ))}
                    </div>
                    {errors.gender && <p className="text-red-500 font-sans text-xs mt-1">{errors.gender}</p>}
                </div>
                <div>
                    <label htmlFor="birthdate" className="block text-sm font-sans font-medium text-neutral-dark mb-1">วันเกิด <span className="text-red-500">*</span></label>
                    <input type="date" id="birthdate" value={birthdate} onChange={handleBirthdateChange}
                           max={new Date().toISOString().split("T")[0]} 
                           className={`w-full ${errors.birthdate ? 'input-error' : brandGreenFocusStyle}`} />
                    {currentAge !== null && <p className="text-xs font-sans text-neutral-dark mt-1">อายุ: {currentAge} ปี</p>}
                    {errors.birthdate && <p className="text-red-500 font-sans text-xs mt-1">{errors.birthdate}</p>}
                </div>
            </div>
            <div className="mt-4">
                <label htmlFor="educationLevel" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ระดับการศึกษา <span className="text-red-500">*</span></label>
                <select id="educationLevel" value={educationLevel || ''}
                        onChange={(e) => setEducationLevel(e.target.value as HelperEducationLevelOption)}
                        className={`w-full ${errors.educationLevel ? 'input-error' : brandGreenFocusStyle}`}>
                    <option value="" disabled>-- กรุณาเลือก --</option>
                    {Object.values(HelperEducationLevelOption).map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
                {errors.educationLevel && <p className="text-red-500 font-sans text-xs mt-1">{errors.educationLevel}</p>}
            </div>
        </div>


        <div className="pt-3 mt-3 border-t border-neutral-DEFAULT/50">
          <h3 className="text-md font-sans font-medium text-neutral-dark mb-2">ข้อมูลติดต่อ (จะแสดงในโพสต์ของคุณ)</h3>
            <div>
            <label htmlFor="mobile" className="block text-sm font-sans font-medium text-neutral-dark mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
            <input type="tel" id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)}
                    className={`w-full ${errors.mobile ? 'input-error' : brandGreenFocusStyle}`} placeholder="เช่น 0812345678"/>
            {errors.mobile && <p className="text-red-500 font-sans text-xs mt-1">{errors.mobile}</p>}
            </div>
            <div className="mt-4">
            <label htmlFor="lineId" className="block text-sm font-sans font-medium text-neutral-dark mb-1">LINE ID (ถ้ามี)</label>
            <input type="text" id="lineId" value={lineId} onChange={(e) => setLineId(e.target.value)}
                    className={`w-full ${brandGreenFocusStyle}`} placeholder="เช่น mylineid"/>
            </div>
            <div className="mt-4">
            <label htmlFor="facebook" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Facebook (ถ้ามี)</label>
            <input type="text" id="facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)}
                    className={`w-full ${brandGreenFocusStyle}`} placeholder="ลิงก์โปรไฟล์ หรือชื่อ Facebook"/>
            </div>
        </div>

        <div className="pt-3 mt-3 border-t border-neutral-DEFAULT/50">
            <h3 className="text-md font-sans font-medium text-neutral-dark mb-2">ตั้งรหัสผ่าน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                <label htmlFor="password" className="block text-sm font-sans font-medium text-neutral-dark mb-1">รหัสผ่าน <span className="text-red-500">*</span></label>
                <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        className={`w-full ${errors.password ? 'input-error' : brandGreenFocusStyle}`} placeholder="9-12 ตัวอักษร, ตัวใหญ่/เล็ก, เลข, สัญลักษณ์"/>
                {errors.password && <p className="text-red-500 font-sans text-xs mt-1">{errors.password}</p>}
                <PasswordCriteriaDisplay criteria={passwordCriteria} />
                </div>
                <div>
                <label htmlFor="confirmPassword" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ยืนยันรหัสผ่าน <span className="text-red-500">*</span></label>
                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full ${errors.confirmPassword ? 'input-error' : brandGreenFocusStyle}`} placeholder="กรอกรหัสผ่านอีกครั้ง"/>
                {errors.confirmPassword && <p className="text-red-500 font-sans text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
            </div>
        </div>

        {errors.general && <p className="text-red-500 font-sans text-sm text-center">{errors.general}</p>}
        <Button type="submit" variant="login" size="lg" className="w-full mt-6">ลงทะเบียน</Button>
        <p className="text-center text-sm font-serif text-neutral-dark font-normal">
          มีบัญชีอยู่แล้ว?{' '}
          <button type="button" onClick={onSwitchToLogin} className="font-sans font-medium text-brandGreen hover:underline">
            เข้าสู่ระบบที่นี่
          </button>
        </p>
      </form>
    </div>
  );
};
