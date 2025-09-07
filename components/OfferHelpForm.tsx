import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import type { HelperProfile } from '../types/types.ts';
import { JobCategory, JobSubCategory, JOB_SUBCATEGORIES_MAP, Province } from '../types/types.ts';
import { Button } from './Button.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useHelpers } from '../hooks/useHelpers.ts';
import { logFirebaseError } from '../firebase/logging.ts';
import { containsBlacklistedWords } from '../utils/validation.ts';
import { VoiceRecordingModal } from './VoiceRecordingModal.tsx';
import { MiniAudioPlayer } from './MiniAudioPlayer.tsx';
import { ConfirmModal } from './ConfirmModal.tsx';
import { DISTRICTS } from '../utils/provinceData.ts';
import { useFormAccessibility } from '../hooks/useFormAccessibility.ts';

type FormDataType = Omit<HelperProfile, 'id' | 'postedAt' | 'userId' | 'authorDisplayName' | 'isSuspicious' | 'isPinned' | 'isUnavailable' | 'contact' | 'gender' | 'birthdate' | 'educationLevel' | 'adminVerifiedExperience' | 'interestedCount' | 'ownerId' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'isExpired' | 'lastBumpedAt'> & {
  availabilityTimeStart?: string;
  availabilityTimeEnd?: string;
};

interface OfferHelpFormProps {
  isEditing?: boolean;
}

const initialFormStateForCreate: FormDataType = {
  profileTitle: '',
  details: '',
  province: Province.ChiangMai,
  district: '',
  category: '' as JobCategory,
  subCategory: undefined,
  availability: '',
  availabilityDateFrom: '',
  availabilityDateTo: '',
  availabilityTimeDetails: '',
  availabilityTimeStart: '',
  availabilityTimeEnd: '',
  serviceVoiceIntroUrl: null,
};

type FormErrorsType = Partial<Record<keyof FormDataType, string>>;

const MAX_TITLE_LENGTH = 50;
const MAX_DETAILS_LENGTH = 1000;





export const OfferHelpForm: React.FC<OfferHelpFormProps> = ({ isEditing }) => {
  const { currentUser } = useAuth();
  const { profileId } = useParams<{ profileId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { allHelperProfilesForAdmin, addHelperProfile, updateHelperProfile, checkHelperProfilePostingLimits } = useHelpers();
  const initialData = isEditing ? allHelperProfilesForAdmin.find(p => p.id === profileId) || location.state?.item : undefined;

  const [formData, setFormData] = useState<FormDataType>(initialFormStateForCreate);
  const [formErrors, setFormErrors] = useState<FormErrorsType>({});
  const [availableSubCategories, setAvailableSubCategories] = useState<JobSubCategory[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<string[]>(DISTRICTS[Province.ChiangMai]);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState(true);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null | undefined>(undefined);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  
  const {
    getInputProps,
    getLabelProps,
    getErrorProps,
    ErrorAnnouncement,
    handleValidationErrors
  } = useFormAccessibility();
  
  useEffect(() => {
    if (!currentUser) {
      setCanSubmit(false);
      setLimitMessage("กรุณาเข้าสู่ระบบเพื่อลงประกาศโปรไฟล์");
      return;
    }
    if (isEditing) {
      setCanSubmit(true);
      setLimitMessage(null);
    } else {
      checkHelperProfilePostingLimits().then(({ canPost, message }) => {
        setCanSubmit(canPost);
        setLimitMessage(message || null);
      });
    }
  }, [currentUser, isEditing, checkHelperProfilePostingLimits]);

  useEffect(() => {
    if (isEditing && initialData) {
      const {
        id, postedAt, userId, authorDisplayName, isSuspicious, isPinned, isUnavailable, contact,
        gender, birthdate, educationLevel, adminVerifiedExperience, interestedCount,
        ownerId, createdAt, updatedAt, expiresAt, isExpired, lastBumpedAt,
        ...editableFieldsBase
      } = initialData;

      // Parse existing time details if it's in "start - end" format
      let timeStart = '';
      let timeEnd = '';
      let timeDetails = editableFieldsBase.availabilityTimeDetails || '';
      
      if (timeDetails.includes(' - ')) {
        const timeParts = timeDetails.split(' - ');
        if (timeParts.length === 2) {
          timeStart = timeParts[0].trim();
          timeEnd = timeParts[1].trim();
          timeDetails = ''; // Clear the old format
        }
      }

      const editableFields: FormDataType = {
        profileTitle: editableFieldsBase.profileTitle || '',
        details: editableFieldsBase.details || '',
        province: editableFieldsBase.province || Province.ChiangMai,
        district: editableFieldsBase.district || '',
        category: editableFieldsBase.category || ('' as JobCategory),
        subCategory: editableFieldsBase.subCategory || undefined,
        availability: editableFieldsBase.availability || '',
        availabilityDateFrom: editableFieldsBase.availabilityDateFrom ? String(editableFieldsBase.availabilityDateFrom).split('T')[0] : '',
        availabilityDateTo: editableFieldsBase.availabilityDateTo ? String(editableFieldsBase.availabilityDateTo).split('T')[0] : '',
        availabilityTimeDetails: timeDetails,
        availabilityTimeStart: timeStart,
        availabilityTimeEnd: timeEnd,
        serviceVoiceIntroUrl: editableFieldsBase.serviceVoiceIntroUrl || null,
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
  
  useEffect(() => {
    if (formData.province) {
      setAvailableDistricts(DISTRICTS[formData.province as Province] || []);
    }
  }, [formData.province]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const key = name as keyof FormDataType;
    let newFormData = { ...formData, [key]: value };

    if (key === 'category') {
        const newCategory = value as JobCategory;
        newFormData = { ...newFormData, category: newCategory, subCategory: undefined }; 
        setAvailableSubCategories(JOB_SUBCATEGORIES_MAP[newCategory] || []);
    } else if (key === 'province') {
        const newProvince = value as Province;
        newFormData = { ...newFormData, province: newProvince, district: '' };
        setAvailableDistricts(DISTRICTS[newProvince] || []);
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
    else if (formData.profileTitle.length > MAX_TITLE_LENGTH) errors.profileTitle = `หัวข้อต้องไม่เกิน ${MAX_TITLE_LENGTH} ตัวอักษร`;
    
    if (!formData.details.trim()) errors.details = 'กรุณากรอกรายละเอียดเกี่ยวกับทักษะ/ประสบการณ์';
    else if (containsBlacklistedWords(formData.details)) errors.details = 'รายละเอียดมีคำที่ไม่เหมาะสม โปรดแก้ไข';
    else if (formData.details.length > MAX_DETAILS_LENGTH) errors.details = `รายละเอียดต้องไม่เกิน ${MAX_DETAILS_LENGTH} ตัวอักษร`;

    if (!formData.province) errors.province = 'กรุณาเลือกจังหวัด';
    if ((formData.province === Province.ChiangMai || formData.province === Province.Bangkok) && !formData.district) {
      errors.district = 'กรุณาเลือกอำเภอ/เขต';
    }


    if (!formData.category) errors.category = 'กรุณากรอกหมวดหมู่งานที่ถนัด';
    else if (JOB_SUBCATEGORIES_MAP[formData.category]?.length > 0 && !formData.subCategory) {
        errors.subCategory = 'กรุณาเลือกหมวดหมู่ย่อยที่ถนัด';
    }

    if (formData.availabilityDateFrom && formData.availabilityDateTo && formData.availabilityDateTo < formData.availabilityDateFrom) {
        errors.availabilityDateTo = 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleVoiceSave = (blob: Blob) => {
    setAudioBlob(blob);
    setFormData(prev => ({ ...prev, serviceVoiceIntroUrl: URL.createObjectURL(blob) }));
    setIsVoiceModalOpen(false);
  };
  
  const handleConfirmRemoveAudio = () => {
    setAudioBlob(null);
    setFormData(prev => ({...prev, serviceVoiceIntroUrl: null}));
    setIsConfirmDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
        alert(limitMessage || "ไม่สามารถลงประกาศโปรไฟล์ได้ในขณะนี้");
        return;
    }
    if (!validateForm()) return;
    
    // Prepare form data with combined time details
    const { availabilityTimeStart, availabilityTimeEnd, ...baseFormData } = formData;
    let combinedTimeDetails = formData.availabilityTimeDetails || '';
    
    // If both start and end times are provided, combine them
    if (availabilityTimeStart && availabilityTimeEnd) {
      combinedTimeDetails = `${availabilityTimeStart} - ${availabilityTimeEnd}`;
    } else if (availabilityTimeStart) {
      combinedTimeDetails = `เริ่ม ${availabilityTimeStart}`;
    } else if (availabilityTimeEnd) {
      combinedTimeDetails = `ถึง ${availabilityTimeEnd}`;
    }
    
    const submissionData = {
      ...baseFormData,
      availabilityTimeDetails: combinedTimeDetails,
    };
    
    try {
        if (isEditing && initialData) {
            await updateHelperProfile(initialData.id, submissionData, audioBlob);
            alert('แก้ไขโปรไฟล์เรียบร้อยแล้ว');
        } else {
            await addHelperProfile(submissionData, audioBlob);
            alert('ลงประกาศโปรไฟล์เรียบร้อยแล้ว');
        }
        
        const { from, originatingTab } = location.state || {};
        let returnPath = '/find-helpers'; // Default
        if (from === 'MY_ROOM' && originatingTab) {
            returnPath = `/my-room/${originatingTab}`;
        } else if (from === '/admin' || from === 'ADMIN_DASHBOARD') {
            returnPath = '/admin';
        }
        
        navigate(returnPath);
    } catch (error: any) {
        logFirebaseError("OfferHelpForm.handleSubmit", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };
  
  const handleCancel = () => {
    const { from } = location.state || {};
    if (from) {
      navigate(-1);
    } else {
      navigate('/find-helpers');
    }
  };

  const titleCharCount = formData.profileTitle.length;
  const detailsCharCount = formData.details.length;


  return (
    <>
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto my-8 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-primary mb-2 text-center">
        {isEditing ? '📝 แก้ไขโปรไฟล์' : '🙋 ลงประกาศโปรไฟล์'}
      </h2>
      <p className="text-md font-sans text-neutral-dark mb-6 text-center font-normal">
        {isEditing
          ? 'แก้ไขข้อมูลโปรไฟล์ของคุณ (ข้อมูลส่วนตัว เช่น เพศ, อายุ, การศึกษา และข้อมูลติดต่อ จะใช้จากโปรไฟล์หลักของคุณ)'
          : 'โปรดระบุให้ชัดเจนเพื่อการตัดสินใจที่ง่ายขึ้น (ข้อมูลส่วนตัวจะดึงจากโปรไฟล์)'}
      </p>
      
      {limitMessage && !isEditing && (
        <div className="mb-6 p-3 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-md text-sm font-sans text-center">
          {limitMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorAnnouncement />
          <div className="space-y-2">
            <label {...getLabelProps('profileTitle', true)}>หัวข้อโปรไฟล์/บริการ</label>
            <input 
              type="text" 
              name="profileTitle" 
              value={formData.profileTitle} 
              onChange={handleChange} 
              required 
              maxLength={MAX_TITLE_LENGTH} 
              className={`form-input ${formErrors.profileTitle ? 'error' : ''}`} 
              disabled={!canSubmit && !isEditing}
              {...getInputProps('profileTitle', !!formErrors.profileTitle, formErrors.profileTitle)}
            />
            <div className={`text-right text-xs mt-1 ${titleCharCount > MAX_TITLE_LENGTH ? 'text-red-500' : 'text-neutral-medium'}`}>{titleCharCount} / {MAX_TITLE_LENGTH}</div>
            {formErrors.profileTitle && <p {...getErrorProps('profileTitle')}>{formErrors.profileTitle}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                  <label htmlFor="province" className="form-label required">จังหวัด</label>
                  <select id="province" name="province" value={formData.province} onChange={handleChange} className={`form-input form-select ${formErrors.province ? 'error' : ''}`} disabled={!canSubmit && !isEditing}>
                      {Object.values(Province).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {formErrors.province && <p className="form-error">{formErrors.province}</p>}
              </div>
              {(formData.province === Province.ChiangMai || formData.province === Province.Bangkok) && (
                  <div>
                      <label htmlFor="district" className="form-label required">อำเภอ/เขต</label>
                      <select id="district" name="district" value={formData.district || ''} onChange={handleChange} className={`form-input form-select ${formErrors.district ? 'error' : ''}`} disabled={!canSubmit && !isEditing}>
                          <option value="" disabled>-- เลือกอำเภอ/เขต --</option>
                          {availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {formErrors.district && <p className="form-error">{formErrors.district}</p>}
                  </div>
              )}
          </div>
          


          <div className="space-y-2">
            <label htmlFor="details" className="form-label required">รายละเอียดทักษะ/ประสบการณ์</label>
            <textarea name="details" id="details" value={formData.details} onChange={handleChange} rows={5} required maxLength={MAX_DETAILS_LENGTH} className={`form-input form-textarea ${formErrors.details ? 'error' : ''}`} disabled={!canSubmit && !isEditing}></textarea>
            <div className={`text-right text-xs mt-1 ${detailsCharCount > MAX_DETAILS_LENGTH ? 'text-red-500' : 'text-neutral-medium'}`}>{detailsCharCount} / {MAX_DETAILS_LENGTH}</div>
            {formErrors.details && <p className="form-error">{formErrors.details}</p>}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                  <label htmlFor="category" className="form-label required">หมวดหมู่งานที่ถนัด</label>
                  <select id="category" name="category" value={formData.category} onChange={handleChange} className={`form-input form-select ${formErrors.category ? 'error' : ''}`} disabled={!canSubmit && !isEditing}>
                      <option value="" disabled>-- เลือกหมวดหมู่ --</option>
                      {Object.values(JobCategory).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {formErrors.category && <p className="form-error">{formErrors.category}</p>}
              </div>
              <div>
                  <label htmlFor="subCategory" className="form-label required">หมวดหมู่ย่อย</label>
                  <select id="subCategory" name="subCategory" value={formData.subCategory || ''} onChange={handleChange} className={`form-input form-select ${formErrors.subCategory ? 'error' : ''}`} disabled={!canSubmit && !isEditing || availableSubCategories.length === 0}>
                      <option value="" disabled>-- เลือกหมวดหมู่ย่อย --</option>
                      {availableSubCategories.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {formErrors.subCategory && <p className="form-error">{formErrors.subCategory}</p>}
              </div>
          </div>


          <div className="pt-4 border-t border-neutral-DEFAULT">
              <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-4">ช่วงเวลาที่สะดวกทำงาน</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  <div>
                      <label htmlFor="availabilityDateFrom" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ว่างตั้งแต่วันที่</label>
                      <input 
                          type="date" 
                          id="availabilityDateFrom" 
                          name="availabilityDateFrom" 
                          value={formData.availabilityDateFrom} 
                          onChange={handleChange}
                          min={new Date().toISOString().split("T")[0]}
                          className={`form-input ${formErrors.availabilityDateFrom ? 'error' : ''}`} 
                          disabled={!canSubmit && !isEditing}
                      />
                      {formErrors.availabilityDateFrom && <p className="form-error">{formErrors.availabilityDateFrom}</p>}
                  </div>
                  <div>
                      <label htmlFor="availabilityDateTo" className="block text-sm font-sans font-medium text-neutral-dark mb-1">ถึงวันที่ (ถ้ามี)</label>
                      <input 
                          type="date" 
                          id="availabilityDateTo" 
                          name="availabilityDateTo" 
                          value={formData.availabilityDateTo} 
                          onChange={handleChange}
                          min={formData.availabilityDateFrom || new Date().toISOString().split("T")[0]}
                          className={`form-input ${formErrors.availabilityDateTo ? 'error' : ''}`} 
                          disabled={!canSubmit && !isEditing}
                      />
                      {formErrors.availabilityDateTo && <p className="form-error">{formErrors.availabilityDateTo}</p>}
                  </div>
              </div>
               <div>
                <label className="block text-sm font-sans font-medium text-neutral-dark mb-3">🕐 เวลาที่สะดวก (ถ้ามี)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="availabilityTimeStart" className="block text-xs font-sans font-medium text-neutral-medium mb-1">เริ่ม</label>
                    <input 
                      type="time" 
                      id="availabilityTimeStart" 
                      name="availabilityTimeStart" 
                      value={formData.availabilityTimeStart || ''} 
                      onChange={handleChange}
                      className="form-input" 
                      disabled={!canSubmit && !isEditing}
                    />
                  </div>
                  <div>
                    <label htmlFor="availabilityTimeEnd" className="block text-xs font-sans font-medium text-neutral-medium mb-1">สิ้นสุด</label>
                    <input 
                      type="time" 
                      id="availabilityTimeEnd" 
                      name="availabilityTimeEnd" 
                      value={formData.availabilityTimeEnd || ''} 
                      onChange={handleChange}
                      className="form-input" 
                      disabled={!canSubmit && !isEditing}
                    />
                  </div>
                </div>
                <p className="text-xs text-neutral-medium mt-1">หรือระบุรายละเอียดเพิ่มเติม:</p>
                <textarea 
                  name="availabilityTimeDetails" 
                  id="availabilityTimeDetails" 
                  value={formData.availabilityTimeDetails || ''} 
                  onChange={handleChange} 
                  rows={2} 
                  placeholder="เช่น ทุกวัน จ-ศ หลัง 17:00 น., เสาร์-อาทิตย์ทั้งวัน" 
                  className="form-input form-textarea mt-2" 
                  disabled={!canSubmit && !isEditing}
                />
              </div>
          </div>

          <div className="pt-4 border-t border-neutral-DEFAULT">
              <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-4">เสียงแนะนำสำหรับบริการนี้ (ถ้ามี)</h3>
              <p className="text-sm font-sans text-neutral-medium mb-4">
                  เพิ่มเสียงแนะนำเฉพาะสำหรับบริการนี้ เพื่อให้ลูกค้าได้รู้จักคุณและบริการของคุณมากขึ้น
              </p>
              
              {formData.serviceVoiceIntroUrl ? (
                  <div className="bg-neutral-light/50 p-4 rounded-lg border border-neutral-DEFAULT/50">
                      <div className="flex items-center justify-between mb-3">
                          <h4 className="font-sans font-medium text-neutral-dark">🎙️ เสียงแนะนำของคุณ</h4>
                          <button
                              type="button"
                              onClick={() => setIsConfirmDeleteOpen(true)}
                              className="text-xs font-sans text-red-600 hover:text-red-800 hover:underline"
                              disabled={!canSubmit && !isEditing}
                          >
                              ลบเสียง
                          </button>
                      </div>
                      <div className="flex items-center gap-3">
                          <audio controls className="flex-1" style={{ maxWidth: '300px' }}>
                              <source src={formData.serviceVoiceIntroUrl} type="audio/webm" />
                              <source src={formData.serviceVoiceIntroUrl} type="audio/mp4" />
                              เบราว์เซอร์ของคุณไม่รองรับการเล่นเสียง
                          </audio>
                          <Button
                              type="button"
                              onClick={() => setIsVoiceModalOpen(true)}
                              variant="outline"
                              colorScheme="primary"
                              size="sm"
                              disabled={!canSubmit && !isEditing}
                          >
                              อัดใหม่
                          </Button>
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-6">
                      <Button
                          type="button"
                          onClick={() => setIsVoiceModalOpen(true)}
                          variant="outline"
                          colorScheme="primary"
                          size="lg"
                          disabled={!canSubmit && !isEditing}
                      >
                          🎙️ อัดเสียงแนะนำ
                      </Button>
                  </div>
              )}
          </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto flex-grow" disabled={!canSubmit && !isEditing}>
            {isEditing ? '💾 บันทึกการแก้ไข' : (canSubmit ? '🙋 ลงประกาศโปรไฟล์' : 'ไม่สามารถส่งโปรไฟล์')}
          </Button>
          <Button type="button" onClick={handleCancel} variant="outline" colorScheme="primary" size="lg" className="w-full sm:w-auto flex-grow">
            ยกเลิก
          </Button>
        </div>
      </form>
    </div>
    {currentUser && (
    <VoiceRecordingModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSave={handleVoiceSave}
        title="เสียงแนะนำสำหรับบริการนี้"
    />
    )}
    <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmRemoveAudio}
        title="ยืนยันการลบ"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบเสียงแนะนำสำหรับบริการนี้?"
    />
    </>
  );
};