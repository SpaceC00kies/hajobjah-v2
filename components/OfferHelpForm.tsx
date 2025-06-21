
import React, { useState, useEffect } from 'react';
import type { HelperProfile, User } from '../types'; // Added User
import { JobCategory, JobSubCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types'; // Added Province
import { Button } from './Button';
import { containsBlacklistedWords, calculateHoursRemaining } from '../App'; // Changed to calculateHoursRemaining

type FormDataType = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>;


interface OfferHelpFormProps {
  onSubmitProfile: (profileData: FormDataType & { id?: string }) => void;
  onCancel: () => void;
  initialData?: HelperProfile;
  isEditing?: boolean;
  currentUser: User | null; // Added currentUser
  helperProfiles: HelperProfile[]; // Added helperProfiles list
}

const initialFormStateForCreate: FormDataType = {
  profileTitle: '',
  details: '',
  area: '',
  province: Province.ChiangMai, // Default province
  category: '' as JobCategory,
  subCategory: undefined,
  availability: '',
  availabilityDateFrom: '',
  availabilityDateTo: '',
  availabilityTimeDetails: '',
};

type FormErrorsType = Partial<Record<Exclude<keyof HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'>, string>>;


export const OfferHelpForm: React.FC<OfferHelpFormProps> = ({ onSubmitProfile, onCancel, initialData, isEditing, currentUser, helperProfiles }) => {
  const [formData, setFormData] = useState<FormDataType>(initialFormStateForCreate);
  const [formErrors, setFormErrors] = useState<FormErrorsType>({});
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(true);

  const HELPER_PROFILE_COOLDOWN_DAYS_FORM = 3; // Updated to 3 days
  const MAX_ACTIVE_HELPER_PROFILES_FREE_TIER_FORM = 1; // Updated for free tier
  const MAX_ACTIVE_HELPER_PROFILES_BADGE_FORM = 2; // Badge enhancement

  useEffect(() => {
    if (!currentUser) {
      setCanSubmit(false);
      setLimitMessage("กรุณาเข้าสู่ระบบเพื่อสร้างโปรไฟล์");
      return;
    }
    if (isEditing) {
      setCanSubmit(true);
      setLimitMessage(null);
    } else {
      // Cooldown check
      const cooldownHoursTotal = HELPER_PROFILE_COOLDOWN_DAYS_FORM * 24;
      const lastProfileDate = currentUser.postingLimits?.lastHelperProfileDate;
      if (lastProfileDate) {
        const hoursSinceLastPost = (new Date().getTime() - new Date(lastProfileDate as string).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPost < cooldownHoursTotal) {
          const hoursRemaining = Math.ceil(cooldownHoursTotal - hoursSinceLastPost);
          setLimitMessage(`คุณสามารถสร้างโปรไฟล์ใหม่ได้ในอีก ${hoursRemaining} ชั่วโมง`);
          setCanSubmit(false);
          return;
        }
      }
      // Active limit check
      const userActiveProfiles = helperProfiles.filter(p => p.userId === currentUser.id && !p.isExpired && new Date(p.expiresAt as string) > new Date()).length;
      
      let maxProfiles = (currentUser.tier === 'free') ? MAX_ACTIVE_HELPER_PROFILES_FREE_TIER_FORM : 999; // Default for free, high for others
      if (currentUser.activityBadge?.isActive) {
        maxProfiles = MAX_ACTIVE_HELPER_PROFILES_BADGE_FORM; // Badge overrides
      }

      if (userActiveProfiles >= maxProfiles) {
        setLimitMessage(`คุณมีโปรไฟล์ผู้ช่วยที่ยังไม่หมดอายุ ${userActiveProfiles}/${maxProfiles} โปรไฟล์แล้ว`);
        setCanSubmit(false);
        return;
      }
      setLimitMessage(null);
      setCanSubmit(true);
    }
  }, [currentUser, helperProfiles, isEditing]);

  useEffect(() => {
    if (isEditing && initialData) {
      const {
        id, postedAt, userId, authorDisplayName, isSuspicious, isPinned, isUnavailable, contact,
        gender, birthdate, educationLevel, adminVerifiedExperience, interestedCount,
        ownerId, createdAt, updatedAt, expiresAt, isExpired, lastBumpedAt,
        ...editableFieldsBase
      } = initialData;

      const editableFields: FormDataType = {
        profileTitle: editableFieldsBase.profileTitle || '',
        details: editableFieldsBase.details || '',
        area: editableFieldsBase.area || '',
        province: editableFieldsBase.province || Province.ChiangMai,
        category: editableFieldsBase.category || ('' as JobCategory),
        subCategory: editableFieldsBase.subCategory || undefined,
        availability: editableFieldsBase.availability || '',
        availabilityDateFrom: editableFieldsBase.availabilityDateFrom
                                ? (editableFieldsBase.availabilityDateFrom instanceof Date
                                    ? editableFieldsBase.availabilityDateFrom.toISOString().split('T')[0]
                                    : String(editableFieldsBase.availabilityDateFrom))
                                : '',
        availabilityDateTo: editableFieldsBase.availabilityDateTo
                                ? (editableFieldsBase.availabilityDateTo instanceof Date
                                    ? editableFieldsBase.availabilityDateTo.toISOString().split('T')[0]
                                    : String(editableFieldsBase.availabilityDateTo))
                                : '',
        availabilityTimeDetails: editableFieldsBase.availabilityTimeDetails || '',
      };
      setFormData(editableFields);
      if (editableFields.category && JOB_SUBCATEGORIES_MAP[editableFields.category]) {
        setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[editableFields.category]);
      } else {
        setAvailableSubCategories([]);
      }
    } else {
      setFormData(initialFormStateForCreate);
      setAvailableSubCategories([]);
    }
  }, [isEditing, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormDataType;
    let newFormData = { ...formData };

    if (key === 'category') {
        const newCategory = value as JobCategory;
        newFormData = { ...newFormData, category: newCategory, subCategory: undefined }; 
        setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[newCategory] || []);
        if (formErrors.subCategory) {
            setFormErrors(prev => ({ ...prev, subCategory: undefined }));
        }
    } else if (key === 'subCategory') {
        newFormData = { ...newFormData, subCategory: value as JobSubCategory || undefined };
    } else if (key === 'province') {
        newFormData = { ...newFormData, province: value as Province };
    } else {
        newFormData = { ...newFormData, [key]: value };
    }
    setFormData(newFormData);
    if (formErrors[key as keyof FormErrorsType]) {
      setFormErrors(prev => ({ ...prev, [key as keyof FormErrorsType]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: FormErrorsType = {};
    if (!formData.profileTitle.trim()) errors.profileTitle = 'กรุณากรอกหัวข้อโปรไฟล์/บริการ';
    else if (containsBlacklistedWords(formData.profileTitle)) errors.profileTitle = 'หัวข้อโปรไฟล์/บริการมีคำที่ไม่เหมาะสม โปรดแก้ไข';
    if (!formData.details.trim()) errors.details = 'กรุณากรอกรายละเอียดเกี่ยวกับทักษะ/ประสบการณ์';
    else if (containsBlacklistedWords(formData.details)) errors.details = 'รายละเอียดมีคำที่ไม่เหมาะสม โปรดแก้ไข';
    if (!formData.area.trim()) errors.area = 'กรุณากรอกพื้นที่ที่สะดวก';
    if (!formData.province) errors.province = 'กรุณาเลือกจังหวัด';
    if (!formData.category) errors.category = 'กรุณาเลือกหมวดหมู่งานที่ถนัด';
    else if (JOB_SUBCATEGORIES_MAP[formData.category]?.length > 0 && !formData.subCategory) {
        errors.subCategory = 'กรุณาเลือกหมวดหมู่ย่อยที่ถนัด';
    }
    if (formData.availabilityDateFrom && formData.availabilityDateTo && formData.availabilityDateTo < formData.availabilityDateFrom) {
        errors.availabilityDateTo = 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
        alert(limitMessage || "ไม่สามารถสร้างโปรไฟล์ได้ในขณะนี้");
        return;
    }
    if (!validateForm()) return;
    const dataToSubmit: FormDataType & { id?: string } = { ...formData };
    if (isEditing && initialData) {
      dataToSubmit.id = initialData.id;
    }
    onSubmitProfile(dataToSubmit);
     if (!isEditing) {
        setFormData(initialFormStateForCreate);
        setAvailableSubCategories([]);
    }
  };

  const baseProfileFields = [
    { name: 'profileTitle', label: 'หัวข้อโปรไฟล์/บริการ', placeholder: 'เช่น รับจ้างขนของ, ช่วยสอนพิเศษคณิต', type: 'text', required: true },
    { name: 'area', label: 'พื้นที่ที่สะดวก (เช่น เขต, ถนน, ย่าน)', placeholder: 'เช่น ในตัวเมืองเชียงใหม่, ย่านนิมมานเหมินท์', type: 'text', required: true },
  ] as const;

  const availabilityField = { name: 'availability', label: 'หมายเหตุเรื่องวันเวลาที่ว่างโดยรวม (ถ้ามี)', placeholder: 'เช่น "สะดวกเฉพาะช่วงเย็น", "ไม่ว่างวันที่ 10-15 นี้"', type: 'text', required: false };
  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const inputFocusStyle = "focus:border-secondary focus:ring-2 focus:ring-secondary focus:ring-opacity-70";
  const inputErrorStyle = "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  const getDateString = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue;
    return dateValue.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto my-8 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-secondary-hover mb-2 text-center">
        {isEditing ? '📝 แก้ไขโปรไฟล์' : '🙋 สร้างโปรไฟล์'}
      </h2>
      <p className="text-md font-serif text-neutral-dark mb-6 text-center font-normal">
        {isEditing
          ? 'แก้ไขข้อมูลโปรไฟล์ของคุณ (ข้อมูลส่วนตัว เช่น เพศ, อายุ, การศึกษา และข้อมูลติดต่อ จะใช้จากโปรไฟล์หลักของคุณ)'
          : 'ระบุว่าคุณช่วยอะไรได้ ว่างช่วงไหน ทำงานแถวไหนได้ (ข้อมูลส่วนตัว เช่น เพศ, อายุ, การศึกษา และข้อมูลติดต่อ จะดึงมาจากโปรไฟล์หลักของคุณโดยอัตโนมัติ)'}
      </p>
      
      {limitMessage && !isEditing && (
        <div className="mb-6 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm font-sans text-center">
          {limitMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="pt-4 border-t border-neutral-DEFAULT mt-6">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-4">ข้อมูลโปรไฟล์และรายละเอียดบริการ</h3>
            {baseProfileFields.map(field => (
            <div key={field.name} className="mb-6 last:mb-0">
                <label htmlFor={field.name} className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={field.type}
                  id={field.name}
                  name={field.name}
                  value={(formData[field.name as keyof typeof formData] as string) ?? ''}
                  onChange={handleChange}
                  placeholder={field.name === 'profileTitle' ? 'เช่น รับจ้างทำบัญชี, ช่วยสอนพิเศษคณิตศาสตร์, รับตัดต่อวิดีโอ' : field.placeholder}
                  className={`${inputBaseStyle} ${formErrors[field.name as keyof FormErrorsType] ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
                  disabled={!canSubmit && !isEditing}
                />
                {formErrors[field.name as keyof FormErrorsType] && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors[field.name as keyof FormErrorsType]}</p>}
            </div>
            ))}

            <div className="mb-6">
              <label htmlFor="province" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                จังหวัด <span className="text-red-500">*</span>
              </label>
              <select
                id="province"
                name="province"
                value={formData.province}
                onChange={handleChange}
                className={`${selectBaseStyle} ${formErrors.province ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`}
                disabled={!canSubmit && !isEditing}
              >
                {Object.values(Province).map(provinceValue => (
                  <option key={provinceValue} value={provinceValue}>{provinceValue}</option>
                ))}
              </select>
              {formErrors.province && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.province}</p>}
            </div>

            <div className="mb-6">
              <label htmlFor="category" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                หมวดหมู่งานที่ถนัด <span className="text-red-500">*</span>
              </label>
              <select id="category" name="category" value={formData.category} onChange={handleChange} className={`${selectBaseStyle} ${formErrors.category ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} disabled={!canSubmit && !isEditing}>
                <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                {Object.values(JobCategory).map(categoryValue => (<option key={categoryValue} value={categoryValue}>{categoryValue}</option>))}
              </select>
              {formErrors.category && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.category}</p>}
            </div>

            {availableSubCategories.length > 0 && (
                <div className="mb-6">
                    <label htmlFor="subCategory" className="block text-sm font-sans font-medium text-neutral-dark mb-1">หมวดหมู่ย่อยที่ถนัด <span className="text-red-500">*</span></label>
                    <select id="subCategory" name="subCategory" value={formData.subCategory || ''} onChange={handleChange} className={`${selectBaseStyle} ${formErrors.subCategory ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} disabled={(!canSubmit && !isEditing) || availableSubCategories.length === 0}>
                      <option value="" disabled>-- เลือกหมวดหมู่ย่อย --</option>
                      {availableSubCategories.map(subCategoryValue => (<option key={subCategoryValue} value={subCategoryValue}>{subCategoryValue}</option>))}
                    </select>
                    {formErrors.subCategory && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.subCategory}</p>}
                </div>
            )}

            <div>
            <label htmlFor="details" className="block text-sm font-sans font-medium text-neutral-dark mb-1">รายละเอียดทักษะ/ประสบการณ์ที่เกี่ยวข้อง <span className="text-red-500">*</span></label>
            <textarea id="details" name="details" value={formData.details} onChange={handleChange} rows={5} placeholder="เช่น สามารถยกของหนักได้, มีประสบการณ์ดูแลเด็ก 2 ปี, ทำอาหารคลีนได้..." className={`${inputBaseStyle} ${formErrors.details ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} disabled={!canSubmit && !isEditing}/>
            {formErrors.details && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.details}</p>}
            </div>
        </div>

        <div className="pt-4 border-t border-neutral-DEFAULT mt-6">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-4">ช่วงเวลาที่สะดวกทำงาน</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div>
                    <label htmlFor="availabilityDateFrom" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ช่วงวันที่ว่าง: ตั้งแต่</label>
                    <input type="date" id="availabilityDateFrom" name="availabilityDateFrom" value={getDateString(formData.availabilityDateFrom)} onChange={handleChange} className={`${inputBaseStyle} ${formErrors.availabilityDateFrom ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} disabled={!canSubmit && !isEditing}/>
                    {formErrors.availabilityDateFrom && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.availabilityDateFrom}</p>}
                </div>
                <div>
                    <label htmlFor="availabilityDateTo" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ถึง (ถ้ามี)</label>
                    <input type="date" id="availabilityDateTo" name="availabilityDateTo" value={getDateString(formData.availabilityDateTo)} onChange={handleChange} min={getDateString(formData.availabilityDateFrom) || undefined} className={`${inputBaseStyle} ${formErrors.availabilityDateTo ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} disabled={!canSubmit && !isEditing}/>
                    {formErrors.availabilityDateTo && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.availabilityDateTo}</p>}
                </div>
            </div>
            <div className="mb-6">
                <label htmlFor={availabilityField.name} className="block text-sm font-sans font-medium text-neutral-dark mb-1">{availabilityField.label} {availabilityField.required && <span className="text-red-500">*</span>}</label>
                <input type={availabilityField.type} id={availabilityField.name} name={availabilityField.name} value={(formData[availabilityField.name as keyof typeof formData] as string) ?? ''} onChange={handleChange} placeholder={availabilityField.placeholder} className={`${inputBaseStyle} ${formErrors[availabilityField.name as keyof FormErrorsType] ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} disabled={!canSubmit && !isEditing}/>
                {formErrors[availabilityField.name as keyof FormErrorsType] && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors[availabilityField.name as keyof FormErrorsType]}</p>}
            </div>
            <div>
                <label htmlFor="availabilityTimeDetails" className="block text-sm font-sans font-medium text-neutral-dark mb-1">รายละเอียดวัน/เวลาที่สะดวกเพิ่มเติม (ถ้ามี)</label>
                <textarea id="availabilityTimeDetails" name="availabilityTimeDetails" value={formData.availabilityTimeDetails || ''} onChange={handleChange} rows={3} placeholder="เช่น ทุกวัน จ-ศ หลัง 17:00 น., เสาร์-อาทิตย์ทั้งวัน, เฉพาะช่วงปิดเทอม" className={`${inputBaseStyle} ${formErrors.availabilityTimeDetails ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50`} disabled={!canSubmit && !isEditing}/>
                {formErrors.availabilityTimeDetails && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.availabilityTimeDetails}</p>}
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto flex-grow" disabled={!canSubmit && !isEditing}>
            {isEditing ? '💾 บันทึกการแก้ไข' : (canSubmit ? 'ส่งโปรไฟล์' : 'ไม่สามารถส่งโปรไฟล์')}
          </Button>
          <Button type="button" onClick={onCancel} variant="outline" colorScheme="secondary" size="lg" className="w-full sm:w-auto flex-grow">
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
};
