


import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types/types';
import { GenderOption, HelperEducationLevelOption } from '../types/types';
import { Button } from './Button';
import { isValidThaiMobileNumber } from '../utils/validation';
import { ProfileCompletenessWizard } from './ProfileCompletenessWizard'; // Import the new wizard

interface UserProfilePageProps {
  currentUser: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<boolean>; // Updated to accept Partial<User>
  onCancel: () => void;
}

type UserProfileFormErrorKeys = 'publicDisplayName' | 'mobile' | 'gender' | 'birthdate' | 'educationLevel' | 'general' | 'photo' | 'businessWebsite' | 'businessSocialProfileLink'; // Added business fields
type FeedbackType = { type: 'success' | 'error'; message: string };
const PUBLIC_DISPLAY_NAME_REGEX_PROFILE = /^[a-zA-Z0-9ก-๏\s.]{2,30}$/u; // Matched with RegistrationForm


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
  const [publicDisplayName, setPublicDisplayName] = useState(currentUser.publicDisplayName); // Renamed from displayName
  const [mobile, setMobile] = useState(currentUser.mobile);
  const [lineId, setLineId] = useState(currentUser.lineId || '');
  const [facebook, setFacebook] = useState(currentUser.facebook || '');
  const [gender, setGender] = useState(currentUser.gender || GenderOption.NotSpecified);
  const [birthdate, setBirthdate] = useState(currentUser.birthdate || '');
  const [educationLevel, setEducationLevel] = useState(currentUser.educationLevel || HelperEducationLevelOption.NotStated);
  const [currentAge, setCurrentAge] = useState<number | null>(calculateAge(currentUser.birthdate));
  const [address, setAddress] = useState(currentUser.address || '');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(currentUser.photo);

  // New personal info states
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [firstName, setFirstName] = useState(currentUser.firstName || '');
  const [lastName, setLastName] = useState(currentUser.lastName || '');

  // Personality states
  const [favoriteMusic, setFavoriteMusic] = useState(currentUser.favoriteMusic || '');
  const [favoriteBook, setFavoriteBook] = useState(currentUser.favoriteBook || '');
  const [favoriteMovie, setFavoriteMovie] = useState(currentUser.favoriteMovie || '');
  const [hobbies, setHobbies] = useState(currentUser.hobbies || '');
  const [favoriteFood, setFavoriteFood] = useState(currentUser.favoriteFood || '');
  const [dislikedThing, setDislikedThing] = useState(currentUser.dislikedThing || '');
  const [introSentence, setIntroSentence] = useState(currentUser.introSentence || '');

  // Business Info States
  const [isBusinessProfile, setIsBusinessProfile] = useState(currentUser.isBusinessProfile || false); // New state for business toggle
  const [businessName, setBusinessName] = useState(currentUser.businessName || '');
  const [businessType, setBusinessType] = useState(currentUser.businessType || '');
  const [aboutBusiness, setAboutBusiness] = useState(currentUser.aboutBusiness || '');
  const [businessAddress, setBusinessAddress] = useState(currentUser.businessAddress || '');
  const [businessWebsite, setBusinessWebsite] = useState(currentUser.businessWebsite || '');
  const [businessSocialProfileLink, setBusinessSocialProfileLink] = useState(currentUser.businessSocialProfileLink || '');


  const [errors, setErrors] = useState<Partial<Record<UserProfileFormErrorKeys, string>>>({});
  const [feedback, setFeedback] = useState<FeedbackType | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const [displayNameCooldownInfo, setDisplayNameCooldownInfo] = useState<{ canChange: boolean; message?: string }>({ canChange: true });


  useEffect(() => {
    setPublicDisplayName(currentUser.publicDisplayName);
    setMobile(currentUser.mobile);
    setLineId(currentUser.lineId || '');
    setFacebook(currentUser.facebook || '');
    setGender(currentUser.gender || GenderOption.NotSpecified);
    setBirthdate(currentUser.birthdate || '');
    setEducationLevel(currentUser.educationLevel || HelperEducationLevelOption.NotStated);
    setCurrentAge(calculateAge(currentUser.birthdate));
    setAddress(currentUser.address || '');
    setPhotoBase64(currentUser.photo);
    // Update new personal info states
    setNickname(currentUser.nickname || '');
    setFirstName(currentUser.firstName || '');
    setLastName(currentUser.lastName || '');
    // Update personality states
    setFavoriteMusic(currentUser.favoriteMusic || '');
    setFavoriteBook(currentUser.favoriteBook || '');
    setFavoriteMovie(currentUser.favoriteMovie || '');
    setHobbies(currentUser.hobbies || '');
    setFavoriteFood(currentUser.favoriteFood || '');
    setDislikedThing(currentUser.dislikedThing || '');
    setIntroSentence(currentUser.introSentence || '');
    // Update business info states
    setIsBusinessProfile(currentUser.isBusinessProfile || false); // Update business toggle state
    setBusinessName(currentUser.businessName || '');
    setBusinessType(currentUser.businessType || '');
    setAboutBusiness(currentUser.aboutBusiness || '');
    setBusinessAddress(currentUser.businessAddress || '');
    setBusinessWebsite(currentUser.businessWebsite || '');
    setBusinessSocialProfileLink(currentUser.businessSocialProfileLink || '');

    // Check display name cooldown
    const updateCount = currentUser.publicDisplayNameUpdateCount || 0;
    const lastChange = currentUser.lastPublicDisplayNameChangeAt;
    if (updateCount > 0 && lastChange) {
      const lastChangeDate = typeof lastChange === 'string' ? new Date(lastChange) : lastChange;
      if (lastChangeDate instanceof Date) {
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
         setDisplayNameCooldownInfo({ canChange: true }); // Should not happen if data is correct
      }
    } else {
      setDisplayNameCooldownInfo({ canChange: true }); // First change is free
    }

  }, [currentUser]);

  useEffect(() => {
    if (feedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [feedback]);

  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-sans font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const inputFocusStyle = "focus:!border-secondary focus:!ring-2 focus:!ring-secondary focus:!ring-opacity-70"; // Added !important
  const inputErrorStyle = "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70";
  const readOnlyStyle = "bg-neutral-light cursor-not-allowed";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  const textareaBaseStyle = `${inputBaseStyle} min-h-[60px]`;


  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setErrors(prev => ({ ...prev, photo: 'ขนาดรูปภาพต้องไม่เกิน 2MB' }));
        if (event.target) event.target.value = ''; // Reset file input
        setPhotoBase64(currentUser.photo); // Revert to original if new one is invalid
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
        setErrors(prev => ({ ...prev, photo: undefined }));
      };
      reader.onerror = () => {
        setErrors(prev => ({ ...prev, photo: 'ไม่สามารถอ่านไฟล์รูปภาพได้' }));
        setPhotoBase64(currentUser.photo); // Revert on error
      }
      reader.readAsDataURL(file);
    } else {
      // User cancelled file selection or no file was selected
      setPhotoBase64(undefined); // Allow removing photo by selecting no file
      setErrors(prev => ({ ...prev, photo: undefined })); // Clear any previous photo error
    }
  };

  const handleBirthdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBirthdate = e.target.value;
    setBirthdate(newBirthdate);
    const age = calculateAge(newBirthdate);
    setCurrentAge(age);
    if (age !== null || newBirthdate === '') {
        setErrors(prev => ({ ...prev, birthdate: undefined }));
    }
  };

  const isValidUrl = (urlString?: string): boolean => {
    if (!urlString || urlString.trim() === '') return true; // Optional fields are valid if empty
    try {
      new URL(urlString);
      return true;
    } catch (_) {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<UserProfileFormErrorKeys, string>> = {};
     if (!publicDisplayName.trim()) {
      newErrors.publicDisplayName = 'กรุณากรอกชื่อที่ต้องการให้แสดงบนเว็บไซต์';
    } else if (!PUBLIC_DISPLAY_NAME_REGEX_PROFILE.test(publicDisplayName)) {
      newErrors.publicDisplayName = 'ต้องมี 2-30 ตัวอักษร (ไทย/อังกฤษ, ตัวเลข, เว้นวรรค, จุด)';
    }

    if (!displayNameCooldownInfo.canChange && publicDisplayName !== currentUser.publicDisplayName) {
        newErrors.publicDisplayName = displayNameCooldownInfo.message;
    }

    if (!mobile.trim()) newErrors.mobile = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!isValidThaiMobileNumber(mobile)) newErrors.mobile = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 08X-XXX-XXXX)';

    if (!gender || gender === GenderOption.NotSpecified) newErrors.gender = 'กรุณาเลือกเพศ';
    if (!birthdate) newErrors.birthdate = 'กรุณาเลือกวันเกิด';
    else if (calculateAge(birthdate) === null) newErrors.birthdate = 'กรุณาเลือกวันเกิดที่ถูกต้อง (ต้องไม่ใช่วันในอนาคต)';
    if (!educationLevel || educationLevel === HelperEducationLevelOption.NotStated) newErrors.educationLevel = 'กรุณาเลือกระดับการศึกษา';

    if (!isValidUrl(businessWebsite)) newErrors.businessWebsite = 'รูปแบบ URL ของเว็บไซต์ธุรกิจไม่ถูกต้อง';
    if (!isValidUrl(businessSocialProfileLink)) newErrors.businessSocialProfileLink = 'รูปแบบ URL ของโซเชียลโปรไฟล์ธุรกิจไม่ถูกต้อง';


    setErrors(prev => ({...prev, ...newErrors})); // Merge with existing errors (e.g. photo error)
    return Object.keys(newErrors).filter(key => newErrors[key as keyof typeof newErrors] !== undefined).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(prev => ({ ...prev, general: undefined }));
    setFeedback(null);
  
    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors).find(key => errors[key as keyof typeof errors]) as keyof typeof errors | undefined;
      const specificErrorMessage = firstErrorKey ? errors[firstErrorKey] : 'ข้อมูลไม่ถูกต้อง โปรดตรวจสอบข้อผิดพลาด';
      setFeedback({ type: 'error', message: specificErrorMessage || 'ข้อมูลไม่ถูกต้อง โปรดตรวจสอบข้อผิดพลาด' });
      return;
    }
  
    try {
      const success = await onUpdateProfile({
        publicDisplayName, mobile, lineId, facebook, gender, birthdate, educationLevel, photo: photoBase64, address,
        nickname, firstName, lastName, 
        favoriteMusic, favoriteBook, favoriteMovie, hobbies, favoriteFood, dislikedThing, introSentence,
        isBusinessProfile, 
        businessName, businessType, aboutBusiness, businessAddress, businessWebsite, businessSocialProfileLink
      });
      if (success) {
        setFeedback({ type: 'success', message: 'อัปเดตโปรไฟล์เรียบร้อยแล้ว!' });
        // Re-check cooldown after successful update, as `currentUser` prop will update
        const updateCount = currentUser.publicDisplayNameUpdateCount || 0;
        const lastChange = currentUser.lastPublicDisplayNameChangeAt;
        if (updateCount > 0 && lastChange) {
            const lastChangeDate = typeof lastChange === 'string' ? new Date(lastChange) : lastChange;
             if (lastChangeDate instanceof Date) {
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
            }
        } else {
             setDisplayNameCooldownInfo({ canChange: true });
        }
      } else {
        setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดบางอย่าง ไม่สามารถบันทึกข้อมูลได้' });
      }
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.message || 'เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์' });
    }
  };

  const personalityFields = [
    { name: 'favoriteMusic', label: '🎧 เพลงที่ชอบ', value: favoriteMusic, setter: setFavoriteMusic, placeholder: 'เช่น Pop, Rock, ลูกทุ่ง, Jazz', type: 'text' },
    { name: 'favoriteBook', label: '📚 หนังสือที่ชอบ', value: favoriteBook, setter: setFavoriteBook, placeholder: 'เช่น นิยายสืบสวน, การ์ตูน, พัฒนาตัวเอง', type: 'text' },
    { name: 'favoriteMovie', label: '🎬 หนังที่ชอบ', value: favoriteMovie, setter: setFavoriteMovie, placeholder: 'เช่น Action, Comedy, Sci-fi, Drama', type: 'text' },
    { name: 'hobbies', label: '🧶 งานอดิเรก', value: hobbies, setter: setHobbies, placeholder: 'เช่น อ่านหนังสือ, เล่นเกม, วาดรูป, ทำอาหาร', type: 'textarea' },
    { name: 'favoriteFood', label: '🍜 อาหารที่ชอบ', value: favoriteFood, setter: setFavoriteFood, placeholder: 'เช่น ส้มตำ, พิซซ่า, ซูชิ, ก๋วยเตี๋ยว', type: 'text' },
    { name: 'dislikedThing', label: '🚫 สิ่งที่ไม่ชอบที่สุด', value: dislikedThing, setter: setDislikedThing, placeholder: 'เช่น ความไม่ซื่อสัตย์, แมลงสาบ', type: 'text' },
    // introSentence is moved out
  ];

  const businessInfoFields = [
    { name: 'businessName', label: 'ชื่อธุรกิจ/ร้านค้า/บริษัท', value: businessName, setter: setBusinessName, placeholder: 'เช่น ร้านกาแฟแมวฟ้า, บริการออกแบบซันนี่', type: 'text' },
    { name: 'businessType', label: 'ประเภทธุรกิจ', value: businessType, setter: setBusinessType, placeholder: 'เช่น ร้านอาหาร, บริษัทจำกัด, ฟรีแลนซ์', type: 'text' },
    { name: 'aboutBusiness', label: 'เกี่ยวกับธุรกิจ', value: aboutBusiness, setter: setAboutBusiness, placeholder: 'อธิบายสั้นๆ เกี่ยวกับธุรกิจของคุณ...', type: 'textarea' },
    { name: 'businessAddress', label: 'ที่ตั้งธุรกิจ (ถ้ามี)', value: businessAddress, setter: setBusinessAddress, placeholder: 'เช่น 123 ถนนนิมมาน, เชียงใหม่', type: 'text' },
    { name: 'businessWebsite', label: 'เว็บไซต์ธุรกิจ', value: businessWebsite, setter: setBusinessWebsite, placeholder: 'https://yourbusiness.com', type: 'url', errorKey: 'businessWebsite' as UserProfileFormErrorKeys },
    { name: 'businessSocialProfileLink', label: 'ลิงก์โซเชียลโปรไฟล์ธุรกิจ', value: businessSocialProfileLink, setter: setBusinessSocialProfileLink, placeholder: 'เช่น ลิงก์ Facebook Page, LINE OA', type: 'url', errorKey: 'businessSocialProfileLink' as UserProfileFormErrorKeys },
  ];


  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-xl mx-auto my-10 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-primary-dark mb-6 text-center">👤 โปรไฟล์ของฉัน</h2>
      
      <ProfileCompletenessWizard currentUser={currentUser} />

      {feedback && (
        <div
          ref={feedbackRef}
          className={`p-3 my-4 rounded-md text-sm font-sans font-medium text-center
            ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : ''}
            ${feedback.type === 'error' ? 'bg-red-100 text-red-700' : ''}`}
          role="alert"
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div id="profile-photo-section" className="flex flex-col items-center mb-6">
          {photoBase64 ? (
            <img src={photoBase64} alt="Profile Preview" className="w-32 h-32 rounded-full object-cover shadow-md mb-3" />
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
          />
          {errors.photo && <p className="text-red-500 font-sans text-xs mt-1 text-center">{errors.photo}</p>}
        </div>

        <div className="pt-4 border-t border-neutral-DEFAULT/50">
          <label className="flex items-center space-x-2 cursor-pointer">
              <input
                  type="checkbox"
                  checked={isBusinessProfile}
                  onChange={(e) => setIsBusinessProfile(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-secondary rounded border-neutral-DEFAULT focus:!ring-2 focus:!ring-offset-1 focus:!ring-offset-white focus:!ring-secondary focus:!ring-opacity-70"
              />
              <span className="text-sm font-sans font-medium text-neutral-dark">ฉันเป็นธุรกิจ/ร้านค้า (โปรไฟล์สาธารณะจะแสดงเฉพาะข้อมูลธุรกิจ)</span>
          </label>
          <p className="text-xs font-sans text-neutral-medium mt-1 pl-7">
            หมายเหตุ: หากคุณเป็นฟรีแลนซ์หรือเสนอบริการ เราไม่แนะนำให้ติ๊กข้อนี้ เพราะการแสดงข้อมูลส่วนตัวบางอย่าง เช่น เกี่ยวกับฉัน, สิ่งที่ชอบ จะช่วยสร้างความน่าเชื่อถือ
          </p>
        </div>

        <div>
          <label htmlFor="profilePublicDisplayName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อที่แสดงบนเว็บไซต์ <span className="text-red-500">*</span></label>
          <div className="relative">
            <input
              type="text"
              id="profilePublicDisplayName"
              name="publicDisplayName"
              value={publicDisplayName}
              onChange={(e) => { setPublicDisplayName(e.target.value); if(errors.publicDisplayName) setErrors(prev => ({ ...prev, publicDisplayName: undefined })); }}
              className={`${inputBaseStyle} ${!displayNameCooldownInfo.canChange ? readOnlyStyle : ''} ${errors.publicDisplayName ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
              disabled={!displayNameCooldownInfo.canChange}
            />
          </div>
          <p className="text-xs font-sans text-neutral-medium mt-1">{displayNameCooldownInfo.canChange ? "สามารถเปลี่ยนได้ทุก 14 วัน" : displayNameCooldownInfo.message}</p>
          {errors.publicDisplayName && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{errors.publicDisplayName}</p>}
        </div>
        
        {/* ... Rest of the form groups ... */}
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" onClick={onCancel} variant="outline" colorScheme="neutral" size="md">
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary" size="md">
            💾 บันทึกการเปลี่ยนแปลง
          </Button>
        </div>
      </form>
    </div>
  );
};
