
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import { GenderOption, HelperEducationLevelOption } from '../types';
import { Button } from './Button';
import { isValidThaiMobileNumberUtil } from '../App';

interface UserProfilePageProps {
  currentUser: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<boolean>; // Updated to accept Partial<User>
  onCancel: () => void;
}

type UserProfileFormErrorKeys = 'publicDisplayName' | 'mobile' | 'gender' | 'birthdate' | 'educationLevel' | 'general' | 'photo' | 'businessWebsite' | 'businessSocialProfileLink'; // Added business fields
type FeedbackType = { type: 'success' | 'error'; message: string };
const PUBLIC_DISPLAY_NAME_REGEX_PROFILE = /^[a-zA-Zก-๏\s.]{2,30}$/u;


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
  }, [currentUser]);

  useEffect(() => {
    if (feedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [feedback]);

  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const inputFocusStyle = "focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-70";
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
      newErrors.publicDisplayName = 'ต้องมี 2-30 ตัวอักษร (ไทย/อังกฤษ, เว้นวรรค, จุด)';
    }

    if (!mobile.trim()) newErrors.mobile = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (!isValidThaiMobileNumberUtil(mobile)) newErrors.mobile = 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 08X-XXX-XXXX)';

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
      // Check if there's already a photo error, if not, set general validation message.
      if (!errors.photo && !errors.publicDisplayName) { // Check publicDisplayName error too
        setFeedback({ type: 'error', message: 'ข้อมูลไม่ถูกต้อง โปรดตรวจสอบข้อผิดพลาด' });
      } else {
         setFeedback({ type: 'error', message: errors.photo || errors.publicDisplayName }); // Show photo or publicDisplayName error if it exists
      }
      return;
    }

    if (errors.photo || errors.publicDisplayName) {
      setFeedback({ type: 'error', message: errors.photo || errors.publicDisplayName });
      return;
    }

    const success = await onUpdateProfile({
      publicDisplayName, mobile, lineId, facebook, gender, birthdate, educationLevel, photo: photoBase64, address,
      nickname, firstName, lastName, // Include new fields
      favoriteMusic, favoriteBook, favoriteMovie, hobbies, favoriteFood, dislikedThing, introSentence,
      isBusinessProfile, // Include the business toggle state
      // Business Info
      businessName, businessType, aboutBusiness, businessAddress, businessWebsite, businessSocialProfileLink
    });
    if (success) {
      setFeedback({ type: 'success', message: 'อัปเดตโปรไฟล์เรียบร้อยแล้ว!' });
    } else {
      setFeedback({ type: 'error', message: 'เกิดข้อผิดพลาดบางอย่าง ไม่สามารถบันทึกข้อมูลได้' });
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
      <h2 className="text-3xl font-sans font-semibold text-secondary-hover mb-6 text-center">👤 โปรไฟล์ของฉัน</h2>

      {feedback && (
        <div
          ref={feedbackRef}
          className={`p-3 mb-4 rounded-md text-sm font-sans font-medium text-center
            ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : ''}
            ${feedback.type === 'error' ? 'bg-red-100 text-red-700' : ''}`}
          role="alert"
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col items-center mb-6">
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

        <div>
          <label htmlFor="profilePublicDisplayName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อที่แสดงบนเว็บไซต์ (สาธารณะ) <span className="text-red-500">*</span></label>
          <input
            type="text"
            id="profilePublicDisplayName"
            value={publicDisplayName}
            onChange={(e) => setPublicDisplayName(e.target.value)}
            className={`${inputBaseStyle} ${errors.publicDisplayName ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
            placeholder="เช่น Puuna V."
          />
           <p className="text-xs font-sans text-neutral-medium mt-1">
              ชื่อนี้จะแสดงบนเว็บไซต์ (ไทย/อังกฤษ, 2-30 ตัวอักษร, อนุญาต เว้นวรรค, จุด) เช่น 'Sunny Y.'
            </p>
          {errors.publicDisplayName && <p className="text-red-500 font-sans text-xs mt-1">{errors.publicDisplayName}</p>}
        </div>

        <div>
          <label htmlFor="profileUsername" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อผู้ใช้ (สำหรับเข้าระบบ)</label>
          <input
            type="text"
            id="profileUsername"
            value={currentUser.username}
            readOnly
            className={`${inputBaseStyle} ${readOnlyStyle} focus:bg-gray-50`}
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
            className={`${inputBaseStyle} ${readOnlyStyle} focus:bg-gray-50`}
            aria-readonly="true"
          />
        </div>
        
        <div className="pt-4 border-t border-neutral-DEFAULT/50">
          <label className="flex items-center space-x-2 cursor-pointer">
              <input
                  type="checkbox"
                  checked={isBusinessProfile}
                  onChange={(e) => setIsBusinessProfile(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-secondary rounded border-neutral-DEFAULT focus:ring-secondary focus:ring-opacity-50"
              />
              <span className="text-sm font-sans font-medium text-neutral-dark">ฉันเป็นธุรกิจ/ร้านค้า (ซ่อนข้อมูลส่วนตัวบางอย่างบนโปรไฟล์สาธารณะ)</span>
          </label>
          <p className="text-xs font-sans text-neutral-medium mt-1 pl-7">
            หมายเหตุ: หากคุณเป็นฟรีแลนซ์ การแสดงข้อมูลส่วนตัวบางอย่าง (เช่น เกี่ยวกับฉัน, สิ่งที่ชอบ) อาจช่วยสร้างความน่าเชื่อถือและความเป็นกันเองกับผู้ว่าจ้างได้ พิจารณาตามความเหมาะสมของงานที่คุณนำเสนอ
          </p>
        </div>


        <div className="pt-4 border-t border-neutral-DEFAULT/50">
            <label htmlFor="profile-introSentence" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                💬 เกี่ยวกับฉัน
            </label>
            <textarea
                id="profile-introSentence"
                value={introSentence}
                onChange={(e) => setIntroSentence(e.target.value)}
                rows={3}
                className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น เป็นคนง่ายๆ สบายๆ ชอบเรียนรู้สิ่งใหม่"
            />
        </div>


        <details className="group pt-4 border-t border-neutral-DEFAULT/50" open>
          <summary className="flex items-center justify-between cursor-pointer list-none p-2 -ml-2 rounded-md hover:bg-neutral-light/50 transition-colors">
            <h3 className="text-lg font-sans font-medium text-neutral-dark">
              ข้อมูลส่วนตัว
            </h3>
            <span className="text-secondary transform transition-transform duration-200 group-open:rotate-90">
              ▶
            </span>
          </summary>
          <div className="mt-3 space-y-4">
            {/* Removed hint text: "ข้อมูลส่วนนี้ จำเป็นต้องกรอก..." */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                <div>
                    <label className="block text-sm font-sans font-medium text-neutral-dark mb-1">เพศ <span className="text-red-500">*</span></label>
                    <div className="space-y-1">
                        {Object.values(GenderOption).map(optionValue => (
                        <label key={optionValue} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="profileGender" value={optionValue} checked={gender === optionValue}
                                    onChange={() => setGender(optionValue)}
                                    className="form-radio h-4 w-4 text-secondary border-[#CCCCCC] focus:ring-secondary"/>
                            <span className="text-neutral-dark font-sans font-normal text-sm">{optionValue}</span>
                        </label>
                        ))}
                    </div>
                    {errors.gender && <p className="text-red-500 font-sans text-xs mt-1">{errors.gender}</p>}
                </div>
                <div>
                    <label htmlFor="profileBirthdate" className="block text-sm font-sans font-medium text-neutral-dark mb-1">วันเกิด <span className="text-red-500">*</span></label>
                    <input type="date" id="profileBirthdate" value={birthdate} onChange={handleBirthdateChange}
                            max={new Date().toISOString().split("T")[0]}
                            className={`${inputBaseStyle} ${errors.birthdate ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} />
                    {currentAge !== null && <p className="text-xs font-sans text-neutral-dark mt-1">อายุ: {currentAge} ปี</p>}
                    {errors.birthdate && <p className="text-red-500 font-sans text-xs mt-1">{errors.birthdate}</p>}
                </div>
            </div>
            <div>
                <label htmlFor="profileEducationLevel" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ระดับการศึกษา <span className="text-red-500">*</span></label>
                <select id="profileEducationLevel" value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value as HelperEducationLevelOption)}
                        className={`${selectBaseStyle} ${errors.educationLevel ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}>
                    {Object.values(HelperEducationLevelOption).map(level => (
                        <option key={level} value={level}>{level}</option>
                    ))}
                </select>
                 {errors.educationLevel && <p className="text-red-500 font-sans text-xs mt-1">{errors.educationLevel}</p>}
            </div>
            <div className="mt-4">
                <label htmlFor="profileNickname" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อเล่น</label>
                <input type="text" id="profileNickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`} placeholder="เช่น ซันนี่, จอห์น"/>
            </div>
            <div className="mt-4">
                <label htmlFor="profileFirstName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ชื่อจริง</label>
                <input type="text" id="profileFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`} placeholder="เช่น ยาทิดา, สมชาย"/>
            </div>
            <div className="mt-4">
                <label htmlFor="profileLastName" className="block text-sm font-sans font-medium text-neutral-dark mb-1">นามสกุล</label>
                <input type="text" id="profileLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`} placeholder="เช่น แสงอรุณ, ใจดี"/>
            </div>
            <div>
              <label htmlFor="profileAddress" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ที่อยู่ (จะแสดงในโปรไฟล์สาธารณะของคุณ)</label>
              <textarea
                id="profileAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น บ้านเลขที่, ถนน, ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์"
              />
            </div>
          </div>
        </details>

        <details className="group pt-4 border-t border-neutral-DEFAULT/50">
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
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    rows={field.name === 'introSentence' ? 3 : 2}
                    className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type="text"
                    id={`profile-${field.name}`}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        </details>

        <details className="group pt-4 border-t border-neutral-DEFAULT/50">
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
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    rows={3}
                    className={`${textareaBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type={field.type as string}
                    id={`profile-${field.name}`}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    className={`${inputBaseStyle} ${errors[field.errorKey as keyof typeof errors] ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
                    placeholder={field.placeholder}
                  />
                )}
                {field.errorKey && errors[field.errorKey as keyof typeof errors] && <p className="text-red-500 font-sans text-xs mt-1">{errors[field.errorKey as keyof typeof errors]}</p>}
              </div>
            ))}
          </div>
        </details>


        <div className="pt-4 border-t border-neutral-DEFAULT/50">
             <h3 className="text-lg font-sans font-medium text-neutral-dark mb-3">ข้อมูลติดต่อส่วนตัว (จะแสดงในโพสต์ของคุณ)</h3>
            <div>
            <label htmlFor="profileMobile" className="block text-sm font-sans font-medium text-neutral-dark mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
            <input
                type="tel"
                id="profileMobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className={`${inputBaseStyle} ${errors.mobile ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น 0812345678"
                aria-describedby={errors.mobile ? "mobile-error" : undefined}
                aria-invalid={!!errors.mobile}
            />
            {errors.mobile && <p id="mobile-error" className="text-red-500 font-sans text-xs mt-1">{errors.mobile}</p>}
            </div>

            <div className="mt-4">
            <label htmlFor="profileLineId" className="block text-sm font-sans font-medium text-neutral-dark mb-1">LINE ID</label>
            <input
                type="text"
                id="profileLineId"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="เช่น mylineid"
            />
            </div>

            <div className="mt-4">
            <label htmlFor="profileFacebook" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Facebook</label>
            <input
                type="text"
                id="profileFacebook"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className={`${inputBaseStyle} ${inputFocusStyle} focus:bg-gray-50`}
                placeholder="ลิงก์โปรไฟล์ หรือชื่อผู้ใช้ Facebook"
            />
            </div>
        </div>

        {errors.general && <p className="text-red-500 font-sans text-sm text-center">{errors.general}</p>}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto flex-grow">💾 บันทึกการเปลี่ยนแปลง</Button>
            <Button type="button" onClick={onCancel} variant="outline" colorScheme="secondary" size="lg" className="w-full sm:w-auto flex-grow">
                ยกเลิก
            </Button>
        </div>
      </form>
    </div>
  );
};