
import React, { useState, useEffect, useRef } from 'react';
import type { WebboardPost } from '../types';
import { WebboardCategory } from '../types'; // Import WebboardCategory
import { Button } from './Button';
import { Modal } from './Modal';
import { containsBlacklistedWords } from '../App'; // Import blacklist checker

interface WebboardPostCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => void;
  editingPost?: WebboardPost | null; 
}

type FormDataType = {
  title: string;
  body: string;
  category: WebboardCategory | ''; // Allow empty string for initial unselected state
  image?: string; 
  imagePreviewUrl?: string; 
};

type FormErrorsType = Partial<Record<keyof Omit<FormDataType, 'imagePreviewUrl'>, string>>;

const WebboardRules: React.FC = () => {
  return (
    <div className="my-6 p-3 sm:p-4 bg-amber-50 dark:bg-amber-800/20 border border-amber-300 dark:border-amber-600/40 rounded-lg shadow-sm">
      <h4 className="text-md sm:text-lg font-sans font-semibold text-amber-700 dark:text-amber-300 mb-2 text-center">
        📝 กฎพื้นฐานของกระดานพูดคุย
      </h4>
      <p className="text-xs font-serif text-neutral-700 dark:text-dark-textMuted mb-2 text-center">
        เพื่อให้พื้นที่นี้เป็นมิตร และปลอดภัยสำหรับทุกคน โปรดช่วยกันรักษากฎเหล่านี้:
      </p>
      <ul className="space-y-1 text-xs font-serif text-neutral-dark dark:text-dark-textMuted list-none pl-0 sm:pl-1">
        <li className="flex items-start"><span className="mr-1.5">1.</span>❌ ห้ามโพสต์ซื้อขายสินค้า/บริการทุกชนิด</li>
        <li className="flex items-start"><span className="mr-1.5">2.</span>🚫 ห้ามโพสต์เนื้อหา 18+ หรือเนื้อหาที่ไม่เหมาะสม</li>
        <li className="flex items-start"><span className="mr-1.5">3.</span>👑 ห้ามวิจารณ์หรือพูดถึงสถาบันพระมหากษัตริย์</li>
        <li className="flex items-start"><span className="mr-1.5">4.</span>🗳️ งดการพูดคุยประเด็นการเมืองหรือสร้างความขัดแย้ง</li>
        <li className="flex items-start"><span className="mr-1.5">5.</span>🤝 เคารพกันและกัน — ไม่ใช้คำหยาบ ไม่บูลลี่ ไม่เหยียดหยาม</li>
      </ul>
      <p className="mt-3 text-xs font-sans text-red-600 dark:text-red-400 text-center font-medium">
        โพสต์ที่ละเมิดกฎจะถูกลบ อาจถูกระงับการใช้งานโดยไม่แจ้งล่วงหน้า หรือดำเนินคดีตามกฏหมาย
      </p>
    </div>
  );
};

export const WebboardPostCreateForm: React.FC<WebboardPostCreateFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingPost,
}) => {
  const [formData, setFormData] = useState<FormDataType>({ title: '', body: '', category: '', image: undefined, imagePreviewUrl: undefined });
  const [errors, setErrors] = useState<FormErrorsType>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && editingPost) {
      setFormData({
        title: editingPost.title,
        body: editingPost.body,
        category: editingPost.category,
        image: editingPost.image, 
        imagePreviewUrl: editingPost.image, 
      });
      setErrors({});
    } else if (isOpen && !editingPost) {
      setFormData({ title: '', body: '', category: '', image: undefined, imagePreviewUrl: undefined });
      setErrors({});
    }
  }, [isOpen, editingPost]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrorsType]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        setErrors(prev => ({ ...prev, image: 'ขนาดรูปภาพต้องไม่เกิน 2MB' }));
        if (fileInputRef.current) fileInputRef.current.value = ''; 
        setFormData(prev => ({ ...prev, image: undefined, imagePreviewUrl: undefined }));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string, imagePreviewUrl: reader.result as string }));
        setErrors(prev => ({ ...prev, image: undefined }));
      };
      reader.onerror = () => {
        setErrors(prev => ({ ...prev, image: 'ไม่สามารถอ่านไฟล์รูปภาพได้' }));
        setFormData(prev => ({ ...prev, image: undefined, imagePreviewUrl: undefined }));
      };
      reader.readAsDataURL(file);
    } else {
        if (!editingPost || !editingPost.image) { 
            setFormData(prev => ({ ...prev, image: undefined, imagePreviewUrl: undefined }));
        }
    }
  };
  
  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: undefined, imagePreviewUrl: undefined }));
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; 
    }
     setErrors(prev => ({ ...prev, image: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrorsType = {};
    if (!formData.title.trim()) newErrors.title = 'กรุณากรอกหัวข้อกระทู้';
    else if (containsBlacklistedWords(formData.title)) newErrors.title = 'หัวข้อกระทู้มีคำที่ไม่เหมาะสม โปรดแก้ไข';

    if (!formData.body.trim()) newErrors.body = 'กรุณากรอกเนื้อหากระทู้';
    else if (containsBlacklistedWords(formData.body)) newErrors.body = 'เนื้อหากระทู้มีคำที่ไม่เหมาะสม โปรดแก้ไข';
    
    if (!formData.category) newErrors.category = 'กรุณาเลือกหมวดหมู่ของโพสต์';
    
    if (errors.image && errors.image.startsWith('ขนาดรูปภาพต้องไม่เกิน')) { 
        newErrors.image = errors.image;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const { imagePreviewUrl, category, ...dataToSubmitRest } = formData; 
    if (category === '') { // Should be caught by validation, but as a safeguard
        setErrors(prev => ({ ...prev, category: 'กรุณาเลือกหมวดหมู่ของโพสต์' }));
        return;
    }
    const finalDataToSubmit = { ...dataToSubmitRest, category: category as WebboardCategory, image: formData.image };
    onSubmit(finalDataToSubmit, editingPost?.id);
  };
  
  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border border-[#CCCCCC] dark:border-dark-border rounded-[10px] text-neutral-dark dark:text-dark-text font-serif font-normal focus:outline-none";
  const inputFocusStyle = "focus:ring-1 focus:ring-neutral-DEFAULT/50 dark:focus:ring-dark-border/50";
  const inputErrorStyle = "border-red-500 dark:border-red-400 focus:border-red-500 dark:focus:border-red-400 focus:ring-2 focus:ring-red-500 focus:ring-opacity-70 dark:focus:ring-red-400 dark:focus:ring-opacity-70";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingPost ? '📝 แก้ไขกระทู้' : '💬 สร้างกระทู้ใหม่'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="postTitle" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            หัวข้อกระทู้ <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="text"
            id="postTitle"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`${inputBaseStyle} ${errors.title ? inputErrorStyle : inputFocusStyle}`}
            placeholder="เช่น มีใครเคยลอง... / ขอคำแนะนำเรื่อง..."
          />
          {errors.title && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="postBody" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            เนื้อหากระทู้ <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <textarea
            id="postBody"
            name="body"
            value={formData.body}
            onChange={handleChange}
            rows={6}
            className={`${inputBaseStyle} ${errors.body ? inputErrorStyle : inputFocusStyle}`}
            placeholder="เล่าเรื่องราว ถามคำถาม หรือแบ่งปันประสบการณ์ของคุณที่นี่..."
          />
          {errors.body && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1">{errors.body}</p>}
        </div>

        <div>
          <label htmlFor="postCategory" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            หมวดหมู่ <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            id="postCategory"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`${selectBaseStyle} ${errors.category ? inputErrorStyle : inputFocusStyle}`}
          >
            <option value="" disabled>-- กรุณาเลือกหมวดหมู่ --</option>
            {Object.values(WebboardCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="postImage" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
            แนบรูปภาพ (ถ้ามี - ไม่เกิน 2MB)
          </label>
          <input
            type="file"
            id="postImage"
            name="image"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className={`w-full text-sm font-sans text-neutral-dark dark:text-dark-textMuted 
                        file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-neutral-DEFAULT/70 dark:file:border-dark-border/70 
                        file:bg-neutral-light/30 dark:file:bg-dark-inputBg/30 file:text-sm file:font-semibold file:text-neutral-medium dark:file:text-dark-textMuted
                        hover:file:bg-neutral-light/70 dark:hover:file:bg-dark-inputBg/50 hover:file:border-neutral-DEFAULT dark:hover:file:border-dark-border
                        ${errors.image ? inputErrorStyle : inputFocusStyle}`}
          />
          {errors.image && <p className="text-red-500 font-sans dark:text-red-400 text-xs mt-1">{errors.image}</p>}
          {formData.imagePreviewUrl && (
            <div className="mt-3 relative">
              <img src={formData.imagePreviewUrl} alt="Preview" className="max-h-48 w-auto rounded-md shadow" />
              <Button 
                type="button" 
                onClick={handleRemoveImage} 
                className="absolute top-1 right-1 bg-red-500/70 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs p-0 m-0 shadow"
                aria-label="ลบรูปภาพ"
              >
                &times;
              </Button>
            </div>
          )}
        </div>
        
        <WebboardRules />

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" onClick={onClose} variant="outline" colorScheme="neutral" size="md">
            ยกเลิก
          </Button>
          <Button type="submit" variant="login" size="md">
            {editingPost ? '💾 บันทึกการแก้ไข' : '🚀 โพสต์กระทู้'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
