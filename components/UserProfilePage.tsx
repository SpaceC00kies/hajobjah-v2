
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types/types.ts';
import { GenderOption, HelperEducationLevelOption } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isValidThaiMobileNumber } from '../utils/validation.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileCompletenessWizard } from './ProfileCompletenessWizard.tsx';


interface UserProfilePageProps {
  currentUser: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<boolean>;
  onCancel: () => void;
}

type UserProfileFormErrorKeys = 'publicDisplayName' | 'mobile' | 'gender' | 'birthdate' | 'educationLevel' | 'general' | 'photo' | 'businessWebsite' | 'businessSocialProfileLink';
type FeedbackType = { type: 'success' | 'error'; message: string };
const PUBLIC_DISPLAY_NAME_REGEX_PROFILE = /^[a-zA-Z0-9ก-๏\s.]{2,30}$/u;


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

const FallbackAvatar: React.FC<{ name?: string, size?: string, className?: string }> = ({ name, size = "w-32 h-32", className = "" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral flex items-center justify-center text-4xl font-sans text-white shadow-md ${className}`}>
      {initial}
    </div>
  );
};

const DISPLAY_NAME_COOLDOWN_DAYS_UI = 14;

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ currentUser, onUpdateProfile, onCancel }) => {
  const [formState, setFormState] = useState({
    publicDisplayName: currentUser.publicDisplayName,
    mobile: currentUser.mobile,
    lineId: currentUser.lineId || '',
    facebook: currentUser.facebook || '',
    gender: currentUser.gender || GenderOption.NotSpecified,
    birthdate: currentUser.birthdate || '',
    educationLevel: currentUser.educationLevel || HelperEducationLevelOption.NotStated,
    address: currentUser.address || '',
    photo: currentUser.photo,
    nickname: currentUser.nickname || '',
    firstName: currentUser.firstName || '',
    lastName: currentUser.lastName || '',
    favoriteMusic: currentUser.favoriteMusic || '',
    favoriteBook: currentUser.favoriteBook || '',
    favoriteMovie: currentUser.favoriteMovie || '',
    hobbies: currentUser.hobbies || '',
    favoriteFood: currentUser.favoriteFood || '',
    dislikedThing: currentUser.dislikedThing || '',
    introSentence: currentUser.introSentence || '',
    isBusinessProfile: currentUser.isBusinessProfile || false,
    businessName: currentUser.businessName || '',
    businessType: currentUser.businessType || '',
    aboutBusiness: currentUser.aboutBusiness || '',
    businessAddress: currentUser.businessAddress || '',
    businessWebsite: currentUser.businessWebsite || '',
    businessSocialProfileLink: currentUser.businessSocialProfileLink || '',
  });
  
  const [currentAge, setCurrentAge] = useState<number | null>(calculateAge(currentUser.birthdate));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<UserProfileFormErrorKeys, string>>>({});
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [displayNameCooldownInfo, setDisplayNameCooldownInfo] = useState<{ canChange: boolean; message?: string }>({ canChange: true });

  useEffect(() => {
    // This effect synchronizes the form with external changes to currentUser,
    // but crucially, it does not reset the feedback message.
    setFormState({
      publicDisplayName: currentUser.publicDisplayName,
      mobile: currentUser.mobile,
      lineId: currentUser.lineId || '',
      facebook: currentUser.facebook || '',
      gender: currentUser.gender || GenderOption.NotSpecified,
      birthdate: currentUser.birthdate || '',
      educationLevel: currentUser.educationLevel || HelperEducationLevelOption.NotStated,
      address: currentUser.address || '',
      photo: currentUser.photo,
      nickname: currentUser.nickname || '',
      firstName: currentUser.firstName || '',
      lastName: currentUser.lastName || '',
      favoriteMusic: currentUser.favoriteMusic || '',
      favoriteBook: currentUser.favoriteBook || '',
      favoriteMovie: currentUser.favoriteMovie || '',
      hobbies: currentUser.hobbies || '',
      favoriteFood: currentUser.favoriteFood || '',
      dislikedThing: currentUser.dislikedThing || '',
      introSentence: currentUser.introSentence || '',
      isBusinessProfile: currentUser.isBusinessProfile || false,
      businessName: currentUser.businessName || '',
      businessType: currentUser.businessType || '',
      aboutBusiness: currentUser.aboutBusiness || '',
      businessAddress: currentUser.businessAddress || '',
      businessWebsite: currentUser.businessWebsite || '',
      businessSocialProfileLink: currentUser.businessSocialProfileLink || '',
    });
    setCurrentAge(calculateAge(currentUser.birthdate));

    // Also re-evaluate cooldown info when user data changes
    const updateCount = currentUser.publicDisplayNameUpdateCount || 0;
    const lastChange = currentUser.lastPublicDisplayNameChangeAt;
    if (updateCount > 0 && lastChange) {
      const lastChangeDate = typeof lastChange === 'string' ? new Date(lastChange) : (lastChange as any).toDate(); // Handle Firestore Timestamp
      const cooldownMs = DISPLAY_NAME_COOLDOWN_DAYS_UI * 24 * 60 * 60 * 1000;
      const nextChangeAllowedTime = lastChangeDate.getTime() + cooldownMs;
      if (Date.now() < nextChangeAllowedTime) {
          setDisplayNameCooldownInfo({
              canChange: false,
              message: `คุณสามารถเปลี่ยนชื่อที่แสดงได้อีกครั้งในวันที่ ${new Date(nextChangeAllowedTime).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`
          });
      } else {
          setDisplayNameCooldownInfo({ canChange: true });
      }
    } else {
      setDisplayNameCooldownInfo({ canChange: true });
    }
  }, [currentUser]);

  useEffect(() => {
    if (feedback) {
      if (feedbackRef.current) {
        feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (feedback) {
      console.log("📣 UserProfilePage feedback state:", feedback);
    }
  }, [feedback]);

  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-sans font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const inputFocusStyle = "focus:!border-secondary focus:!ring-2 focus:!ring-secondary focus:!ring-opacity-70";
  const inputErrorStyle = "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70";
  const readOnlyStyle = "bg-neutral-light cursor-not-allowed";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  const textareaBaseStyle = `${inputBaseStyle} min-h-[60px]`;


  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'ขนาดรูปภาพต้องไม่เกิน 2MB' }));
        if (event.target) event.target.value = '';
        setFormState(prev => ({ ...prev, photo: currentUser.photo }));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormState(prev => ({ ...prev, photo: reader.result as string }));
        setErrors(prev => ({ ...prev, photo: undefined }));
      };
      reader.onerror = () => {
        setErrors(prev => ({ ...prev, photo: 'ไม่สามารถอ่านไฟล์รูปภาพได้' }));
        setFormState(prev => ({ ...prev, photo: currentUser.photo }));
      }
      reader.readAsDataURL(file);
    } else {
      setFormState(prev => ({ ...prev, photo: undefined })); 
      setErrors(prev => ({ ...prev, photo: undefined }));
    }
  };

  const handleBirthdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBirthdate = e.target.value;
    setFormState(prev => ({...prev, birthdate: newBirthdate}));
    const age = calculateAge(newBirthdate);
    setCurrentAge(age);
    if (age !== null || newBirthdate === '') {
        setErrors(prev => ({ ...prev, birthdate: undefined }));
    }
  };

  const isValidUrl = (urlString?: string): boolean => {
    if (!urlString || urlString.trim() === '') return true;
    try {
      new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
      return true;
    } catch (_) {
      return false;
    }
  };

  const validateForm = (): Partial<Record<UserProfileFormErrorKeys, string>> => {
    const newErrors: Partial<Record<UserProfileFormErrorKeys, string>> = {};
    if (!formState.publicDisplayName.trim()) {
      newErrors.publicDisplayName = 'กรุณากรอกชื่อที่ต้องการให้แสดงบนเว็บไซต์';
    } else if (!PUBLIC_DISPLAY_NAME_REGEX_PROFILE.test(formState.publicDisplayName)) {
      newErrors.publicDisplayName = 'ต้องมี 2-30 ตัวอักษร (ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด)';
    }

    if (!displayNameCooldownInfo.canChange && formState.publicDisplayName !== currentUser.publicDisplayName) {
        newErrors.publicDisplayName = displayNameCooldownInfo.message;
    }

    if (!formState.mobile.trim()) newErrors.mobile = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!isValidThaiMobileNumber(formState.mobile)) newErrors.mobile = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 08X-XXX-XXXX)';

    if (!formState.gender || formState.gender === GenderOption.NotSpecified) newErrors.gender = 'กรุณาเลือกเพศ';
    if (!formState.birthdate) newErrors.birthdate = 'กรุณาเลือกวันเกิด';
    else if (calculateAge(formState.birthdate) === null) newErrors.birthdate = 'กรุณาเลือกวันเกิดที่ถูกต้อง (ต้องไม่ใช่วันในอนาคต)';
    if (!formState.educationLevel || formState.educationLevel === HelperEducationLevelOption.NotStated) newErrors.educationLevel = 'กรุณาเลือกระดับการศึกษา';

    if (!isValidUrl(formState.businessWebsite)) newErrors.businessWebsite = 'รูปแบบ URL ของเว็บไซต์ธุรกิจไม่ถูกต้อง';
    if (!isValidUrl(formState.businessSocialProfileLink)) newErrors.businessSocialProfileLink = 'รูปแบบ URL ของโซเชียลโปรไฟล์ธุรกิจไม่ถูกต้อง';
    
    return newErrors;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0] as UserProfileFormErrorKeys;
      setFeedback({ type: 'error', message: newErrors[firstErrorKey] || 'ข้อมูลไม่ถูกต้อง โปรดตรวจสอบข้อผิดพลาด' });
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    const result = await onUpdateProfile(formState);
    console.log("🏷 handleSubmit → onUpdateProfile returned:", result);
    if (result) {
      setFeedback({ type: 'success', message: 'อัปเดตโปรไฟล์เรียบร้อยแล้ว!' });
    } else {
      setFeedback({ type: 'error', message: 'ไม่สามารถบันทึกข้อมูลได้' });
    }
    setIsSubmitting(false);
  };


  const personalityFields = [
    { name: 'favoriteMusic', label: '🎧 เพลงที่ชอบ', value: formState.favoriteMusic, placeholder: 'เช่น Pop, Rock, ลูกทุ่ง, Jazz', type: 'text' },
    { name: 'favoriteBook', label: '📚 หนังสือที่ชอบ', value: formState.favoriteBook, placeholder: 'เช่น นิยายสืบสวน, การ์ตูน, พัฒนาตัวเอง', type: 'text' },
    { name: 'favoriteMovie', label: '🎬 หนังที่ชอบ', value: formState.favoriteMovie, placeholder: 'เช่น Action, Comedy, Sci-fi, Drama', type: 'text' },
    { name: 'hobbies', label: '🧶 งานอดิเรก', value: formState.hobbies, placeholder: 'เช่น อ่านหนังสือ, เล่นเกม, วาดรูป, ทำอาหาร', type: 'textarea' },
    { name: 'favoriteFood', label: '🍜 อาหารที่ชอบ', value: formState.favoriteFood, placeholder: 'เช่น ส้มตำ, พิซซ่า, ซูชิ, ก๋วยเตี๋ยว', type: 'text' },
    { name: 'dislikedThing', label: '🚫 สิ่งที่ไม่ชอบที่สุด', value: formState.dislikedThing, placeholder: 'เช่น ความไม่ซื่อสัตย์, แมลงสาบ', type: 'text' },
  ];

  const businessInfoFields = [
    { name: 'businessName', label: 'ชื่อธุรกิจ/ร้านค้า/บริษัท', value: formState.businessName, placeholder: 'เช่น ร้านกาแฟแมวฟ้า, บริการออกแบบซันนี่', type: 'text' },
    { name: 'businessType', label: 'ประเภทธุรกิจ', value: formState.businessType, placeholder: 'เช่น ร้านอาหาร, บริษัทจำกัด, ฟรีแลนซ์', type: 'text' },
    { name: 'aboutBusiness', label: 'เกี่ยวกับธุรกิจ', value: formState.aboutBusiness, placeholder: 'อธิบายสั้นๆ เกี่ยวกับธุรกิจของคุณ...', type: 'textarea' },
    { name: 'businessAddress', label: 'ที่ตั้งธุรกิจ (ถ้ามี)', value: formState.businessAddress, placeholder: 'เช่น 123 ถนนนิมมาน, เชียงใหม่', type: 'text' },
    { name: 'businessWebsite', label: 'เว็บไซต์ธุรกิจ', value: formState.businessWebsite, placeholder: 'https://yourbusiness.com', type: 'url', errorKey: 'businessWebsite' as UserProfileFormErrorKeys },
    { name: 'businessSocialProfileLink', label: 'ลิงก์โซเชียลโปรไฟล์ธุรกิจ', value: formState.businessSocialProfileLink, placeholder: 'เช่น ลิงก์ Facebook Page, LINE OA', type: 'url', errorKey: 'businessSocialProfileLink' as UserProfileFormErrorKeys },
  ];


  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-xl mx-auto my-10 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-secondary-hover mb-6 text-center">👤 โปรไฟล์ของฉัน</h2>
      
      {feedback && (
        <div
          ref={feedbackRef}
          data-testid="feedback"
          style={{
            padding: '12px',
            margin: '16px 0',
            borderRadius: '8px',
            fontFamily: 'Prompt, sans-serif',
            fontWeight: 500,
            textAlign: 'center',
            background: feedback.type === "success" ? "#D1FAE5" : "#FEE2E2",
            color: feedback.type === "success" ? "#065F46" : "#991B1B",
            border: `1px solid ${feedback.type === "success" ? "#6EE7B7" : "#FCA5A5"}`
          }}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div id="profile-photo-section" className="flex flex-col items-center mb-6">
          {formState.photo ? (
            <img src={formState.photo} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover shadow-md mb-3" />
          ) : (
            <FallbackAvatar name={currentUser.publicDisplayName} size="w-32 h-32" className="mb-3" />
          )}
          <label htmlFor="photoUpload" className="cursor-pointer text-sm font-sans text-secondary hover:underline">
            เปลี่ยนรูปโปรไฟล์ (ไม่เกิน 2MB)
          </label>
          <input
            type="file"
            id="photoUpload"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
            disabled={isSubmitting}
          />
          {errors.photo && <p className="text-red-500 font-sans text-xs mt-1 text-center">{errors.photo}</p>}
        </div>

        <div className="pt-4 border-t border-neutral-DEFAULT/50">
          <label className="flex items-center space-x-2 cursor-pointer">
              <input
                  type="checkbox"
                  name="isBusinessProfile"
                  checked={formState.isBusinessProfile}
                  onChange={e => setFormState(prev => ({ ...prev, isBusinessProfile: e.target.checked }))}
                  className="form-checkbox h-5 w-5 text-secondary rounded border-neutral-DEFAULT focus:!ring-2 focus:!ring-offset-1 focus:!ring-offset-white focus:!ring-secondary focus:!ring-opacity-70"
                  disabled={isSubmitting}
              />
              <span className="text-sm font-sans font-medium text-neutral-dark">ฉันเป็นธุรกิจ/ร้านค้า (โปรไฟล์สาธารณะจะแสดงเฉพาะข้อมูลธุรกิจ)</span>
          </label>
          <p className="text-xs font-sans text-neutral-medium mt-1 pl-7">
            หมายเหตุ: หากคุณเป็นฟรีแลนซ์หรือเสนอบริการ เราไม่แนะนำให้ติ๊กข้อนี้ เพราะการแสดงข้อมูลส่วนตัวบางอย่าง เช่น เกี่ยวกับฉัน, สิ่งที่ชอบ จะช่วยสร้างความน่าเชื่อถือ
          </p>
        </div>

        <div>
          <label htmlFor="profilePublicDisplayName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อบนเว็บไซต์ (สาธารณะ) <span className="text-red-500">*</span></label>
          <input
            type="text"
            id="profilePublicDisplayName"
            name="publicDisplayName"
            value={formState.publicDisplayName}
            onChange={e => setFormState(prev => ({ ...prev, publicDisplayName: e.target.value }))}
            className={`${inputBaseStyle} ${errors.publicDisplayName ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
            placeholder="เช่น Puuna V."
            disabled={!displayNameCooldownInfo.canChange || isSubmitting}
            aria-describedby={!displayNameCooldownInfo.canChange ? "displayNameCooldownMessage" : (errors.publicDisplayName ? "publicDisplayNameError" : undefined)}
          />
           <p className="text-xs font-sans text-neutral-medium mt-1">
              ชื่อแสดงสาธารณะ (2-30 ตัวอักษร): ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด (.) เท่านั้น เช่น Sunny J. 123
            </p>
          {errors.publicDisplayName && <p id="publicDisplayNameError" className="text-red-500 font-sans text-xs mt-1">{errors.publicDisplayName}</p>}
          {!displayNameCooldownInfo.canChange && displayNameCooldownInfo.message && (
            <p id="displayNameCooldownMessage" className="text-amber-600 font-sans text-xs mt-1">{displayNameCooldownInfo.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="profileUsername" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อผู้ใช้ (สำหรับเข้าระบบ)</label>
          <input
            type="text"
            id="profileUsername"
            value={currentUser.username}
            readOnly
            className={`${inputBaseStyle} ${readOnlyStyle} ${inputFocusStyle} focus:bg-gray-50`}
            aria-readonly="true"
          />
        </div>

        <div>
          <label htmlFor="profileEmail" className="block text-sm font-sans font-medium text-neutral-dark mb-1">อีเมล</label>
          <input
            type="email"
            id="profileEmail"
            value={currentUser.email}
            readOnly
            className={`${inputBaseStyle} ${readOnlyStyle} ${inputFocusStyle} focus:bg-gray-50`}
            aria-readonly="true"
          />
        </div>
        
        <div id="intro-section" className="pt-4 border-t border-neutral-DEFAULT/50">
            <label htmlFor="profile-introSentence" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                💬 เกี่ยวกับฉัน
            </label>
            <textarea
                id="profile-introSentence"
                name="introSentence"
                value={formState.introSentence}
                onChange={e => setFormState(prev => ({ ...prev, introSentence: e.target.value }))}
                rows={3}
                className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น เป็นคนง่ายๆ สบายๆ ชอบเรียนรู้สิ่งใหม่"
                disabled={isSubmitting}
            />
        </div>


        <details id="personal-info-section" className="group pt-4 border-t border-neutral-DEFAULT/50" open>
          <summary className="flex items-center justify-between cursor-pointer list-none p-2 -ml-2 rounded-md hover:bg-neutral-light/50 transition-colors">
            <h3 className="text-lg font-sans font-medium text-neutral-dark">
              ข้อมูลส่วนตัว
            </h3>
            <span className="text-secondary transform transition-transform duration-200 group-open:rotate-90">
              ▶
            </span>
          </summary>
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                <div>
                    <label className="block text-sm font-sans font-medium text-neutral-dark mb-1">เพศ <span className="text-red-500">*</span></label>
                    <div className="space-y-1">
                        {Object.values(GenderOption).map(optionValue => (
                        <label key={optionValue} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="gender" value={optionValue} checked={formState.gender === optionValue}
                                    onChange={() => setFormState(prev => ({...prev, gender: optionValue}))}
                                    className="form-radio h-4 w-4 text-secondary border-[#CCCCCC] focus:!ring-2 focus:!ring-offset-1 focus:!ring-offset-white focus:!ring-secondary focus:!ring-opacity-70"
                                    disabled={isSubmitting}
                            />
                            <span className="text-neutral-dark font-sans font-normal text-sm">{optionValue}</span>
                        </label>
                        ))}
                    </div>
                    {errors.gender && <p className="text-red-500 font-sans text-xs mt-1">{errors.gender}</p>}
                </div>
                <div>
                    <label htmlFor="profileBirthdate" className="block text-sm font-sans font-medium text-neutral-dark mb-1">วันเกิด <span className="text-red-500">*</span></label>
                    <input type="date" id="profileBirthdate" name="birthdate" value={formState.birthdate} onChange={handleBirthdateChange}
                            max={new Date().toISOString().split("T")[0]}
                            className={`${inputBaseStyle} ${errors.birthdate ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} 
                            disabled={isSubmitting}
                    />
                    {currentAge !== null && <p className="text-xs font-sans text-neutral-dark mt-1">อายุ: {currentAge} ปี</p>}
                    {errors.birthdate && <p className="text-red-500 font-sans text-xs mt-1">{errors.birthdate}</p>}
                </div>
            </div>
            <div>
                <label htmlFor="profileEducationLevel" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ระดับการศึกษา <span className="text-red-500">*</span></label>
                <select id="profileEducationLevel" name="educationLevel" value={formState.educationLevel}
                        onChange={e => setFormState(prev => ({...prev, educationLevel: e.target.value as HelperEducationLevelOption}))}
                        className={`${selectBaseStyle} ${errors.educationLevel ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
                        disabled={isSubmitting}
                >
                    {Object.values(HelperEducationLevelOption).map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
                 {errors.educationLevel && <p className="text-red-500 font-sans text-xs mt-1">{errors.educationLevel}</p>}
            </div>
            <div className="mt-4">
                <label htmlFor="profileNickname" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อเล่น</label>
                <input type="text" id="profileNickname" name="nickname" value={formState.nickname} onChange={e => setFormState(prev => ({ ...prev, nickname: e.target.value }))} className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`} placeholder="เช่น ซันนี่, จอห์น" disabled={isSubmitting} />
            </div>
            <div className="mt-4">
                <label htmlFor="profileFirstName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อจริง</label>
                <input type="text" id="profileFirstName" name="firstName" value={formState.firstName} onChange={e => setFormState(prev => ({ ...prev, firstName: e.target.value }))} className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`} placeholder="เช่น ยาทิดา, สมชาย" disabled={isSubmitting} />
            </div>
            <div className="mt-4">
                <label htmlFor="profileLastName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">นามสกุล</label>
                <input type="text" id="profileLastName" name="lastName" value={formState.lastName} onChange={e => setFormState(prev => ({ ...prev, lastName: e.target.value }))} className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`} placeholder="เช่น แสงอรุณ, ใจดี" disabled={isSubmitting} />
            </div>
            <div id="address-section">
              <label htmlFor="profileAddress" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ที่อยู่ (จะแสดงในโปรไฟล์สาธารณะของคุณ)</label>
              <textarea
                id="profileAddress"
                name="address"
                value={formState.address}
                onChange={e => setFormState(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </details>

        <details id="personality-section" className="group pt-4 border-t border-neutral-DEFAULT/50">
          <summary className="flex items-center justify-between cursor-pointer list-none p-2 -ml-2 rounded-md hover:bg-neutral-light/50 transition-colors">
            <h3 className="text-lg font-sans font-medium text-neutral-dark">
              👤 เพิ่มเติมเกี่ยวกับฉัน
            </h3>
            <span className="text-secondary transform transition-transform duration-200 group-open:rotate-90">
              ▶
            </span>
          </summary>
          <div className="mt-3 space-y-4">
            <p className="text-xs font-sans text-neutral-medium mb-3">
              ข้อมูลส่วนนี้จะช่วยให้โปรไฟล์สาธารณะของคุณน่าสนใจยิ่งขึ้น
            </p>
            {personalityFields.map(field => (
              <div key={field.name} className="mb-4">
                <label htmlFor={`profile-${field.name}`} className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`profile-${field.name}`}
                    name={field.name}
                    value={field.value}
                    onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                    rows={field.name === 'introSentence' ? 3 : 2}
                    className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                  />
                ) : (
                  <input
                    type="text"
                    id={`profile-${field.name}`}
                    name={field.name}
                    value={field.value}
                    onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                  />
                )}
              </div>
            ))}
          </div>
        </details>

        <details id="business-info-section" className="group pt-4 border-t border-neutral-DEFAULT/50">
          <summary className="flex items-center justify-between cursor-pointer list-none p-2 -ml-2 rounded-md hover:bg-neutral-light/50 transition-colors">
            <h3 className="text-lg font-sans font-medium text-neutral-dark">
              🏢 ข้อมูลธุรกิจ
            </h3>
            <span className="text-secondary transform transition-transform duration-200 group-open:rotate-90">
              ▶
            </span>
          </summary>
          <div className="mt-3 space-y-4">
             <p className="text-xs font-sans text-neutral-medium mb-3">
              หากคุณเป็นธุรกิจหรือร้านค้า การให้ข้อมูลส่วนนี้จะช่วยเพิ่มความน่าเชื่อถือ
            </p>
            {businessInfoFields.map(field => (
              <div key={field.name} className="mb-4">
                <label htmlFor={`profile-${field.name}`} className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    id={`profile-${field.name}`}
                    name={field.name}
                    value={field.value}
                    onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                    rows={3}
                    className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                  />
                ) : (
                  <input
                    type={field.type as string}
                    id={`profile-${field.name}`}
                    name={field.name}
                    value={field.value}
                    onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className={`${inputBaseStyle} ${errors[field.errorKey] ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                    disabled={isSubmitting}
                  />
                )}
                {field.errorKey && errors[field.errorKey] && <p className="text-red-500 font-sans text-xs mt-1">{errors[field.errorKey]}</p>}
              </div>
            ))}
          </div>
        </details>


        <div id="contact-info-section" className="pt-4 border-t border-neutral-DEFAULT/50">
             <h3 className="text-lg font-sans font-medium text-neutral-dark mb-3">ข้อมูลติดต่อ (แสดงใน 'ติดต่อ')</h3>
            <div>
            <label htmlFor="profileMobile" className="block text-sm font-sans font-medium text-neutral-dark mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
            <input
                type="tel"
                id="profileMobile"
                name="mobile"
                value={formState.mobile}
                onChange={e => setFormState(prev => ({ ...prev, mobile: e.target.value }))}
                className={`${inputBaseStyle} ${errors.mobile ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น 0812345678"
                aria-describedby={errors.mobile ? "mobile-error" : undefined}
                aria-invalid={!!errors.mobile}
                disabled={isSubmitting}
            />
            {errors.mobile && <p id="mobile-error" className="text-red-500 font-sans text-xs mt-1">{errors.mobile}</p>}
            </div>

            <div className="mt-4">
            <label htmlFor="profileLineId" className="block text-sm font-sans font-medium text-neutral-dark mb-1">LINE ID</label>
            <input
                type="text"
                id="profileLineId"
                name="lineId"
                value={formState.lineId}
                onChange={e => setFormState(prev => ({ ...prev, lineId: e.target.value }))}
                className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น mylineid"
                disabled={isSubmitting}
            />
            </div>

            <div className="mt-4">
            <label htmlFor="profileFacebook" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Facebook</label>
            <input
                type="text"
                id="profileFacebook"
                name="facebook"
                value={formState.facebook}
                onChange={e => setFormState(prev => ({ ...prev, facebook: e.target.value }))}
                className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="ลิงก์โปรไฟล์ หรือชื่อผู้ใช้ Facebook"
                disabled={isSubmitting}
            />
            </div>
        </div>

        {errors.general && <p className="text-red-500 font-sans text-sm text-center">{errors.general}</p>}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto flex-grow" disabled={isSubmitting}>
            {isSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลง'}
          </Button>
          <Button type="button" onClick={onCancel} variant="outline" colorScheme="secondary" size="lg" className="w-full sm:w-auto flex-grow" disabled={isSubmitting}>
              ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
};
