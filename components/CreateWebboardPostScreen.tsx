
import React, { useState, useEffect, useRef } from 'react';
import type { WebboardPost, User } from '../types';
import { WebboardCategory, View } from '../types';
import { Button } from './Button';
import { containsBlacklistedWords } from '../App';

interface CreateWebboardPostScreenProps {
  currentUser: User | null;
  editingPost?: WebboardPost | null;
  onSubmit: (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => void;
  onCancel: () => void;
  checkWebboardPostLimits: (user: User) => { canPost: boolean; message?: string | null };
}

type FormDataType = {
  title: string;
  body: string;
  category: WebboardCategory | '';
  image?: string; // Base64 string for new/updated image
  imagePreviewUrl?: string; // For displaying current or new image
};

type FormErrorsType = Partial<Record<keyof Omit<FormDataType, 'imagePreviewUrl'>, string>>;

const MAX_POST_CHARS = 5000;

const WebboardRulesInfo: React.FC = () => {
  return (
    <div className="my-4 p-3 bg-amber-50 dark:bg-amber-800/20 border border-amber-300 dark:border-amber-600/40 rounded-lg shadow-sm text-xs">
      <h4 className="text-sm font-sans font-semibold text-amber-700 dark:text-amber-300 mb-1 text-center">
        📝 กฎพื้นฐาน
      </h4>
      <ul className="space-y-0.5 text-neutral-dark dark:text-dark-textMuted list-none pl-0">
        <li>1. ❌ ห้ามซื้อขาย</li>
        <li>2. 🚫 ห้ามเนื้อหา 18+</li>
        <li>3. 👑 ห้ามวิจารณ์สถาบัน</li>
        <li>4. 🗳️ งดประเด็นการเมือง</li>
        <li>5. 🤝 เคารพกัน ไม่หยาบคาย</li>
      </ul>
      <p className="mt-1 text-red-600 dark:text-red-400 text-center font-medium">
        ละเมิดกฎอาจถูกลบ/แบน
      </p>
    </div>
  );
};

export const CreateWebboardPostScreen: React.FC<CreateWebboardPostScreenProps> = ({
  currentUser,
  editingPost,
  onSubmit,
  onCancel,
  checkWebboardPostLimits,
}) => {
  const [formData, setFormData] = useState<FormDataType>({ title: '', body: '', category: '', image: undefined, imagePreviewUrl: undefined });
  const [errors, setErrors] = useState<FormErrorsType>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [canSubmitForm, setCanSubmitForm] = useState(true);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPost) {
      setFormData({
        title: editingPost.title,
        body: editingPost.body,
        category: editingPost.category,
        image: editingPost.image, // Store original image URL if editing
        imagePreviewUrl: editingPost.image,
      });
      setLimitMessage(null);
      setCanSubmitForm(true);
    } else {
      setFormData({ title: '', body: '', category: '', image: undefined, imagePreviewUrl: undefined });
      if (currentUser) {
        const limits = checkWebboardPostLimits(currentUser);
        setLimitMessage(limits.message);
        setCanSubmitForm(limits.canPost);
      } else {
        setLimitMessage("กรุณาเข้าสู่ระบบเพื่อสร้างกระทู้");
        setCanSubmitForm(false);
      }
    }
    // Focus title input when component mounts or editingPost changes
    titleInputRef.current?.focus();
  }, [editingPost, currentUser, checkWebboardPostLimits]);

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
        // Don't clear existing image preview if a large file is selected then cancelled
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        // For submission, 'image' will hold the base64 string of the new/updated image
        // 'imagePreviewUrl' is just for display
        setFormData(prev => ({ ...prev, image: reader.result as string, imagePreviewUrl: reader.result as string }));
        setErrors(prev => ({ ...prev, image: undefined }));
      };
      reader.onerror = () => {
        setErrors(prev => ({ ...prev, image: 'ไม่สามารถอ่านไฟล์รูปภาพได้' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image: undefined, imagePreviewUrl: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setErrors(prev => ({ ...prev, image: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrorsType = {};
    if (!formData.title.trim()) newErrors.title = 'กรุณากรอกหัวข้อกระทู้';
    else if (containsBlacklistedWords(formData.title)) newErrors.title = 'หัวข้อกระทู้มีคำที่ไม่เหมาะสม';

    if (!formData.body.trim()) newErrors.body = 'กรุณากรอกเนื้อหากระทู้';
    else if (containsBlacklistedWords(formData.body)) newErrors.body = 'เนื้อหากระทู้มีคำที่ไม่เหมาะสม';
    else if (formData.body.length > MAX_POST_CHARS) newErrors.body = `เนื้อหาต้องไม่เกิน ${MAX_POST_CHARS} ตัวอักษร (${formData.body.length}/${MAX_POST_CHARS})`;
    
    if (!formData.category) newErrors.category = 'กรุณาเลือกหมวดหมู่';
    
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
    // 'formData.image' will be the base64 string if a new image was selected,
    // or the original URL if editing and image wasn't changed, or undefined if removed/never set.
    const finalDataToSubmit = { ...dataToSubmitRest, category: category as WebboardCategory, image: formData.image };
    onSubmit(finalDataToSubmit, editingPost?.id);
  };

  const charsLeft = MAX_POST_CHARS - formData.body.length;
  const charCountColor = charsLeft < 0 ? 'text-red-500 dark:text-red-400' : charsLeft < MAX_POST_CHARS * 0.1 ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-medium dark:text-dark-textMuted';

  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border border-neutral-DEFAULT/70 dark:border-dark-border/70 rounded-lg text-neutral-dark dark:text-dark-text focus:outline-none";
  const inputFocusStyle = "focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary";
  const inputErrorStyle = "border-red-500 dark:border-red-400 focus:ring-red-500/50";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;

  return (
    <div className="fixed inset-0 bg-neutral-light dark:bg-dark-pageBg z-40 flex flex-col h-full font-sans">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 border-b border-neutral-DEFAULT/50 dark:border-dark-border/50 bg-white dark:bg-dark-cardBg">
        <Button onClick={onCancel} variant="outline" colorScheme="neutral" size="sm" className="rounded-full !p-2 aspect-square">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          className={`${selectBaseStyle} ${errors.category ? inputErrorStyle : inputFocusStyle} !py-1.5 !px-3 !text-sm !rounded-full !max-w-xs !mx-auto`}
          disabled={!canSubmitForm && !editingPost}
          aria-label="เลือกหมวดหมู่"
        >
          <option value="" disabled>-- เลือกหมวดหมู่ --</option>
          {Object.values(WebboardCategory).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <Button onClick={handleSubmit} variant="login" size="sm" className="rounded-full font-semibold" disabled={(!canSubmitForm && !editingPost) || !formData.title.trim() || !formData.category}>
          {editingPost ? 'บันทึก' : 'โพสต์'}
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!editingPost && limitMessage && (
          <div className={`mb-2 p-2 text-center text-xs rounded-md 
            ${canSubmitForm ? 'bg-sky-100 dark:bg-sky-700/30 text-sky-700 dark:text-sky-200 border border-sky-300 dark:border-sky-500' 
                            : 'bg-yellow-100 dark:bg-yellow-700/30 text-yellow-700 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-500'}`}>
            {limitMessage}
          </div>
        )}
        {errors.category && <p className="text-red-500 dark:text-red-400 text-xs -mt-2 mb-2 text-center">{errors.category}</p>}

        <div>
          <label htmlFor="postTitleScreen" className="sr-only">หัวข้อกระทู้</label>
          <input
            ref={titleInputRef}
            type="text"
            id="postTitleScreen"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={`${inputBaseStyle} ${errors.title ? inputErrorStyle : inputFocusStyle} text-xl font-semibold !p-2 placeholder-neutral-medium/70 dark:placeholder-dark-textMuted/70`}
            placeholder="หัวข้อที่น่าสนใจ..."
            disabled={!canSubmitForm && !editingPost}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          {errors.title && <p id="title-error" className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="postBodyScreen" className="sr-only">เนื้อหากระทู้</label>
          <textarea
            id="postBodyScreen"
            name="body"
            value={formData.body}
            onChange={handleChange}
            rows={10}
            className={`${inputBaseStyle} ${errors.body ? inputErrorStyle : inputFocusStyle} min-h-[200px] text-base !p-2 placeholder-neutral-medium/70 dark:placeholder-dark-textMuted/70`}
            placeholder="เล่าเรื่องราวของคุณที่นี่..."
            disabled={!canSubmitForm && !editingPost}
            maxLength={MAX_POST_CHARS + 200} // Allow slight overtyping, validate on submit
            aria-invalid={!!errors.body}
            aria-describedby={errors.body ? "body-error" : undefined}
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${charCountColor}`}>{formData.body.length}/{MAX_POST_CHARS}</span>
            {errors.body && <p id="body-error" className="text-red-500 dark:text-red-400 text-xs">{errors.body}</p>}
          </div>
        </div>
        
        {formData.imagePreviewUrl && (
          <div className="mt-3 relative max-w-xs mx-auto">
            <img src={formData.imagePreviewUrl} alt="Preview" className="max-h-60 w-auto rounded-md shadow mx-auto" />
            <Button 
              type="button" 
              onClick={handleRemoveImage} 
              className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs p-0 m-0 shadow-md"
              aria-label="ลบรูปภาพ"
              disabled={!canSubmitForm && !editingPost}
            >
              &times;
            </Button>
          </div>
        )}
         {errors.image && <p className="text-red-500 dark:text-red-400 text-xs mt-1 text-center">{errors.image}</p>}


      </div>

      {/* Footer / Action Bar */}
      <div className="flex-shrink-0 flex items-center justify-between p-3 border-t border-neutral-DEFAULT/50 dark:border-dark-border/50 bg-white dark:bg-dark-cardBg">
        <label htmlFor="postImageUploadScreen" className={`p-2 rounded-full hover:bg-neutral-light dark:hover:bg-dark-inputBg cursor-pointer ${(!canSubmitForm && !editingPost) ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-disabled={!canSubmitForm && !editingPost}
          tabIndex={(!canSubmitForm && !editingPost) ? -1 : 0}
          onKeyPress={(e) => { if (e.key === 'Enter' && (canSubmitForm || editingPost) && fileInputRef.current) fileInputRef.current.click(); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-neutral-medium dark:text-dark-textMuted">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <input
            type="file"
            id="postImageUploadScreen"
            name="image"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            disabled={!canSubmitForm && !editingPost}
          />
        </label>
        <WebboardRulesInfo />
      </div>
    </div>
  );
};
