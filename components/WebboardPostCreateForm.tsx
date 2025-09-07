import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { WebboardPost, User } from '../types/types'; 
import { WebboardCategory } from '../types/types'; 
import { Button } from './Button.tsx'; 
import { Modal } from './Modal.tsx'; 
import { containsBlacklistedWords } from '../utils/validation.ts';
import { getJobTemplateForCategory } from '../utils/templates.ts'; 

interface WebboardPostCreateFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => void;
  editingPost?: WebboardPost | null; 
  currentUser: User | null; 
  // Utility function to check limits, passed from App.tsx
  checkWebboardPostLimits: (user: User) => { canPost: boolean; message?: string | null }; 
}

type FormDataType = {
  title: string;
  body: string;
  category: WebboardCategory | ''; 
  image?: string; 
  imagePreviewUrl?: string; 
};

type FormErrorsType = Partial<Record<keyof Omit<FormDataType, 'imagePreviewUrl'>, string>>;

const MAX_POST_CHARS = 5000; // Increased to 5000

const WebboardRules: React.FC = () => {
  return (
    <motion.div 
      className="my-6 p-3 sm:p-4 bg-amber-50 border border-amber-300 rounded-lg shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" as const }}
    >
      <h4 className="text-md sm:text-lg font-sans font-semibold text-amber-700 mb-2 text-center">
        📝 กฎพื้นฐานของกระดานพูดคุย
      </h4>
      <p className="text-xs font-serif text-neutral-700 mb-2 text-center">
        เพื่อให้พื้นที่นี้เป็นมิตร และปลอดภัยสำหรับทุกคน โปรดช่วยกันรักษากฎเหล่านี้:
      </p>
      <ul className="space-y-1 text-xs font-serif text-neutral-dark list-none pl-0 sm:pl-1">
        <li className="flex items-start"><span className="mr-1.5">1.</span>❌ ห้ามโพสต์ซื้อขายสินค้า/บริการทุกชนิด</li>
        <li className="flex items-start"><span className="mr-1.5">2.</span>🚫 ห้ามโพสต์เนื้อหา 18+ หรือเนื้อหาที่ไม่เหมาะสม</li>
        <li className="flex items-start"><span className="mr-1.5">3.</span>👑 ห้ามวิจารณ์หรือพูดถึงสถาบันพระมหากษัตริย์</li>
        <li className="flex items-start"><span className="mr-1.5">4.</span>🗳️ งดการพูดคุยประเด็นการเมืองหรือสร้างความขัดแย้ง</li>
        <li className="flex items-start"><span className="mr-1.5">5.</span>🤝 เคารพกันและกัน — ไม่ใช้คำหยาบ ไม่บูลลี่ ไม่เหยียดหยาม</li>
      </ul>
      <p className="mt-3 text-xs font-sans text-red-600 text-center font-medium">
        โพสต์ที่ละเมิดกฎจะถูกลบ อาจถูกระงับการใช้งานโดยไม่แจ้งล่วงหน้า หรือดำเนินคดีตามกฏหมาย
      </p>
    </motion.div>
  );
};

export const WebboardPostCreateForm: React.FC<WebboardPostCreateFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingPost,
  currentUser,
  checkWebboardPostLimits, 
}) => {
  const [formData, setFormData] = useState<FormDataType>({ title: '', body: '', category: '', image: undefined, imagePreviewUrl: undefined });
  const [errors, setErrors] = useState<FormErrorsType>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [canSubmitForm, setCanSubmitForm] = useState(true);

  useEffect(() => {
    if (isOpen) {
        setErrors({});
        if (editingPost) {
            setFormData({
                title: editingPost.title,
                body: editingPost.body,
                category: editingPost.category,
                image: editingPost.image, 
                imagePreviewUrl: editingPost.image, 
            });
            setLimitMessage(null); // No limit checks for editing
            setCanSubmitForm(true);
        } else {
            setFormData({ title: '', body: '', category: '', image: undefined, imagePreviewUrl: undefined });
            if (currentUser) {
                const limits = checkWebboardPostLimits(currentUser); 
                setLimitMessage(limits.message); // Directly use message from check; will be null if unlimited & no message
                setCanSubmitForm(limits.canPost); 
            } else {
                setLimitMessage("กรุณาเข้าสู่ระบบเพื่อสร้างกระทู้");
                setCanSubmitForm(false);
            }
        }
    }
  }, [isOpen, editingPost, currentUser, checkWebboardPostLimits]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrorsType]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (name === 'body' && value.length > MAX_POST_CHARS) {
        setErrors(prev => ({ ...prev, body: `เนื้อหาต้องไม่เกิน ${MAX_POST_CHARS} ตัวอักษร` }));
    } else if (name === 'body' && errors.body && errors.body.includes('ตัวอักษร')) {
        setErrors(prev => ({ ...prev, body: undefined }));
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
    else if (formData.body.length > MAX_POST_CHARS) newErrors.body = `เนื้อหาต้องไม่เกิน ${MAX_POST_CHARS} ตัวอักษร (${formData.body.length}/${MAX_POST_CHARS})`;
    
    if (!formData.category) newErrors.category = 'กรุณาเลือกหมวดหมู่ของโพสต์';
    
    // Preserve existing image size error if it exists
    if (errors.image && errors.image.startsWith('ขนาดรูปภาพต้องไม่เกิน')) { 
        newErrors.image = errors.image;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitForm && !editingPost) { 
        alert(limitMessage || "ไม่สามารถโพสต์ได้ในขณะนี้");
        return;
    }
    if (!validateForm()) return;
    const { imagePreviewUrl, category, ...dataToSubmitRest } = formData; 
    if (category === '') { 
        setErrors(prev => ({ ...prev, category: 'กรุณาเลือกหมวดหมู่ของโพสต์' }));
        return;
    }
    const finalDataToSubmit = { ...dataToSubmitRest, category: category as WebboardCategory, image: formData.image };
    onSubmit(finalDataToSubmit, editingPost?.id);
  };
  
  const inputErrorStyle = "input-error"; // This class is defined in global CSS

  const charsLeft = MAX_POST_CHARS - formData.body.length;
  const charCountColor = charsLeft < 0 ? 'text-red-500' : charsLeft < MAX_POST_CHARS * 0.1 ? 'text-amber-600' : 'text-neutral-medium';


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingPost ? '📝 แก้ไขกระทู้' : '💬 สร้างกระทู้ใหม่'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editingPost && limitMessage && (
          <div className={`mb-4 p-3 text-center text-sm font-sans rounded-md 
            ${canSubmitForm ? 'bg-sky-100 text-sky-700 border border-sky-300' 
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-300'}`}>
            {limitMessage}
          </div>
        )}
        <div>
          <label htmlFor="postTitle" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            หัวข้อกระทู้ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="postTitle"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`w-full p-3 border border-gray-300 rounded-xl bg-white font-sans text-primary-dark transition-all duration-150 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/30 ${errors.title ? inputErrorStyle : ''}`}
            placeholder="เช่น มีใครเคยลอง... / ขอคำแนะนำเรื่อง..."
            disabled={!canSubmitForm && !editingPost}
          />
          {errors.title && <p className="text-red-500 font-sans text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
            <div className="flex justify-between items-center mb-1">
                <label htmlFor="postBody" className="block text-sm font-sans font-medium text-neutral-dark">
                    เนื้อหากระทู้ <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs font-sans ${charCountColor}`}>
                    {formData.body.length}/{MAX_POST_CHARS}
                </span>
            </div>
          <textarea
            id="postBody"
            name="body"
            value={formData.body}
            onChange={handleChange}
            rows={6}
            className={`w-full p-3 border border-gray-300 rounded-xl bg-white font-sans text-primary-dark transition-all duration-150 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/30 resize-none ${errors.body ? inputErrorStyle : ''}`}
            placeholder="เล่าเรื่องราว ถามคำถาม หรือแบ่งปันประสบการณ์ของคุณที่นี่..."
            disabled={!canSubmitForm && !editingPost}
            maxLength={MAX_POST_CHARS + 100} // Allow slight overtyping for UX, validate on submit
          />
          {errors.body && <p className="text-red-500 font-sans text-xs mt-1">{errors.body}</p>}
        </div>

        <div>
          <label htmlFor="postCategory" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            หมวดหมู่ <span className="text-red-500">*</span>
          </label>
          <select
            id="postCategory"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full p-3 border border-gray-300 rounded-xl bg-white font-sans text-primary-dark transition-all duration-150 focus:outline-none focus:border-primary focus:ring-3 focus:ring-primary/30 ${errors.category ? inputErrorStyle : ''}`}
            disabled={!canSubmitForm && !editingPost}
          >
            <option value="" disabled>-- กรุณาเลือกหมวดหมู่ --</option>
            {Object.values(WebboardCategory).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <p className="text-red-500 font-sans text-xs mt-1">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="postImage" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            แนบรูปภาพ (ถ้ามี - ไม่เกิน 2MB)
          </label>
          <input
            type="file"
            id="postImage"
            name="image"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className={`w-full text-sm font-sans text-neutral-dark 
                        file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-neutral-DEFAULT/70 
                        file:bg-neutral-light/30 file:text-sm file:font-semibold file:text-neutral-medium
                        hover:file:bg-neutral-light/70 hover:file:border-neutral-DEFAULT
                        ${errors.image ? inputErrorStyle : ''}`} 
             disabled={!canSubmitForm && !editingPost}
          />
          {errors.image && <p className="text-red-500 font-sans text-xs mt-1">{errors.image}</p>}
          {formData.imagePreviewUrl && (
            <div className="mt-3 relative">
              <img src={formData.imagePreviewUrl} alt="Preview" className="max-h-48 w-auto rounded-md shadow" />
              <Button 
                type="button" 
                onClick={handleRemoveImage} 
                variant="outline"
                colorScheme="accent"
                size="sm"
                className="!p-0 !min-w-0 !w-6 !h-6 flex items-center justify-center !rounded-full !text-xs absolute top-1 right-1 shadow-md"
                aria-label="ลบรูปภาพ"
                disabled={!canSubmitForm && !editingPost}
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
          <Button type="submit" variant="secondary" size="md" disabled={!canSubmitForm && !editingPost}>
            {editingPost ? '💾 บันทึกการแก้ไข' : (canSubmitForm ? '🚀 โพสต์กระทู้' : 'ไม่สามารถโพสต์')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};