
import React, { useState, useCallback, useEffect } from 'react';
import type { Job, User } from '../types'; // Added User
import { JobDesiredEducationLevelOption, JobCategory, JobSubCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types'; // Added Province
import { Button } from './Button';
import { containsBlacklistedWords, calculateHoursRemaining } from '../App'; // Changed to calculateHoursRemaining

type FormDataType = Omit<Job, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isHired' | 'contact' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired'>;


interface PostJobFormProps {
  onSubmitJob: (jobData: FormDataType & { id?: string }) => void;
  onCancel: () => void;
  initialData?: Job;
  isEditing?: boolean;
  currentUser: User | null; // Added currentUser
  jobs: Job[]; // Added jobs list to check active limits
}

const initialFormStateForCreate: FormDataType = {
  title: '',
  location: '',
  province: Province.ChiangMai, // Default province
  dateTime: '',
  payment: '',
  description: '',
  category: '' as JobCategory,
  subCategory: undefined,
  desiredAgeStart: undefined,
  desiredAgeEnd: undefined,
  preferredGender: undefined,
  desiredEducationLevel: undefined,
  dateNeededFrom: '',
  dateNeededTo: '',
  timeNeededStart: '',
  timeNeededEnd: '',
};

type FormErrorsType = Partial<Record<keyof FormDataType, string>>;


export const PostJobForm: React.FC<PostJobFormProps> = ({ onSubmitJob, onCancel, initialData, isEditing, currentUser, jobs }) => {
  const [formData, setFormData] = useState<FormDataType>(initialFormStateForCreate);
  const [formErrors, setFormErrors] = useState<FormErrorsType>({});
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(true);

  const JOB_COOLDOWN_DAYS_FORM = 3; // Updated to 3 days
  const MAX_ACTIVE_JOBS_FREE_TIER_FORM = 3; // Updated for free tier
  const MAX_ACTIVE_JOBS_BADGE_FORM = 4; // Badge enhancement

  useEffect(() => {
    if (!currentUser) {
      setCanSubmit(false);
      setLimitMessage("กรุณาเข้าสู่ระบบเพื่อโพสต์งาน");
      return;
    }
    if (isEditing) { 
      setCanSubmit(true);
      setLimitMessage(null);
    } else {
      // Cooldown check
      const cooldownHoursTotal = JOB_COOLDOWN_DAYS_FORM * 24;
      const lastJobPostDate = currentUser.postingLimits?.lastJobPostDate;
      if (lastJobPostDate) {
        const hoursSinceLastPost = (new Date().getTime() - new Date(lastJobPostDate as string).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastPost < cooldownHoursTotal) {
          const hoursRemaining = Math.ceil(cooldownHoursTotal - hoursSinceLastPost);
          setLimitMessage(`คุณสามารถโพสต์งานใหม่ได้ในอีก ${hoursRemaining} ชั่วโมง`);
          setCanSubmit(false);
          return;
        }
      }
      // Active limit check
      const userActiveJobs = jobs.filter(job => job.userId === currentUser.id && !job.isExpired && new Date(job.expiresAt as string) > new Date()).length;
      
      let maxJobs = (currentUser.tier === 'free') ? MAX_ACTIVE_JOBS_FREE_TIER_FORM : 999; // Default for free, high for others
      if (currentUser.activityBadge?.isActive) {
          maxJobs = MAX_ACTIVE_JOBS_BADGE_FORM; // Badge overrides
      }

      if (userActiveJobs >= maxJobs) {
        setLimitMessage(`คุณมีงานที่ยังไม่หมดอายุ ${userActiveJobs}/${maxJobs} งานแล้ว`);
        setCanSubmit(false);
        return;
      }
      setLimitMessage(null);
      setCanSubmit(true);
    }
  }, [currentUser, jobs, isEditing]);


  useEffect(() => {
    if (isEditing && initialData) {
      const {
        id, postedAt, userId, authorDisplayName, isSuspicious, isPinned, isHired, contact,
        ownerId, createdAt, updatedAt, expiresAt, isExpired,
        ...editableFieldsBase
      } = initialData;

      const editableFields: FormDataType = {
        title: editableFieldsBase.title || '',
        location: editableFieldsBase.location || '',
        province: editableFieldsBase.province || Province.ChiangMai,
        dateTime: editableFieldsBase.dateTime || '',
        payment: editableFieldsBase.payment || '',
        description: editableFieldsBase.description || '',
        category: editableFieldsBase.category || ('' as JobCategory),
        subCategory: editableFieldsBase.subCategory || undefined,
        desiredAgeStart: editableFieldsBase.desiredAgeStart,
        desiredAgeEnd: editableFieldsBase.desiredAgeEnd,
        preferredGender: editableFieldsBase.preferredGender,
        desiredEducationLevel: editableFieldsBase.desiredEducationLevel,
        dateNeededFrom: editableFieldsBase.dateNeededFrom
                        ? (editableFieldsBase.dateNeededFrom instanceof Date
                            ? editableFieldsBase.dateNeededFrom.toISOString().split('T')[0]
                            : String(editableFieldsBase.dateNeededFrom))
                        : '',
        dateNeededTo: editableFieldsBase.dateNeededTo
                        ? (editableFieldsBase.dateNeededTo instanceof Date
                            ? editableFieldsBase.dateNeededTo.toISOString().split('T')[0]
                            : String(editableFieldsBase.dateNeededTo))
                        : '',
        timeNeededStart: editableFieldsBase.timeNeededStart || '',
        timeNeededEnd: editableFieldsBase.timeNeededEnd || '',
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
    const currentKey = name as keyof FormDataType;
    let newFormData = { ...formData };

    if (currentKey === 'category') {
      const newCategory = value as JobCategory;
      newFormData = { ...newFormData, category: newCategory, subCategory: undefined }; 
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[newCategory] || []);
      if (formErrors.subCategory) {
        setFormErrors(prev => ({ ...prev, subCategory: undefined }));
      }
    } else if (currentKey === 'subCategory') {
        newFormData = { ...newFormData, subCategory: value as JobSubCategory || undefined };
    } else if (currentKey === 'province') {
        newFormData = { ...newFormData, province: value as Province };
    } else if (currentKey === 'desiredAgeStart' || currentKey === 'desiredAgeEnd') {
        let processedValue: number | undefined;
        if (value === '') {
          processedValue = undefined;
        } else {
          const parsedInt = parseInt(value, 10);
          processedValue = isNaN(parsedInt) ? undefined : parsedInt;
        }
        newFormData = { ...newFormData, [currentKey]: processedValue };
    } else if (currentKey === 'desiredEducationLevel') {
        newFormData = { ...newFormData, [currentKey]: value as JobDesiredEducationLevelOption || undefined };
    } else if (currentKey === 'preferredGender') {
         newFormData = { ...newFormData, [currentKey]: value as Job['preferredGender'] || undefined };
    } else {
        newFormData = { ...newFormData, [currentKey]: value };
    }
    setFormData(newFormData);
    if (formErrors[currentKey]) {
      setFormErrors(prev => ({ ...prev, [currentKey]: undefined }));
    }
  };

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as Job['preferredGender'] }));
     if (formErrors[name as keyof FormDataType]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: FormErrorsType = {};
    if (!formData.title.trim()) errors.title = 'กรุณากรอกชื่องาน';
    else if (containsBlacklistedWords(formData.title)) errors.title = 'หัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข';
    if (!formData.location.trim()) errors.location = 'กรุณากรอกสถานที่';
    if (!formData.province) errors.province = 'กรุณาเลือกจังหวัด';
    if (!formData.payment.trim()) errors.payment = 'กรุณากรอกค่าจ้าง';
    if (!formData.category) errors.category = 'กรุณาเลือกหมวดหมู่งาน';
    else if (JOB_SUBCATEGORIES_MAP[formData.category]?.length > 0 && !formData.subCategory) {
        errors.subCategory = 'กรุณาเลือกหมวดหมู่ย่อย';
    }
    if (!formData.description.trim()) errors.description = 'กรุณากรอกรายละเอียดงาน';
    else if (containsBlacklistedWords(formData.description)) errors.description = 'รายละเอียดงานมีคำที่ไม่เหมาะสม โปรดแก้ไข';
    if (formData.desiredAgeStart && formData.desiredAgeEnd && formData.desiredAgeStart > formData.desiredAgeEnd) {
      errors.desiredAgeEnd = 'อายุสิ้นสุดต้องไม่น้อยกว่าอายุเริ่มต้น';
    }
    if (formData.dateNeededFrom && formData.dateNeededTo && formData.dateNeededTo < formData.dateNeededFrom) {
      errors.dateNeededTo = 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น';
    }
    if (formData.timeNeededStart && formData.timeNeededEnd && formData.timeNeededEnd < formData.timeNeededStart) {
      errors.timeNeededEnd = 'เวลาสิ้นสุดต้องไม่น้อยกว่าเวลาเริ่มต้น';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
        alert(limitMessage || "ไม่สามารถโพสต์ได้ในขณะนี้");
        return;
    }
    if (!validateForm()) return;
    const dataToSubmit: FormDataType & { id?: string } = { ...formData };
    if (isEditing && initialData) {
      dataToSubmit.id = initialData.id;
    }
    onSubmitJob(dataToSubmit);
    if (!isEditing) {
        setFormData(initialFormStateForCreate);
        setAvailableSubCategories([]);
    }
  };

  const baseFormFields = [
    { name: 'title', label: 'ชื่องาน', placeholder: 'เช่น พนักงานเสิร์ฟด่วน, ผู้ช่วยทำความสะอาด', required: true },
    { name: 'location', label: 'สถานที่ (เช่น ชื่อร้าน, ถนน, อาคาร)', placeholder: 'เช่น ร้านกาแฟ Cafe Amazon สาขานิมมาน', required: true },
    { name: 'dateTime', label: 'วันที่และเวลา (แบบข้อความ ถ้ามี)', placeholder: 'เช่น 15 ส.ค. 67 (10:00-18:00) หรือ "เสาร์-อาทิตย์นี้"', required: false },
    { name: 'payment', label: 'ค่าจ้าง', placeholder: 'เช่น 400 บาท/วัน, 60 บาท/ชั่วโมง', required: true },
  ] as const;

  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border border-[#CCCCCC] dark:border-dark-border rounded-[10px] text-neutral-dark dark:text-dark-text font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const inputFocusStyle = "focus:border-primary dark:focus:border-dark-primary-DEFAULT focus:ring-2 focus:ring-primary focus:ring-opacity-70 dark:focus:ring-dark-primary-DEFAULT dark:focus:ring-opacity-70";
  const inputErrorStyle = "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  const ageOptions = ['', ...Array.from({ length: (65 - 18) + 1 }, (_, i) => 18 + i)];
  const getDateString = (dateValue: string | Date | undefined): string => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue;
    return dateValue.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white dark:bg-dark-cardBg p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto my-8 border border-neutral-DEFAULT dark:border-dark-border">
      <h2 className="text-3xl font-sans font-semibold text-primary dark:text-dark-primary-DEFAULT mb-2 text-center">
        {isEditing ? '📝 แก้ไขประกาศงาน' : '📝 ลงประกาศงาน'}
      </h2>
      <p className="text-md font-serif text-neutral-dark dark:text-dark-textMuted mb-6 text-center font-normal">
        {isEditing ? 'แก้ไขรายละเอียดประกาศงานของคุณด้านล่าง (ข้อมูลติดต่อจะใช้จากโปรไฟล์ของคุณ)' : 'กรอกรายละเอียดงานที่ต้องการความช่วยเหลือ (ข้อมูลติดต่อจะดึงมาจากโปรไฟล์ของคุณโดยอัตโนมัติ)'}
      </p>

      {limitMessage && !isEditing && (
        <div className="mb-6 p-3 bg-yellow-100 dark:bg-yellow-700/30 border border-yellow-300 dark:border-yellow-500 text-yellow-700 dark:text-yellow-200 rounded-md text-sm font-sans text-center">
          {limitMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {baseFormFields.map(field => (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
              {field.label} {field.required && <span className="text-red-500 dark:text-red-400">*</span>}
            </label>
            <input
              type="text"
              id={field.name}
              name={field.name}
              value={(formData[field.name as keyof typeof formData] as string) ?? ''}
              onChange={handleChange}
              placeholder={field.placeholder}
              className={`${inputBaseStyle} ${formErrors[field.name as keyof FormErrorsType] ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`}
              disabled={!canSubmit && !isEditing}
            />
            {formErrors[field.name as keyof FormErrorsType] && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors[field.name as keyof FormErrorsType]}</p>}
          </div>
        ))}

        <div>
          <label htmlFor="province" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            จังหวัด <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            id="province"
            name="province"
            value={formData.province}
            onChange={handleChange}
            className={`${selectBaseStyle} ${formErrors.province ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`}
            disabled={!canSubmit && !isEditing}
          >
            {Object.values(Province).map(provinceValue => (
              <option key={provinceValue} value={provinceValue}>{provinceValue}</option>
            ))}
          </select>
          {formErrors.province && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.province}</p>}
        </div>


        <div>
          <label htmlFor="category" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            หมวดหมู่งาน <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`${selectBaseStyle} ${formErrors.category ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`}
            disabled={!canSubmit && !isEditing}
          >
            <option value="" disabled>-- เลือกหมวดหมู่ --</option>
            {Object.values(JobCategory).map(categoryValue => (
              <option key={categoryValue} value={categoryValue}>{categoryValue}</option>
            ))}
          </select>
          {formErrors.category && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.category}</p>}
        </div>

        {availableSubCategories.length > 0 && (
          <div>
            <label htmlFor="subCategory" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
              หมวดหมู่ย่อย <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <select
              id="subCategory"
              name="subCategory"
              value={formData.subCategory || ''}
              onChange={handleChange}
              className={`${selectBaseStyle} ${formErrors.subCategory ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`}
              disabled={(!canSubmit && !isEditing) || availableSubCategories.length === 0}
            >
              <option value="" disabled>-- เลือกหมวดหมู่ย่อย --</option>
              {availableSubCategories.map(subCategoryValue => (
                <option key={subCategoryValue} value={subCategoryValue}>{subCategoryValue}</option>
              ))}
            </select>
            {formErrors.subCategory && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.subCategory}</p>}
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="description" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text">
              รายละเอียดงาน <span className="text-red-500 dark:text-red-400">*</span>
            </label>
          </div>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            placeholder="อธิบายลักษณะงาน, คุณสมบัติที่ต้องการ, หรือข้อมูลอื่นๆ ที่สำคัญ..."
            className={`${inputBaseStyle} ${formErrors.description ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`}
            disabled={!canSubmit && !isEditing}
          />
           {formErrors.description && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.description}</p>}
        </div>

        <div className="pt-6 border-t border-neutral-DEFAULT dark:border-dark-border/50">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark dark:text-dark-text mb-4">ข้อมูลผู้ช่วยที่ต้องการ (ถ้ามี)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="dateNeededFrom" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">วันที่ต้องการ: ตั้งแต่</label>
                <input type="date" id="dateNeededFrom" name="dateNeededFrom" value={getDateString(formData.dateNeededFrom)} onChange={handleChange} className={`${inputBaseStyle} ${formErrors.dateNeededFrom ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`} disabled={!canSubmit && !isEditing}/>
                {formErrors.dateNeededFrom && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.dateNeededFrom}</p>}
              </div>
              <div>
                <label htmlFor="dateNeededTo" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">ถึง (ถ้ามี)</label>
                <input type="date" id="dateNeededTo" name="dateNeededTo" value={getDateString(formData.dateNeededTo)} onChange={handleChange} className={`${inputBaseStyle} ${formErrors.dateNeededTo ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`} min={getDateString(formData.dateNeededFrom) || undefined} disabled={!canSubmit && !isEditing}/>
                {formErrors.dateNeededTo && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.dateNeededTo}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="timeNeededStart" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">เวลาที่ต้องการ: เริ่ม</label>
                <input type="time" id="timeNeededStart" name="timeNeededStart" value={formData.timeNeededStart || ''} onChange={handleChange} className={`${inputBaseStyle} ${formErrors.timeNeededStart ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`} disabled={!canSubmit && !isEditing}/>
                {formErrors.timeNeededStart && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.timeNeededStart}</p>}
              </div>
              <div>
                <label htmlFor="timeNeededEnd" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">สิ้นสุด</label>
                <input type="time" id="timeNeededEnd" name="timeNeededEnd" value={formData.timeNeededEnd || ''} onChange={handleChange} className={`${inputBaseStyle} ${formErrors.timeNeededEnd ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`} disabled={!canSubmit && !isEditing}/>
                {formErrors.timeNeededEnd && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.timeNeededEnd}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div>
                    <label htmlFor="desiredAgeStart" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">ช่วงอายุ: ตั้งแต่</label>
                    <select id="desiredAgeStart" name="desiredAgeStart" value={formData.desiredAgeStart === undefined ? '' : String(formData.desiredAgeStart)} onChange={handleChange} className={`${selectBaseStyle} ${formErrors.desiredAgeStart ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`} disabled={!canSubmit && !isEditing}>
                        {ageOptions.map(age => (<option key={`start-${age}`} value={age}>{age === '' ? 'ไม่ระบุ' : `${age} ปี`}</option>))}
                    </select>
                </div>
                <div>
                    <label htmlFor="desiredAgeEnd" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">ถึง</label>
                    <select id="desiredAgeEnd" name="desiredAgeEnd" value={formData.desiredAgeEnd === undefined ? '' : String(formData.desiredAgeEnd)} onChange={handleChange} className={`${selectBaseStyle} ${formErrors.desiredAgeEnd ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`} disabled={!canSubmit && !isEditing}>
                         {ageOptions.map(age => (<option key={`end-${age}`} value={age} disabled={formData.desiredAgeStart !== undefined && age !== '' && typeof age === 'number' ? age < formData.desiredAgeStart : false}>{age === '' ? 'ไม่ระบุ' : `${age} ปี`}</option>))}
                    </select>
                     {formErrors.desiredAgeEnd && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.desiredAgeEnd}</p>}
                </div>
            </div>
            <div className="mb-4">
                <label className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-2">เพศที่ต้องการ</label>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {(['ชาย', 'หญิง', 'ไม่จำกัด'] as const).map(gender => (
                        <label key={gender} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="preferredGender" value={gender} checked={formData.preferredGender === gender} onChange={handleRadioChange} className="form-radio h-4 w-4 text-primary dark:text-dark-primary-DEFAULT border-[#CCCCCC] dark:border-dark-border focus:ring-primary dark:focus:ring-dark-primary-DEFAULT" disabled={!canSubmit && !isEditing}/>
                            <span className="text-neutral-dark font-sans dark:text-dark-text font-normal">{gender}</span>
                        </label>
                    ))}
                </div>
            </div>
            <div>
              <label htmlFor="desiredEducationLevel" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">ระดับการศึกษาที่ต้องการ</label>
              <select id="desiredEducationLevel" name="desiredEducationLevel" value={formData.desiredEducationLevel || ''} onChange={handleChange} className={`${selectBaseStyle} ${formErrors.desiredEducationLevel ? inputErrorStyle : inputFocusStyle} focus:bg-gray-50 dark:focus:bg-[#383838]`} disabled={!canSubmit && !isEditing}>
                <option value="">-- ไม่จำกัด --</option>
                {Object.values(JobDesiredEducationLevelOption).filter(level => level !== JobDesiredEducationLevelOption.Any).map(level => (<option key={level} value={level}>{level}</option>))}
              </select>
              {formErrors.desiredEducationLevel && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1 font-normal">{formErrors.desiredEducationLevel}</p>}
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto flex-grow" disabled={!canSubmit && !isEditing}>
            {isEditing ? '💾 บันทึกการแก้ไข' : (canSubmit ? 'ลงประกาศงาน' : 'ไม่สามารถโพสต์ได้')}
          </Button>
          <Button type="button" onClick={onCancel} variant="outline" colorScheme="primary" size="lg" className="w-full sm:w-auto flex-grow">
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
};
