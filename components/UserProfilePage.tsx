
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types/types';
import { GenderOption, HelperEducationLevelOption } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isValidThaiMobileNumber } from '../utils/validation.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceRecordingModal } from './VoiceRecordingModal.tsx';
import { AudioPlayer } from './AudioPlayer.tsx';
import { updateUserVoiceIntroUrlService } from '../services/userService.ts';
import { ConfirmModal } from './ConfirmModal.tsx';

interface UserProfilePageProps {
  currentUser: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<void>;
  onCancel: () => void;
  showBanner: (message: string, type?: 'success' | 'error') => void;
}

type UserProfileFormErrorKeys = 'publicDisplayName' | 'mobile' | 'gender' | 'birthdate' | 'educationLevel' | 'general' | 'photo' | 'businessWebsite' | 'businessSocialProfileLink';
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
const SOCIAL_MEDIA_COOLDOWN_DAYS_UI = 14; // 2 weeks cooldown for Instagram/TikTok

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ currentUser, onUpdateProfile, onCancel, showBanner }) => {
  const [formState, setFormState] = useState({
    publicDisplayName: currentUser.publicDisplayName,
    mobile: currentUser.mobile,
    lineId: currentUser.lineId || '',
    facebook: currentUser.facebook || '',
    instagram: (currentUser as any).instagram || '',
    tiktok: (currentUser as any).tiktok || '',
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
    voiceIntroUrl: currentUser.voiceIntroUrl || null,
  });

  const [currentAge, setCurrentAge] = useState<number | null>(calculateAge(currentUser.birthdate));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<UserProfileFormErrorKeys, string>>>({});
  const [displayNameCooldownInfo, setDisplayNameCooldownInfo] = useState<{ canChange: boolean; message?: string }>({ canChange: true });
  const [instagramCooldownInfo, setInstagramCooldownInfo] = useState<{ canChange: boolean; message?: string }>({ canChange: true });
  const [tiktokCooldownInfo, setTiktokCooldownInfo] = useState<{ canChange: boolean; message?: string }>({ canChange: true });
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setFormState({
      publicDisplayName: currentUser.publicDisplayName,
      mobile: currentUser.mobile,
      lineId: currentUser.lineId || '',
      facebook: currentUser.facebook || '',
      instagram: (currentUser as any).instagram || '',
      tiktok: (currentUser as any).tiktok || '',
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
      voiceIntroUrl: currentUser.voiceIntroUrl || null,
    });
    setCurrentAge(calculateAge(currentUser.birthdate));

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

    // Instagram cooldown logic
    const instagramUpdateCount = (currentUser as any).instagramUpdateCount || 0;
    const lastInstagramChange = (currentUser as any).lastInstagramChangeAt;
    if (instagramUpdateCount > 0 && lastInstagramChange) {
      const lastChangeDate = typeof lastInstagramChange === 'string' ? new Date(lastInstagramChange) : (lastInstagramChange as any).toDate();
      const cooldownMs = SOCIAL_MEDIA_COOLDOWN_DAYS_UI * 24 * 60 * 60 * 1000;
      const nextChangeAllowedTime = lastChangeDate.getTime() + cooldownMs;
      if (Date.now() < nextChangeAllowedTime) {
        setInstagramCooldownInfo({
          canChange: false,
          message: `คุณสามารถเปลี่ยน Instagram ได้อีกครั้งในวันที่ ${new Date(nextChangeAllowedTime).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`
        });
      } else {
        setInstagramCooldownInfo({ canChange: true });
      }
    } else {
      setInstagramCooldownInfo({ canChange: true });
    }

    // TikTok cooldown logic
    const tiktokUpdateCount = (currentUser as any).tiktokUpdateCount || 0;
    const lastTiktokChange = (currentUser as any).lastTiktokChangeAt;
    if (tiktokUpdateCount > 0 && lastTiktokChange) {
      const lastChangeDate = typeof lastTiktokChange === 'string' ? new Date(lastTiktokChange) : (lastTiktokChange as any).toDate();
      const cooldownMs = SOCIAL_MEDIA_COOLDOWN_DAYS_UI * 24 * 60 * 60 * 1000;
      const nextChangeAllowedTime = lastChangeDate.getTime() + cooldownMs;
      if (Date.now() < nextChangeAllowedTime) {
        setTiktokCooldownInfo({
          canChange: false,
          message: `คุณสามารถเปลี่ยน TikTok ได้อีกครั้งในวันที่ ${new Date(nextChangeAllowedTime).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`
        });
      } else {
        setTiktokCooldownInfo({ canChange: true });
      }
    } else {
      setTiktokCooldownInfo({ canChange: true });
    }
  }, [currentUser]);

  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-sans font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const inputFocusStyle = "focus:!border-primary focus:!ring-2 focus:!ring-primary focus:!ring-opacity-70";
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
    setFormState(prev => ({ ...prev, birthdate: newBirthdate }));
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

    // Instagram cooldown validation
    if (!instagramCooldownInfo.canChange && formState.instagram !== ((currentUser as any).instagram || '')) {
      newErrors.general = instagramCooldownInfo.message;
    }

    // TikTok cooldown validation
    if (!tiktokCooldownInfo.canChange && formState.tiktok !== ((currentUser as any).tiktok || '')) {
      newErrors.general = tiktokCooldownInfo.message;
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
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0] as UserProfileFormErrorKeys;
      const errorMessage = newErrors[firstErrorKey] || 'ข้อมูลไม่ถูกต้อง โปรดตรวจสอบข้อผิดพลาด';
      showBanner(errorMessage, 'error');
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const { voiceIntroUrl, ...profileData } = formState; // Exclude voiceIntroUrl from this update
      await onUpdateProfile(profileData);
      showBanner('บันทึกสำเร็จ', 'success');
    } catch (error: any) {
      const errorMessage = error.message || "เกิดข้อผิดพลาดในการบันทึก";
      showBanner(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceSave = async (audioBlob: Blob) => {
    try {
      setIsSubmitting(true);
      const newUrl = await updateUserVoiceIntroUrlService(currentUser.id, audioBlob);
      setFormState(prev => ({ ...prev, voiceIntroUrl: newUrl }));
      showBanner('บันทึกเสียงแนะนำตัวสำเร็จ', 'success');
    } catch (error: any) {
      showBanner('เกิดข้อผิดพลาดในการบันทึกเสียง', 'error');
    } finally {
      setIsSubmitting(false);
      setIsVoiceModalOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await updateUserVoiceIntroUrlService(currentUser.id, null);
      setFormState(prev => ({ ...prev, voiceIntroUrl: null }));
      showBanner('ลบเสียงแนะนำตัวสำเร็จ', 'success');
    } catch (error: any) {
      showBanner('เกิดข้อผิดพลาดในการลบเสียง', 'error');
    } finally {
      setIsSubmitting(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  const personalityFields = [
    { name: 'favoriteMusic', label: 'เพลงที่ชอบ', value: formState.favoriteMusic, type: 'text' },
    { name: 'favoriteBook', label: 'หนังสือที่ชอบ', value: formState.favoriteBook, type: 'text' },
    { name: 'favoriteMovie', label: 'หนังที่ชอบ', value: formState.favoriteMovie, type: 'text' },
    { name: 'hobbies', label: 'งานอดิเรก', value: formState.hobbies, type: 'textarea' },
    { name: 'favoriteFood', label: 'อาหารที่ชอบ', value: formState.favoriteFood, type: 'text' },
    { name: 'dislikedThing', label: 'สิ่งที่ไม่ชอบที่สุด', value: formState.dislikedThing, type: 'text' },
  ];

  const businessInfoFields = [
    { name: 'businessName', label: 'ชื่อธุรกิจ/ร้านค้า/บริษัท', value: formState.businessName, type: 'text' },
    { name: 'businessType', label: 'ประเภท', value: formState.businessType, type: 'text' },
    { name: 'aboutBusiness', label: 'รายละเอียด', value: formState.aboutBusiness, type: 'textarea' },
    { name: 'businessAddress', label: 'ที่ตั้ง', value: formState.businessAddress, type: 'text' },
    { name: 'businessWebsite', label: 'เว็บไซต์', value: formState.businessWebsite, type: 'url', errorKey: 'businessWebsite' as UserProfileFormErrorKeys },
    { name: 'businessSocialProfileLink', label: 'โซเชียล', value: formState.businessSocialProfileLink, type: 'url', errorKey: 'businessSocialProfileLink' as UserProfileFormErrorKeys },
  ];


  return (
    <>
      <main className="app-card w-full max-w-xl mx-auto" style={{ padding: 'var(--space-6) var(--space-8)' }}>
        <h1 className="text-2xl font-semibold text-neutral-dark mb-6 text-center" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
          แก้ไขโปรไฟล์
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5" style={{ gap: 'var(--space-5)' }}>
          <section id="profile-photo-section" className="flex flex-col items-center" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 className="sr-only">รูปโปรไฟล์</h2>
            {formState.photo ? (
              <img src={formState.photo} alt="ตัวอย่างรูปโปรไฟล์" className="w-32 h-32 rounded-full object-cover shadow-md" style={{ marginBottom: 'var(--space-3)' }} />
            ) : (
              <FallbackAvatar name={currentUser.publicDisplayName} size="w-32 h-32" className="mb-3" />
            )}
            <label htmlFor="photoUpload" className="cursor-pointer text-sm hover:underline" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              เปลี่ยนรูปโปรไฟล์ (ไม่เกิน 2MB)
            </label>
            <input
              type="file"
              id="photoUpload"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              disabled={isSubmitting}
              aria-describedby={errors.photo ? "photoError" : undefined}
            />
            {errors.photo && <p id="photoError" role="alert" className="text-xs mt-1 text-center" style={{ color: 'var(--error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{errors.photo}</p>}
          </section>

          <section id="business-profile-section" className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100" style={{ marginTop: 'var(--space-4)' }}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="isBusinessProfile"
                checked={formState.isBusinessProfile}
                onChange={e => setFormState(prev => ({ ...prev, isBusinessProfile: e.target.checked }))}
                className="form-checkbox h-5 w-5 rounded focus:ring-2 focus:ring-offset-1 mt-0.5"
                style={{ color: 'var(--primary-blue)', borderColor: 'var(--border-medium)' }}
                disabled={isSubmitting}
                aria-describedby="businessProfileNote"
              />
              <div className="flex-1">
                <label htmlFor="isBusinessProfile" className="cursor-pointer">
                  <span className="text-sm font-medium text-blue-800" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-medium)' }}>
                    🏢 เป็นธุรกิจ/ร้านค้า (รายละเอียดดึงจาก 'ข้อมูลธุรกิจ')
                  </span>
                </label>
                <p id="businessProfileNote" className="text-xs mt-1 text-blue-600" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>
                  หมายเหตุ: ฟรีแลนซ์/เสนอบริการไม่ควรติ๊กข้อนี้ ข้อมูลส่วนตัวสร้างความน่าเชื่อถือ
                </p>
              </div>
            </div>
          </section>

          <section id="voice-intro-section" className="border-t" style={{ paddingTop: 'var(--space-4)', borderTopColor: 'var(--border-light)' }}>
            <h2 className="text-lg font-medium mb-3" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              เสียงแนะนำตัว
            </h2>
            {formState.voiceIntroUrl ? (
              <div className="space-y-3">
                <AudioPlayer audioUrl={formState.voiceIntroUrl} />
                <div className="flex justify-center gap-4">
                  <Button type="button" onClick={() => setIsVoiceModalOpen(true)} variant="outline" colorScheme="neutral" size="sm" className="min-h-[48px] px-4">อัดใหม่</Button>
                  <Button type="button" onClick={() => setIsConfirmDeleteOpen(true)} variant="outline" colorScheme="accent" size="sm" className="min-h-[48px] px-4">ลบ</Button>
                </div>
              </div>
            ) : (
              <Button type="button" onClick={() => setIsVoiceModalOpen(true)} variant="secondary" className="w-full">
                🎙️ เพิ่มเสียงแนะนำตัว (สูงสุด 60 วินาที)
              </Button>
            )}
          </section>

          <details id="profile-info-section" className="group border-t" style={{ paddingTop: 'var(--space-4)', borderTopColor: 'var(--border-light)' }}>
            <summary className="flex items-center justify-between cursor-pointer list-none rounded-md hover:bg-neutral-light/50 transition-colors" style={{ padding: 'var(--space-2)', marginLeft: 'calc(-1 * var(--space-2))' }}>
              <h2 className="text-lg font-medium" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                ข้อมูลโปรไฟล์
              </h2>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" style={{ color: 'var(--primary-blue)' }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </summary>
            <div style={{ marginTop: 'var(--space-3)', gap: 'var(--space-4)' }}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label htmlFor="profilePublicDisplayName" className="block text-sm font-medium mb-1" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                  ชื่อสาธารณะบนเว็บ <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="profilePublicDisplayName"
                  name="publicDisplayName"
                  value={formState.publicDisplayName}
                  onChange={e => setFormState(prev => ({ ...prev, publicDisplayName: e.target.value }))}
                  className={`form-input ${errors.publicDisplayName ? 'error' : ''}`}
                  disabled={!displayNameCooldownInfo.canChange || isSubmitting}
                  aria-invalid={errors.publicDisplayName ? "true" : "false"}
                  aria-describedby="publicDisplayNameHelp displayNameCooldownMessage publicDisplayNameError"
                />
                <p id="publicDisplayNameHelp" className="text-xs mt-1" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                  2-30 ตัวอักษร, ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด (.) เท่านั้น และเปลี่ยนได้ 2 ครั้งทุก 14 วัน
                </p>
                {errors.publicDisplayName && <p id="publicDisplayNameError" role="alert" className="text-xs mt-1" style={{ color: 'var(--error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{errors.publicDisplayName}</p>}
                {!displayNameCooldownInfo.canChange && displayNameCooldownInfo.message && (
                  <p id="displayNameCooldownMessage" className="text-xs mt-1" style={{ color: 'var(--warning)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{displayNameCooldownInfo.message}</p>
                )}
              </div>

              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label htmlFor="profileUsername" className="form-label">ชื่อผู้ใช้ (สำหรับเข้าระบบ)</label>
                <input
                  type="text"
                  id="profileUsername"
                  value={currentUser.username}
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                  aria-readonly="true"
                />
              </div>

              <div>
                <label htmlFor="profileEmail" className="form-label">อีเมล</label>
                <input
                  type="email"
                  id="profileEmail"
                  value={currentUser.email}
                  readOnly
                  className="form-input"
                  style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
                  aria-readonly="true"
                />
              </div>
            </div>
          </details>


          {!formState.isBusinessProfile && (
            <details id="personal-info-section" className="group border-t" style={{ paddingTop: 'var(--space-4)', borderTopColor: 'var(--border-light)' }}>
              <summary className="flex items-center justify-between cursor-pointer list-none rounded-md hover:bg-neutral-light/50 transition-colors" style={{ padding: 'var(--space-2)', marginLeft: 'calc(-1 * var(--space-2))' }}>
                <h2 className="text-lg font-medium" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                  ข้อมูลส่วนตัว
                </h2>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" style={{ color: 'var(--primary-blue)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </summary>
              <div style={{ marginTop: 'var(--space-3)', gap: 'var(--space-4)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <fieldset>
                      <legend className="form-label">เพศ <span style={{ color: 'var(--error)' }}>*</span></legend>
                      <div style={{ gap: 'var(--space-1)' }}>
                        {Object.values(GenderOption).map(optionValue => (
                          <label key={optionValue} className="flex items-center cursor-pointer" style={{ gap: 'var(--space-2)' }}>
                            <input
                              type="radio"
                              name="gender"
                              value={optionValue}
                              checked={formState.gender === optionValue}
                              onChange={() => setFormState(prev => ({ ...prev, gender: optionValue }))}
                              className="form-radio h-4 w-4 focus:ring-2 focus:ring-offset-1"
                              style={{ color: 'var(--primary-blue)', borderColor: 'var(--border-medium)' }}
                              disabled={isSubmitting}
                              aria-invalid={errors.gender ? "true" : "false"}
                            />
                            <span className="text-sm" style={{ color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>{optionValue}</span>
                          </label>
                        ))}
                      </div>
                      {errors.gender && <p role="alert" className="text-xs mt-1" style={{ color: 'var(--error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{errors.gender}</p>}
                    </fieldset>
                  </div>
                  <div>
                    <label htmlFor="profileBirthdate" className="form-label">วันเกิด <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      type="date"
                      id="profileBirthdate"
                      name="birthdate"
                      value={formState.birthdate}
                      onChange={handleBirthdateChange}
                      max={new Date().toISOString().split("T")[0]}
                      className={`form-input ${errors.birthdate ? 'error' : ''}`}
                      disabled={isSubmitting}
                      aria-invalid={errors.birthdate ? "true" : "false"}
                      aria-describedby="birthdateAge birthdateError"
                    />
                    {currentAge !== null && <p id="birthdateAge" className="text-xs mt-1" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>อายุ: {currentAge} ปี</p>}
                    {errors.birthdate && <p id="birthdateError" role="alert" className="text-xs mt-1" style={{ color: 'var(--error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{errors.birthdate}</p>}
                  </div>
                </div>
                <div>
                  <label htmlFor="profileEducationLevel" className="form-label">ระดับการศึกษา <span style={{ color: 'var(--error)' }}>*</span></label>
                  <select
                    id="profileEducationLevel"
                    name="educationLevel"
                    value={formState.educationLevel}
                    onChange={e => setFormState(prev => ({ ...prev, educationLevel: e.target.value as HelperEducationLevelOption }))}
                    className={`form-input ${errors.educationLevel ? 'error' : ''}`}
                    style={{ appearance: 'none' }}
                    disabled={isSubmitting}
                    aria-invalid={errors.educationLevel ? "true" : "false"}
                    aria-describedby={errors.educationLevel ? "educationLevelError" : undefined}
                  >
                    {Object.values(HelperEducationLevelOption).map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  {errors.educationLevel && <p id="educationLevelError" role="alert" className="text-xs mt-1" style={{ color: 'var(--error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{errors.educationLevel}</p>}
                </div>
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label htmlFor="profileNickname" className="form-label">ชื่อเล่น</label>
                  <input
                    type="text"
                    id="profileNickname"
                    name="nickname"
                    value={formState.nickname}
                    onChange={e => setFormState(prev => ({ ...prev, nickname: e.target.value }))}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label htmlFor="profileFirstName" className="form-label">ชื่อจริง</label>
                  <input
                    type="text"
                    id="profileFirstName"
                    name="firstName"
                    value={formState.firstName}
                    onChange={e => setFormState(prev => ({ ...prev, firstName: e.target.value }))}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label htmlFor="profileLastName" className="form-label">นามสกุล</label>
                  <input
                    type="text"
                    id="profileLastName"
                    name="lastName"
                    value={formState.lastName}
                    onChange={e => setFormState(prev => ({ ...prev, lastName: e.target.value }))}
                    className="form-input"
                    disabled={isSubmitting}
                  />
                </div>
                <div id="address-section" style={{ marginTop: 'var(--space-4)' }}>
                  <label htmlFor="profileAddress" className="form-label">ที่อยู่ (แสดงในโปรไฟล์สาธารณะ)</label>
                  <textarea
                    id="profileAddress"
                    name="address"
                    value={formState.address}
                    onChange={e => setFormState(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="form-input"
                    style={{ minHeight: '80px' }}
                    disabled={isSubmitting}
                  />
                </div>
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label htmlFor="profile-introSentence" className="form-label">
                    เกี่ยวกับฉัน
                  </label>
                  <textarea
                    id="profile-introSentence"
                    name="introSentence"
                    value={formState.introSentence}
                    onChange={e => setFormState(prev => ({ ...prev, introSentence: e.target.value }))}
                    rows={3}
                    className="form-input"
                    style={{ minHeight: '80px' }}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </details>
          )}

          {!formState.isBusinessProfile && (
            <details id="personality-section" className="group border-t" style={{ paddingTop: 'var(--space-4)', borderTopColor: 'var(--border-light)' }}>
              <summary className="flex items-center justify-between cursor-pointer list-none rounded-md hover:bg-neutral-light/50 transition-colors" style={{ padding: 'var(--space-2)', marginLeft: 'calc(-1 * var(--space-2))' }}>
                <h2 className="text-lg font-medium" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                  สิ่งที่ฉันชอบ
                </h2>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" style={{ color: 'var(--primary-blue)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </summary>
              <div style={{ gap: 'var(--space-4)' }}>
                {personalityFields.map(field => (
                  <div key={field.name} style={{ marginBottom: 'var(--space-4)' }}>
                    <label htmlFor={`profile-${field.name}`} className="form-label">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`profile-${field.name}`}
                        name={field.name}
                        value={field.value}
                        onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                        rows={field.name === 'introSentence' ? 3 : 2}
                        className="form-input"
                        style={{ minHeight: field.name === 'introSentence' ? '80px' : '60px' }}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <input
                        type="text"
                        id={`profile-${field.name}`}
                        name={field.name}
                        value={field.value}
                        onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className="form-input"
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {formState.isBusinessProfile && (
            <details id="business-info-section" className="group border-t" style={{ paddingTop: 'var(--space-4)', borderTopColor: 'var(--border-light)' }}>
              <summary className="flex items-center justify-between cursor-pointer list-none rounded-md hover:bg-neutral-light/50 transition-colors" style={{ padding: 'var(--space-2)', marginLeft: 'calc(-1 * var(--space-2))' }}>
                <h2 className="text-lg font-medium" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                  ข้อมูลธุรกิจ
                </h2>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" style={{ color: 'var(--primary-blue)' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </summary>
              <div style={{ gap: 'var(--space-4)' }}>
                {businessInfoFields.map(field => (
                  <div key={field.name} style={{ marginBottom: 'var(--space-4)' }}>
                    <label htmlFor={`profile-${field.name}`} className="form-label">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`profile-${field.name}`}
                        name={field.name}
                        value={field.value}
                        onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                        rows={3}
                        className="form-input"
                        style={{ minHeight: '80px' }}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <input
                        type={field.type as string}
                        id={`profile-${field.name}`}
                        name={field.name}
                        value={field.value}
                        onChange={(e) => setFormState(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className={`form-input ${errors[field.errorKey!] ? 'error' : ''}`}
                        disabled={isSubmitting}
                        aria-invalid={errors[field.errorKey!] ? "true" : "false"}
                        aria-describedby={errors[field.errorKey!] ? `${field.name}Error` : undefined}
                      />
                    )}
                    {field.errorKey && errors[field.errorKey] && <p id={`${field.name}Error`} role="alert" className="text-xs mt-1" style={{ color: 'var(--error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{errors[field.errorKey]}</p>}
                  </div>
                ))}
              </div>
            </details>
          )}

          <details id="contact-info-section" className="group border-t" style={{ paddingTop: 'var(--space-4)', borderTopColor: 'var(--border-light)' }}>
            <summary className="flex items-center justify-between cursor-pointer list-none rounded-md hover:bg-neutral-light/50 transition-colors" style={{ padding: 'var(--space-2)', marginLeft: 'calc(-1 * var(--space-2))' }}>
              <h2 className="text-lg font-medium" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-medium)', color: 'var(--text-primary)' }}>
                ติดต่อ (แสดงในโปรไฟล์สาธารณะ)
              </h2>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-200 group-open:rotate-90" style={{ color: 'var(--primary-blue)' }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </summary>
            <div style={{ marginTop: 'var(--space-3)', gap: 'var(--space-4)' }}>
              <div>
                <label htmlFor="profileMobile" className="form-label">เบอร์โทรศัพท์ <span style={{ color: 'var(--error)' }}>*</span></label>
                <input
                  type="tel"
                  id="profileMobile"
                  name="mobile"
                  value={formState.mobile}
                  onChange={e => setFormState(prev => ({ ...prev, mobile: e.target.value }))}
                  className={`form-input ${errors.mobile ? 'error' : ''}`}
                  aria-describedby={errors.mobile ? "mobile-error" : undefined}
                  aria-invalid={errors.mobile ? "true" : "false"}
                  disabled={isSubmitting}
                />
                {errors.mobile && <p id="mobile-error" role="alert" className="text-xs mt-1" style={{ color: 'var(--error)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{errors.mobile}</p>}
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label htmlFor="profileLineId" className="form-label">LINE ID</label>
                <input
                  type="text"
                  id="profileLineId"
                  name="lineId"
                  value={formState.lineId}
                  onChange={e => setFormState(prev => ({ ...prev, lineId: e.target.value }))}
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label htmlFor="profileFacebook" className="form-label">Facebook</label>
                <input
                  type="text"
                  id="profileFacebook"
                  name="facebook"
                  value={formState.facebook}
                  onChange={e => setFormState(prev => ({ ...prev, facebook: e.target.value }))}
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label htmlFor="profileInstagram" className="form-label">Instagram</label>
                <input
                  type="text"
                  id="profileInstagram"
                  name="instagram"
                  value={formState.instagram}
                  onChange={e => setFormState(prev => ({ ...prev, instagram: e.target.value }))}
                  className="form-input"
                  disabled={!instagramCooldownInfo.canChange || isSubmitting}
                  aria-describedby={!instagramCooldownInfo.canChange ? "instagramCooldownMessage" : undefined}
                />
                {!instagramCooldownInfo.canChange && instagramCooldownInfo.message && (
                  <p id="instagramCooldownMessage" className="text-xs mt-1" style={{ color: 'var(--warning)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{instagramCooldownInfo.message}</p>
                )}
              </div>

              <div style={{ marginTop: 'var(--space-4)' }}>
                <label htmlFor="profileTiktok" className="form-label">TikTok</label>
                <input
                  type="text"
                  id="profileTiktok"
                  name="tiktok"
                  value={formState.tiktok}
                  onChange={e => setFormState(prev => ({ ...prev, tiktok: e.target.value }))}
                  className="form-input"
                  disabled={!tiktokCooldownInfo.canChange || isSubmitting}
                  aria-describedby={!tiktokCooldownInfo.canChange ? "tiktokCooldownMessage" : undefined}
                />
                {!tiktokCooldownInfo.canChange && tiktokCooldownInfo.message && (
                  <p id="tiktokCooldownMessage" className="text-xs mt-1" style={{ color: 'var(--warning)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-1)' }}>{tiktokCooldownInfo.message}</p>
                )}
              </div>
            </div>
          </details>

          {errors.general && <p role="alert" className="text-sm text-center" style={{ color: 'var(--error)', fontSize: 'var(--font-size-sm)' }}>{errors.general}</p>}
          <div className="flex flex-col sm:flex-row pt-4 gap-2 sm:gap-4" style={{ paddingTop: 'var(--space-4)' }}>
            <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto flex-grow" disabled={isSubmitting}>
              💾 บันทึก
            </Button>
            <Button type="button" onClick={onCancel} variant="outline" colorScheme="primary" size="lg" className="w-full sm:w-auto flex-grow" disabled={isSubmitting}>
              ยกเลิก
            </Button>
          </div>
        </form>
      </main>
      {currentUser && (
        <VoiceRecordingModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onSave={handleVoiceSave}
          title="เพิ่มเสียงแนะนำตัว"
        />
      )}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="ยืนยันการลบ"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบเสียงแนะนำตัวนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
      />
    </>
  );
};
