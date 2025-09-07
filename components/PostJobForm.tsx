import React, { useState, useEffect } from 'react';
import type { Job, User } from '../types/types.ts';
import { View, JobDesiredEducationLevelOption, JobCategory, JobSubCategory, JOB_SUBCATEGORIES_MAP, Province, PaymentType } from '../types/types.ts';
import { Button } from './Button.tsx';
import { containsBlacklistedWords } from '../utils/validation.ts';
import { getJobTemplateForCategory } from '../utils/templates.ts';
import { useJobs, type JobFormData } from '../hooks/useJobs.ts';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { DISTRICTS } from '../utils/provinceData.ts';

interface PostJobFormProps {
  onCancel: () => void;
  isEditing?: boolean;
}

const initialFormStateForCreate: JobFormData = {
  title: '',
  location: '',
  province: Province.ChiangMai,
  district: '',
  dateTime: '',
  payment: '',
  description: '',
  category: '' as JobCategory,
  subCategory: undefined,
  paymentType: PaymentType.Daily,
  paymentAmount: undefined,
  paymentAmountMax: undefined,
  desiredAgeStart: undefined,
  desiredAgeEnd: undefined,
  preferredGender: undefined,
  desiredEducationLevel: undefined,
  dateNeededFrom: '',
  dateNeededTo: '',
  timeNeededStart: '',
  timeNeededEnd: '',
};

type FormErrorsType = Partial<Record<keyof JobFormData, string>>;
const MAX_TITLE_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_LOCATION_LENGTH = 20;

const MONTHLY_PAYMENT_RANGES = [
    { label: '8,000 - 12,000 บาท', value: '8000-12000' },
    { label: '12,000 - 15,000 บาท', value: '12000-15000' },
    { label: '15,000 - 18,000 บาท', value: '15000-18000' },
    { label: '18,000 - 22,000 บาท', value: '18000-22000' },
    { label: '22,000 - 27,000 บาท', value: '22000-27000' },
    { label: '27,000 - 33,000 บาท', value: '27000-33000' },
    { label: '33,000 - 40,000 บาท', value: '33000-40000' },
    { label: '40,000 - 50,000 บาท', value: '40000-50000' },
    { label: '50,000 - 70,000 บาท', value: '50000-70000' },
    { label: '70,000+ บาท', value: '70000-' },
];



const formatPaymentForSubmission = (data: JobFormData): string => {
  if (data.paymentType === PaymentType.Negotiable) {
    return PaymentType.Negotiable;
  }
  
  if (data.paymentType === PaymentType.Monthly && data.paymentAmount === 70000 && !data.paymentAmountMax) {
      return '฿70,000+ /เดือน';
  }
  
  if (!data.paymentAmount) {
      return '';
  }

  const base = `฿${data.paymentAmount.toLocaleString()}`;
  const range = data.paymentAmountMax ? ` - ฿${data.paymentAmountMax.toLocaleString()}` : '';
  const unit = data.paymentType?.replace('ราย', '/');
  return `${base}${range} ${unit}`;
};

const formatDateTimeForSubmission = (data: JobFormData): string => {
    const parts = [];
    if(data.dateNeededFrom) {
        let dateStr = `เริ่ม ${new Date(data.dateNeededFrom).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        if (data.dateNeededTo) {
            dateStr += ` - ${new Date(data.dateNeededTo).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        parts.push(dateStr);
    }
    if (data.timeNeededStart) {
        let timeStr = `ช่วง ${data.timeNeededStart}`;
        if (data.timeNeededEnd) {
            timeStr += ` - ${data.timeNeededEnd}`;
        }
        parts.push(timeStr);
    }
    return parts.join(', ');
};

export const PostJobForm: React.FC<PostJobFormProps> = ({ onCancel, isEditing }) => {
  const { currentUser } = useAuth();
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const { allJobsForAdmin, addJob, updateJob, checkJobPostingLimits } = useJobs();
  const initialData = isEditing ? allJobsForAdmin.find(j => j.id === jobId) || location.state?.item : undefined;

  const [formData, setFormData] = useState<JobFormData>(initialFormStateForCreate);
  const [formErrors, setFormErrors] = useState<FormErrorsType>({});
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>(DISTRICTS[Province.ChiangMai]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [showTemplateButton, setShowTemplateButton] = useState(false);
  const navigate = useNavigate();
  


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
      checkJobPostingLimits().then(({ canPost, message }) => {
        setCanSubmit(canPost);
        setLimitMessage(message || null);
      });
    }
  }, [currentUser, isEditing, checkJobPostingLimits]);

  useEffect(() => {
    if (isEditing && initialData) {
      setShowTemplateButton(false);
      const {
        id, postedAt, userId, authorDisplayName, isSuspicious, isPinned, isHired, contact,
        ownerId, createdAt, updatedAt, expiresAt, isExpired, posterIsAdminVerified, interestedCount,
        payment, dateTime, // Exclude legacy fields from initial form state
        ...editableFieldsBase
      } = initialData;

      const editableFields: JobFormData = {
        title: editableFieldsBase.title || '',
        location: editableFieldsBase.location || '',
        province: editableFieldsBase.province || Province.ChiangMai,
        district: editableFieldsBase.district || '',
        description: editableFieldsBase.description || '',
        category: editableFieldsBase.category || ('' as JobCategory),
        subCategory: editableFieldsBase.subCategory || undefined,
        paymentType: editableFieldsBase.paymentType || PaymentType.Daily,
        paymentAmount: editableFieldsBase.paymentAmount,
        paymentAmountMax: editableFieldsBase.paymentAmountMax,
        desiredAgeStart: editableFieldsBase.desiredAgeStart,
        desiredAgeEnd: editableFieldsBase.desiredAgeEnd,
        preferredGender: editableFieldsBase.preferredGender,
        desiredEducationLevel: editableFieldsBase.desiredEducationLevel,
        dateNeededFrom: editableFieldsBase.dateNeededFrom ? String(editableFieldsBase.dateNeededFrom).split('T')[0] : '',
        dateNeededTo: editableFieldsBase.dateNeededTo ? String(editableFieldsBase.dateNeededTo).split('T')[0] : '',
        timeNeededStart: editableFieldsBase.timeNeededStart || '',
        timeNeededEnd: editableFieldsBase.timeNeededEnd || '',
        dateTime: '',
        payment: '',
      };
      setFormData(editableFields);
      setAvailableDistricts(DISTRICTS[editableFields.province as Province] || []);
      if (editableFields.category && JOB_SUBCATEGORIES_MAP[editableFields.category]) {
        setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[editableFields.category]);
      } else {
        setAvailableSubCategories([]);
      }
    } else {
      setFormData(initialFormStateForCreate);
      setAvailableDistricts(DISTRICTS[initialFormStateForCreate.province]);
      setAvailableSubCategories([]);
    }
  }, [isEditing, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const currentKey = name as keyof JobFormData;
    let newFormData = { ...formData };
    
    if (currentKey === 'category') {
      const newCategory = value as JobCategory;
      newFormData = { ...newFormData, category: newCategory, subCategory: undefined }; 
      setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[newCategory] || []);
      setShowTemplateButton(!!getJobTemplateForCategory(newCategory));
      if (formErrors.subCategory) {
        setFormErrors(prev => ({ ...prev, subCategory: undefined }));
      }
    } else if (currentKey === 'province') {
        const newProvince = value as Province;
        newFormData = { ...newFormData, province: newProvince, district: '' };
        setAvailableDistricts(DISTRICTS[newProvince] || []);
    } else if (currentKey === 'paymentType') {
      newFormData = { ...newFormData, paymentType: value as PaymentType, paymentAmount: undefined, paymentAmountMax: undefined };
    } else if (currentKey === 'paymentAmount' || currentKey === 'paymentAmountMax' || currentKey === 'desiredAgeStart' || currentKey === 'desiredAgeEnd') {
        const numericValue = value === '' ? undefined : parseInt(value, 10);
        newFormData = { ...newFormData, [currentKey]: isNaN(numericValue as number) ? undefined : numericValue };
    } else {
        newFormData = { ...newFormData, [currentKey]: value };
    }
    setFormData(newFormData);
    if (formErrors[currentKey as keyof FormErrorsType]) {
      setFormErrors(prev => ({ ...prev, [currentKey as keyof FormErrorsType]: undefined }));
    }
  };
  
  const handlePaymentRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === '') {
        setFormData(prev => ({...prev, paymentAmount: undefined, paymentAmountMax: undefined}));
        return;
    }
    const [min, max] = value.split('-').map(v => parseInt(v, 10));
    setFormData(prev => ({
        ...prev,
        paymentAmount: min,
        paymentAmountMax: isNaN(max) ? undefined : max
    }));
  };

  const handleUseTemplate = () => {
    const template = getJobTemplateForCategory(formData.category);
    if (template) {
      setFormData(prev => ({...prev, description: template}));
      const textarea = document.getElementById('description');
      if (textarea) {
        textarea.focus();
        (textarea as HTMLTextAreaElement).setSelectionRange(template.length, template.length);
      }
    }
    setShowTemplateButton(false);
  }

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value as Job['preferredGender'] }));
     if (formErrors[name as keyof JobFormData]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: FormErrorsType = {};
    if (!formData.title.trim()) errors.title = 'กรุณากรอกชื่องาน';
    else if (containsBlacklistedWords(formData.title)) errors.title = 'หัวข้อมีคำที่ไม่เหมาะสม โปรดแก้ไข';
    else if (formData.title.length > MAX_TITLE_LENGTH) errors.title = `ชื่องานต้องไม่เกิน ${MAX_TITLE_LENGTH} ตัวอักษร`;

    if (!formData.province) errors.province = 'กรุณาเลือกจังหวัด';
    
    if ((formData.province === Province.ChiangMai || formData.province === Province.Bangkok) && !formData.district) {
      errors.district = 'กรุณาเลือกอำเภอ/เขต';
    }

    if (formData.location && formData.location.length > MAX_LOCATION_LENGTH) {
        errors.location = `ชื่อสถานที่ต้องไม่เกิน ${MAX_LOCATION_LENGTH} ตัวอักษร`;
    }

    if (!formData.paymentType) errors.paymentType = 'กรุณาเลือกประเภทค่าจ้าง';
    else if (formData.paymentType !== PaymentType.Negotiable && !formData.paymentAmount) errors.paymentAmount = 'กรุณากรอกจำนวนเงินหรือเลือกช่วง';
    else if (formData.paymentAmount && formData.paymentAmountMax && formData.paymentAmount > formData.paymentAmountMax) errors.paymentAmountMax = 'จำนวนเงินสูงสุดต้องไม่น้อยกว่าจำนวนเงินเริ่มต้น';
    if (!formData.category) errors.category = 'กรุณาเลือกหมวดหมู่งาน';
    else if (JOB_SUBCATEGORIES_MAP[formData.category]?.length > 0 && !formData.subCategory) {
        errors.subCategory = 'กรุณาเลือกหมวดหมู่ย่อย';
    }
    if (!formData.description.trim()) errors.description = 'กรุณากรอกรายละเอียดงาน';
    else if (containsBlacklistedWords(formData.description)) errors.description = 'รายละเอียดงานมีคำที่ไม่เหมาะสม โปรดแก้ไข';
    else if (formData.description.length > MAX_DESCRIPTION_LENGTH) errors.description = `รายละเอียดงานต้องไม่เกิน ${MAX_DESCRIPTION_LENGTH} ตัวอักษร`;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
        alert(limitMessage || "ไม่สามารถโพสต์ได้ในขณะนี้");
        return;
    }
    if (!validateForm()) return;

    const dataForService = {
        ...formData,
        payment: formatPaymentForSubmission(formData),
        dateTime: formatDateTimeForSubmission(formData),
    };

    try {
        if (isEditing && initialData) {
            await updateJob(initialData.id, dataForService);
            alert('แก้ไขประกาศรับสมัครเรียบร้อยแล้ว');
        } else {
            await addJob(dataForService);
            alert('ประกาศรับสมัครของคุณถูกเพิ่มแล้ว!');
        }

        const { from, originatingTab } = location.state || {};
        let returnPath = '/find-jobs';
        if (from === 'MY_ROOM' && originatingTab) {
            returnPath = `/my-room/${originatingTab}`;
        } else if (from === 'ADMIN_DASHBOARD' || from === '/admin') {
            returnPath = '/admin';
        }
        
        navigate(returnPath);
        
    } catch (error: any) {
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  // Using standardized form classes from design system
  const ageOptions = ['', ...Array.from({ length: (65 - 18) + 1 }, (_, i) => 18 + i)];
  
  const getCurrentPaymentRangeValue = () => {
    if (formData.paymentType !== PaymentType.Monthly || formData.paymentAmount === undefined) return '';
    if (formData.paymentAmount === 70000 && formData.paymentAmountMax === undefined) return '70000-';
    if (formData.paymentAmountMax === undefined) return ''; // Custom value, not a range
    return `${formData.paymentAmount}-${formData.paymentAmountMax}`;
  };

  const titleCharCount = formData.title.length;
  const descriptionCharCount = formData.description.length;
  const locationCharCount = formData.location?.length || 0;

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto my-8 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-primary mb-2 text-center">
        {isEditing ? '📝 แก้ไขประกาศรับสมัคร' : '📝 ลงประกาศรับสมัคร'}
      </h2>
      <p className="text-md font-sans text-neutral-dark mb-6 text-center font-normal">
        กรอกรายละเอียดให้ชัดเจนเพื่อเจอคนที่เหมาะสม (ข้อมูลติดต่อดึงจากโปรไฟล์)
      </p>

      {limitMessage && !isEditing && (
        <div className="mb-6 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm font-sans text-center">
          {limitMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="title" className="form-label required">
              ชื่องาน
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="เช่น พนักงานเสิร์ฟด่วน, ผู้ช่วยทำความสะอาด"
              className={`form-input ${formErrors['title'] ? 'error' : ''}`}
              disabled={!canSubmit && !isEditing}
              maxLength={MAX_TITLE_LENGTH}
            />
              <div className={`text-right text-xs mt-1 ${titleCharCount > MAX_TITLE_LENGTH ? 'text-red-500' : 'text-neutral-medium'}`}>
                {titleCharCount} / {MAX_TITLE_LENGTH}
              </div>
            {formErrors['title'] && <p className="form-error">{formErrors['title']}</p>}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
                <label htmlFor="province" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                    จังหวัด <span className="text-red-500">*</span>
                </label>
                <select id="province" name="province" value={formData.province} onChange={handleChange} className={`form-input form-select ${formErrors.province ? 'error' : ''}`} disabled={!canSubmit && !isEditing}>
                    {Object.values(Province).map(provinceValue => (<option key={provinceValue} value={provinceValue}>{provinceValue}</option>))}
                </select>
                {formErrors.province && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.province}</p>}
            </div>
             {(formData.province === Province.ChiangMai || formData.province === Province.Bangkok) && (
                 <div>
                    <label htmlFor="district" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
                        อำเภอ/เขต <span className="text-red-500">*</span>
                    </label>
                    <select id="district" name="district" value={formData.district || ''} onChange={handleChange} className={`form-input form-select ${formErrors.district ? 'error' : ''}`} disabled={(!canSubmit && !isEditing) || availableDistricts.length === 0}>
                        <option value="" disabled>-- เลือกอำเภอ/เขต --</option>
                        {availableDistricts.map(district => (<option key={district} value={district}>{district}</option>))}
                    </select>
                    {formErrors.district && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.district}</p>}
                </div>
             )}
        </div>
        
        <div>
            <div className="flex justify-between items-center mb-1">
                <label htmlFor="location" className="block text-sm font-sans font-medium text-neutral-dark">
                  ชื่อสถานที่
                </label>
                <span className={`text-xs font-sans ${locationCharCount > MAX_LOCATION_LENGTH ? 'text-red-500' : 'text-neutral-medium'}`}>
                    {locationCharCount} / {MAX_LOCATION_LENGTH}
                </span>
            </div>
            <input 
                type="text" 
                id="location" 
                name="location" 
                value={formData.location ?? ''} 
                onChange={handleChange} 
                placeholder="เช่น ร้านกาแฟ Blue Cat House" 
                className={`form-input ${formErrors.location ? 'error' : ''}`} 
                disabled={!canSubmit && !isEditing}
                maxLength={MAX_LOCATION_LENGTH} 
            />
            <p className="text-xs font-sans text-neutral-medium mt-1">
              (ถ้ามี) ระบุชื่อร้าน, อาคาร, หรือจุดสังเกตเพิ่มเติม
            </p>
            {formErrors.location && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.location}</p>}
        </div>

        <div className="pt-4 border-t border-neutral-DEFAULT">
          <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-4">ค่าจ้าง</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
                <label htmlFor="paymentType" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ประเภท <span className="text-red-500">*</span></label>
                <select id="paymentType" name="paymentType" value={formData.paymentType} onChange={handleChange} className={`form-input form-select ${formErrors.paymentType ? 'error' : ''}`} disabled={!canSubmit && !isEditing}>
                  {Object.values(PaymentType).map(pt => <option key={pt} value={pt}>{pt}</option>)}
                </select>
             </div>
             {formData.paymentType === PaymentType.Monthly ? (
                <div>
                    <label htmlFor="paymentRange" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ช่วงเงินเดือน <span className="text-red-500">*</span></label>
                    <select id="paymentRange" name="paymentRange" value={getCurrentPaymentRangeValue()} onChange={handlePaymentRangeChange} className={`form-input form-select ${formErrors.paymentAmount ? 'error' : ''}`} disabled={(!canSubmit && !isEditing)}>
                        <option value="" disabled>-- เลือกช่วงเงินเดือน --</option>
                        {MONTHLY_PAYMENT_RANGES.map(range => <option key={range.value} value={range.value}>{range.label}</option>)}
                    </select>
                </div>
             ) : formData.paymentType !== PaymentType.Negotiable ? (
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="paymentAmount" className="block text-sm font-sans font-medium text-neutral-dark mb-1">จำนวน <span className="text-red-500">*</span></label>
                      <input type="number" id="paymentAmount" name="paymentAmount" value={formData.paymentAmount || ''} onChange={handleChange} placeholder="เช่น 500" className={`form-input ${formErrors.paymentAmount ? 'error' : ''}`} disabled={(!canSubmit && !isEditing)} />
                    </div>
                    <div>
                      <label htmlFor="paymentAmountMax" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ถึง (ถ้ามี)</label>
                      <input type="number" id="paymentAmountMax" name="paymentAmountMax" value={formData.paymentAmountMax || ''} onChange={handleChange} placeholder="เช่น 600" className={`form-input ${formErrors.paymentAmountMax ? 'error' : ''}`} disabled={(!canSubmit && !isEditing)} />
                    </div>
                 </div>
             ) : null}
           </div>
           {formErrors.paymentAmount && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.paymentAmount}</p>}
           {formErrors.paymentAmountMax && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.paymentAmountMax}</p>}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            หมวดหมู่งาน <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`form-input form-select ${formErrors.category ? 'error' : ''}`}
            disabled={!canSubmit && !isEditing}
          >
            <option value="" disabled>-- เลือกหมวดหมู่ --</option>
            {Object.values(JobCategory).map(categoryValue => (
              <option key={categoryValue} value={categoryValue}>{categoryValue}</option>
            ))}
          </select>
          {formErrors.category && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.category}</p>}
        </div>

        {availableSubCategories.length > 0 && (
          <div>
            <label htmlFor="subCategory" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
              หมวดหมู่ย่อย <span className="text-red-500">*</span>
            </label>
            <select
              id="subCategory"
              name="subCategory"
              value={formData.subCategory || ''}
              onChange={handleChange}
              className={`form-input form-select ${formErrors.subCategory ? 'error' : ''}`}
              disabled={(!canSubmit && !isEditing) || availableSubCategories.length === 0}
            >
              <option value="" disabled>-- เลือกหมวดหมู่ย่อย --</option>
              {availableSubCategories.map(subCategoryValue => (
                <option key={subCategoryValue} value={subCategoryValue}>{subCategoryValue}</option>
              ))}
            </select>
            {formErrors.subCategory && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.subCategory}</p>}
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="description" className="block text-sm font-sans font-medium text-neutral-dark">
              รายละเอียดงาน <span className="text-red-500">*</span>
            </label>
            {showTemplateButton && (
                <Button type="button" onClick={handleUseTemplate} variant="outline" colorScheme="primary" size="sm" className="!py-1 !px-2 !text-xs">
                    📝 ใช้เทมเพลต
                </Button>
            )}
          </div>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            placeholder="อธิบายลักษณะงาน, คุณสมบัติที่ต้องการ, หรือข้อมูลอื่นๆ ที่สำคัญ..."
            className={`form-input form-textarea ${formErrors.description ? 'error' : ''}`}
            disabled={!canSubmit && !isEditing}
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          <div className={`text-right text-xs mt-1 ${descriptionCharCount > MAX_DESCRIPTION_LENGTH ? 'text-red-500' : 'text-neutral-medium'}`}>
            {descriptionCharCount} / {MAX_DESCRIPTION_LENGTH}
          </div>
           {formErrors.description && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.description}</p>}
        </div>

        <div className="pt-6 border-t border-neutral-DEFAULT">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-4">วันและเวลาที่ต้องการ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="dateNeededFrom" className="block text-sm font-sans font-medium text-neutral-dark mb-1">วันที่: ตั้งแต่</label>
                <input 
                    type="date" 
                    id="dateNeededFrom" 
                    name="dateNeededFrom" 
                    value={formData.dateNeededFrom} 
                    onChange={handleChange}
                    min={new Date().toISOString().split("T")[0]}
                    className={`form-input ${formErrors.dateNeededFrom ? 'error' : ''}`} 
                    disabled={!canSubmit && !isEditing}
                />
                {formErrors.dateNeededFrom && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.dateNeededFrom}</p>}
              </div>
              <div>
                <label htmlFor="dateNeededTo" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ถึง (ถ้ามี)</label>
                <input 
                    type="date" 
                    id="dateNeededTo" 
                    name="dateNeededTo" 
                    value={formData.dateNeededTo} 
                    onChange={handleChange}
                    min={formData.dateNeededFrom || new Date().toISOString().split("T")[0]}
                    className={`form-input ${formErrors.dateNeededTo ? 'error' : ''}`} 
                    disabled={!canSubmit && !isEditing}
                />
                {formErrors.dateNeededTo && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.dateNeededTo}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
              <div>
                <label htmlFor="timeNeededStart" className="block text-sm font-sans font-medium text-neutral-dark mb-1">เวลา: เริ่ม</label>
                <input type="time" id="timeNeededStart" name="timeNeededStart" value={formData.timeNeededStart || ''} onChange={handleChange} className={`form-input ${formErrors.timeNeededStart ? 'error' : ''}`} disabled={!canSubmit && !isEditing}/>
                {formErrors.timeNeededStart && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.timeNeededStart}</p>}
              </div>
              <div>
                <label htmlFor="timeNeededEnd" className="block text-sm font-sans font-medium text-neutral-dark mb-1">สิ้นสุด</label>
                <input type="time" id="timeNeededEnd" name="timeNeededEnd" value={formData.timeNeededEnd || ''} onChange={handleChange} className={`form-input ${formErrors.timeNeededEnd ? 'error' : ''}`} disabled={!canSubmit && !isEditing}/>
                {formErrors.timeNeededEnd && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.timeNeededEnd}</p>}
              </div>
            </div>
        </div>

        <div className="pt-6 border-t border-neutral-DEFAULT">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-4">คุณสมบัติผู้ช่วยที่ต้องการ (ถ้ามี)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                <div>
                    <label htmlFor="desiredAgeStart" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ช่วงอายุ: ตั้งแต่</label>
                    <select id="desiredAgeStart" name="desiredAgeStart" value={formData.desiredAgeStart === undefined ? '' : String(formData.desiredAgeStart)} onChange={handleChange} className={`form-input form-select ${formErrors.desiredAgeStart ? 'error' : ''}`} disabled={!canSubmit && !isEditing}>
                        {ageOptions.map(age => (<option key={`start-${age}`} value={age}>{age === '' ? 'ไม่ระบุ' : `${age} ปี`}</option>))}
                    </select>
                </div>
                <div>
                    <label htmlFor="desiredAgeEnd" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ถึง</label>
                    <select id="desiredAgeEnd" name="desiredAgeEnd" value={formData.desiredAgeEnd === undefined ? '' : String(formData.desiredAgeEnd)} onChange={handleChange} className={`form-input form-select ${formErrors.desiredAgeEnd ? 'error' : ''}`} disabled={!canSubmit && !isEditing}>
                         {ageOptions.map(age => (<option key={`end-${age}`} value={age} disabled={formData.desiredAgeStart !== undefined && age !== '' && typeof age === 'number' ? age < formData.desiredAgeStart : false}>{age === '' ? 'ไม่ระบุ' : `${age} ปี`}</option>))}
                    </select>
                     {formErrors.desiredAgeEnd && <p className="text-red-500 font-sans text-xs mt-1 font-normal">{formErrors.desiredAgeEnd}</p>}
                </div>
            </div>

             <div>
                <label className="block text-sm font-sans font-medium text-neutral-dark mb-1">เพศที่ต้องการ</label>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {(['ชาย', 'หญิง', 'ไม่จำกัด'] as const).map(optionValue => (
                        <label key={optionValue} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="preferredGender" value={optionValue} checked={formData.preferredGender === optionValue} onChange={handleRadioChange} className="form-radio h-4 w-4 text-primary border-primary-light focus:ring-1 focus:ring-offset-1 focus:ring-offset-white focus:ring-primary focus:ring-opacity-70" disabled={!canSubmit && !isEditing}/>
                            <span className="text-neutral-dark font-sans font-normal text-sm">{optionValue}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="mt-6">
                <label htmlFor="desiredEducationLevel" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ระดับการศึกษาขั้นต่ำ</label>
                <select id="desiredEducationLevel" name="desiredEducationLevel" value={formData.desiredEducationLevel || ''} onChange={handleChange} className="" disabled={!canSubmit && !isEditing}>
                    <option value="" disabled>-- เลือกระดับการศึกษา --</option>
                    {Object.values(JobDesiredEducationLevelOption).map(level => (<option key={level} value={level}>{level}</option>))}
                </select>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto flex-grow" disabled={!canSubmit && !isEditing}>
            {isEditing ? '💾 บันทึกการแก้ไข' : (canSubmit ? '🚀 ลงประกาศรับสมัคร' : 'ไม่สามารถลงประกาศ')}
          </Button>
          <Button type="button" onClick={onCancel} variant="outline" colorScheme="primary" size="lg" className="w-full sm:w-auto flex-grow">
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
  );
};