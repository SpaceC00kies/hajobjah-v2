
import React, { useState, useEffect } from 'react';
import type { HelperProfile } from '../types';
import { Button } from './Button';
import { containsBlacklistedWords } from '../App'; // Import blacklist checker

type FormDataType = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>;


interface OfferHelpFormProps {
  onSubmitProfile: (profileData: FormDataType & { id?: string }) => void; 
  onCancel: () => void;
  initialData?: HelperProfile; 
  isEditing?: boolean;
}

const initialFormStateForCreate: FormDataType = {
  profileTitle: '',
  details: '',
  area: '',
  availability: '', 
  availabilityDateFrom: '',
  availabilityDateTo: '',
  availabilityTimeDetails: '', 
};

type FormErrorsType = Partial<Record<Exclude<keyof HelperProfile, 'id' | 'postedAt' | 'userId' | 'username' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt'>, string>>;


export const OfferHelpForm: React.FC<OfferHelpFormProps> = ({ onSubmitProfile, onCancel, initialData, isEditing }) => {
  const [formData, setFormData] = useState<FormDataType>(initialFormStateForCreate);
  const [formErrors, setFormErrors] = useState<FormErrorsType>({});

  useEffect(() => {
    if (isEditing && initialData) {
      const { 
        id, postedAt, userId, username, isSuspicious, isPinned, isUnavailable, contact,
        gender, birthdate, educationLevel, adminVerifiedExperience, interestedCount, 
        ownerId, createdAt, updatedAt, // Destructure to exclude
        ...editableFieldsBase
      } = initialData;
      
      const editableFields: FormDataType = {
        profileTitle: editableFieldsBase.profileTitle || '',
        details: editableFieldsBase.details || '',
        area: editableFieldsBase.area || '',
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
    } else {
      setFormData(initialFormStateForCreate);
    }
  }, [isEditing, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormDataType; 

    setFormData(prev => ({ ...prev, [key]: value }));

    if (formErrors[key as keyof FormErrorsType]) { 
      setFormErrors(prev => ({ ...prev, [key as keyof FormErrorsType]: undefined }));
    }
  };
  
  const validateForm = () => {
    const errors: FormErrorsType = {};
    if (!formData.profileTitle.trim()) errors.profileTitle = 'กรุณากรอกหัวข้อโปรไฟล์';
    else if (containsBlacklistedWords(formData.profileTitle)) errors.profileTitle = 'หัวข้อโปรไฟล์มีคำที่ไม่เหมาะสม โปรดแก้ไข';
    
    if (!formData.details.trim()) errors.details = 'กรุณากรอกรายละเอียดเกี่ยวกับตัวเอง';
    else if (containsBlacklistedWords(formData.details)) errors.details = 'รายละเอียดมีคำที่ไม่เหมาะสม โปรดแก้ไข';

    if (!formData.area.trim()) errors.area = 'กรุณากรอกพื้นที่ที่สะดวก';
    
    if (formData.availabilityDateFrom && formData.availabilityDateTo && formData.availabilityDateTo < formData.availabilityDateFrom) {
        errors.availabilityDateTo = 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const dataToSubmit: FormDataType & { id?: string } = { ...formData }; 
    if (isEditing && initialData) {
      dataToSubmit.id = initialData.id;
    }
    onSubmitProfile(dataToSubmit);
     if (!isEditing) {
        setFormData(initialFormStateForCreate);
    }
  };

  const baseProfileFields = [
    { name: 'profileTitle', label: 'หัวข้อโปรไฟล์', placeholder: 'เช่น รับจ้างขนของ, ช่วยสอนพิเศษคณิต', type: 'text', required: true },
    { name: 'area', label: 'พื้นที่ที่สะดวก (เช่น เขต, ถนน, ย่าน)', placeholder: 'เช่น ในตัวเมืองเชียงใหม่, ย่านนิมมานเหมินท์', type: 'text', required: true },
    { name: 'availability', label: 'หมายเหตุเรื่องวันเวลาที่ว่างโดยรวม (ถ้ามี)', placeholder: 'เช่น "สะดวกเฉพาะช่วงเย็น", "ไม่ว่างวันที่ 10-15 นี้"', type: 'text', required: false },
  ] as const;
  
  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border border-[#CCCCCC] dark:border-dark-border rounded-[10px] text-neutral-dark dark:text-dark-text font-serif font-normal focus:outline-none";
  const inputFocusStyle = "focus:border-secondary dark:focus:border-dark-secondary-DEFAULT focus:ring-2 focus:ring-secondary focus:ring-opacity-70 dark:focus:ring-dark-secondary-DEFAULT dark:focus:ring-opacity-70";
  const inputErrorStyle = "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70";

  const getDateString = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue;
    return dateValue.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white dark:bg-dark-cardBg p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto my-8 border border-neutral-DEFAULT dark:border-dark-border">
      <h2 className="text-3xl font-sans font-semibold text-secondary-hover dark:text-dark-secondary-hover mb-2 text-center">
        {isEditing ? '📝 แก้ไขโปรไฟล์ผู้ช่วย' : '🙋‍♀️ ฝากโปรไฟล์ไว้ เผื่อมีใครต้องการคนช่วย'}
      </h2>
      <p className="text-md font-serif text-neutral-dark dark:text-dark-textMuted mb-6 text-center font-normal">
        {isEditing 
          ? 'แก้ไขข้อมูลโปรไฟล์ของคุณ (ข้อมูลส่วนตัว เช่น เพศ, อายุ, การศึกษา และข้อมูลติดต่อ จะใช้จากโปรไฟล์หลักของคุณ)' 
          : 'ระบุว่าคุณช่วยอะไรได้ ว่างช่วงไหน ทำงานแถวไหนได้ (ข้อมูลส่วนตัว เช่น เพศ, อายุ, การศึกษา และข้อมูลติดต่อ จะดึงมาจากโปรไฟล์หลักของคุณโดยอัตโนมัติ)'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="pt-4 border-t border-neutral-DEFAULT dark:border-dark-border/50 mt-6">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark dark:text-dark-text mb-4">ช่วงเวลาที่สะดวกทำงาน</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div>
                    <label htmlFor="availabilityDateFrom" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">ช่วงวันที่ว่าง: ตั้งแต่</label>
                    <input type="date" id="availabilityDateFrom" name="availabilityDateFrom" value={getDateString(formData.availabilityDateFrom)} onChange={handleChange}
                        className={`${inputBaseStyle} ${formErrors.availabilityDateFrom ? inputErrorStyle : inputFocusStyle}`} />
                    {formErrors.availabilityDateFrom && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.availabilityDateFrom}</p>}
                </div>
                <div>
                    <label htmlFor="availabilityDateTo" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">ถึง (ถ้ามี)</label>
                    <input type="date" id="availabilityDateTo" name="availabilityDateTo" value={getDateString(formData.availabilityDateTo)} onChange={handleChange}
                        min={getDateString(formData.availabilityDateFrom) || undefined} className={`${inputBaseStyle} ${formErrors.availabilityDateTo ? inputErrorStyle : inputFocusStyle}`} />
                    {formErrors.availabilityDateTo && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.availabilityDateTo}</p>}
                </div>
            </div>
            <div>
                <label htmlFor="availabilityTimeDetails" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">รายละเอียดวัน/เวลาที่สะดวกเพิ่มเติม (ถ้ามี)</label>
                <textarea id="availabilityTimeDetails" name="availabilityTimeDetails" value={formData.availabilityTimeDetails || ''} onChange={handleChange} rows={3}
                    placeholder="เช่น ทุกวัน จ-ศ หลัง 17:00 น., เสาร์-อาทิตย์ทั้งวัน, เฉพาะช่วงปิดเทอม"
                    className={`${inputBaseStyle} ${formErrors.availabilityTimeDetails ? inputErrorStyle : inputFocusStyle}`} />
                {formErrors.availabilityTimeDetails && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.availabilityTimeDetails}</p>}
            </div>
        </div>

         <div className="pt-4 border-t border-neutral-DEFAULT dark:border-dark-border/50 mt-6">
             <h3 className="text-xl font-sans font-semibold text-neutral-dark dark:text-dark-text mb-4">ข้อมูลโปรไฟล์และเกี่ยวกับฉัน</h3>
            {baseProfileFields.map(field => (
            <div key={field.name} className="mb-6 last:mb-0">
                <label htmlFor={field.name} className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
                  {field.label} {field.required && <span className="text-red-500 dark:text-red-400">*</span>}
                </label>
                <input
                  type={field.type}
                  id={field.name}
                  name={field.name}
                  value={(formData[field.name as keyof typeof formData] as string) ?? ''} 
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className={`${inputBaseStyle} ${formErrors[field.name as keyof FormErrorsType] ? inputErrorStyle : inputFocusStyle}`}
                />
                {formErrors[field.name as keyof FormErrorsType] && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors[field.name as keyof FormErrorsType]}</p>}
            </div>
            ))}
            <div>
            <label htmlFor="details" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
                รายละเอียดเกี่ยวกับตัวเอง (ทักษะ, ประสบการณ์) <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <textarea
                id="details"
                name="details"
                value={formData.details}
                onChange={handleChange}
                rows={5}
                placeholder="เช่น สามารถยกของหนักได้, มีประสบการณ์ดูแลเด็ก 2 ปี, ทำอาหารคลีนได้..."
                className={`${inputBaseStyle} ${formErrors.details ? inputErrorStyle : inputFocusStyle}`}
            />
            {formErrors.details && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.details}</p>}
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto flex-grow">
            {isEditing ? '💾 บันทึกการแก้ไข' : 'ส่งโปรไฟล์'}
          </Button>
          <Button type="button" onClick={onCancel} variant="outline" colorScheme="secondary" size="lg" className="w-full sm:w-auto flex-grow">
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
};
