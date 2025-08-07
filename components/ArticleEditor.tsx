import React, { useState, useEffect, useRef } from 'react';
import type { BlogPost } from '../types/types.ts';
import { BlogCategory } from '../types/types.ts';
import { Button } from './Button.tsx';
import { useBlog } from '../hooks/useBlog.ts';
import { useLocation, useNavigate, useParams } from 'react-router-dom';


type BlogPostFormData = Partial<Omit<BlogPost, 'id' | 'authorId' | 'authorDisplayName' | 'authorPhotoURL' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'tags' | 'likes' | 'likeCount'>> & {
  slug?: string;
  metaTitle?: string;
  coverImageAltText?: string;
  newCoverImageBase64?: string | null;
  newCoverImagePreview?: string | null;
  tagsInput: string;
};

type FormErrorsType = Partial<Record<keyof Omit<BlogPostFormData, 'newCoverImageBase64' | 'newCoverImagePreview' | 'coverImageURL'>, string>>;

interface ArticleEditorProps {
  onCancel: () => void;
  isEditing: boolean;
}

const initialFormState: BlogPostFormData = {
  title: '',
  content: '',
  excerpt: '',
  category: '',
  tagsInput: '',
  status: 'draft',
  slug: '',
  metaTitle: '',
  coverImageAltText: '',
  coverImageURL: undefined,
  newCoverImageBase64: undefined,
  newCoverImagePreview: undefined,
};

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ onCancel, isEditing }) => {
  const { postId } = useParams<{ postId: string }>();
  const { addOrUpdateBlogPost, allBlogPostsForAdmin } = useBlog();
  const location = useLocation();
  const navigate = useNavigate();
  const initialData = isEditing ? allBlogPostsForAdmin.find(p => p.id === postId) || location.state?.item : undefined;

  const [formData, setFormData] = useState<BlogPostFormData>(initialFormState);
  const [formErrors, setFormErrors] = useState<FormErrorsType>({});
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const generateSlug = (text: string): string => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        excerpt: initialData.excerpt || '',
        category: initialData.category || '',
        tagsInput: (initialData?.tags || []).join(', '), 
        status: initialData.status || 'draft',
        slug: initialData.slug || '',
        metaTitle: initialData.metaTitle || '',
        coverImageAltText: initialData.coverImageAltText || '',
        coverImageURL: initialData.coverImageURL,
        newCoverImagePreview: initialData.coverImageURL,
      });
      if (initialData.slug) {
        setIsSlugManuallyEdited(true);
      }
    } else {
      setFormData(initialFormState);
      setIsSlugManuallyEdited(false);
    }
  }, [initialData, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'slug') setIsSlugManuallyEdited(true);
    
    setFormData(prev => {
        const newValues = { ...prev, [name]: value };
        if (name === 'title' && !isSlugManuallyEdited) newValues.slug = generateSlug(value);
        if (name === 'slug') {
            newValues.slug = value.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
        }
        return newValues;
    });

    if (formErrors[name as keyof FormErrorsType]) {
        setFormErrors(prev => ({ ...prev, [name as keyof FormErrorsType]: undefined }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          newCoverImageBase64: reader.result as string,
          newCoverImagePreview: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveImage = () => {
      setFormData(prev => ({
          ...prev,
          coverImageURL: undefined,
          newCoverImageBase64: null,
          newCoverImagePreview: null,
      }))
  }

  const validateForm = (): boolean => {
    const errors: FormErrorsType = {};
    if (!formData.title?.trim()) errors.title = "Title is required.";
    if (!formData.slug?.trim()) {
        errors.slug = "URL Slug is required.";
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug)) {
        errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.';
    }
    if (!formData.category) errors.category = "Category is required.";
    if (!formData.content?.trim()) errors.content = "Content is required.";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const finalData = { ...formData, slug: generateSlug(formData.slug || '') };
    
    await addOrUpdateBlogPost(finalData, initialData?.id);
    navigate('/admin');
  };

  const inputBaseStyle = "w-full p-3 bg-white border border-primary-light rounded-lg text-neutral-dark font-serif focus:outline-none transition-colors duration-150";
  const inputFocusStyle = "focus:border-primary focus:ring-1 focus:ring-primary";
  const inputErrorStyle = "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;

  return (
    <>
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-4xl mx-auto my-8 border border-neutral-DEFAULT">
        <h2 className="text-3xl font-sans font-semibold text-primary mb-6 text-center">
          {isEditing ? '📝 Edit Article' : '✍️ Create New Article'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-sans font-medium text-neutral-dark">Title (On-page H1)</label>
            <div className="flex items-center gap-2">
              <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={`${inputBaseStyle} ${formErrors.title ? inputErrorStyle : inputFocusStyle} font-sans text-lg`} />
            </div>
            {formErrors.title && <p className="text-red-500 font-sans text-xs mt-1">{formErrors.title}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="metaTitle" className="block text-sm font-sans font-medium text-neutral-dark">Meta Title (for SEO)</label>
            <input type="text" name="metaTitle" id="metaTitle" value={formData.metaTitle || ''} onChange={handleChange} placeholder="Defaults to main title if empty..." className={`${inputBaseStyle} ${inputFocusStyle} font-sans text-sm`} />
            <p className="text-xs font-sans text-neutral-medium mt-1">
              ชื่อที่จะแสดงบนแท็บของเบราว์เซอร์และในผลการค้นหาของ Google (ควรสั้นกระชับและมีคีย์เวิร์ด)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="block text-sm font-sans font-medium text-neutral-dark">URL Slug</label>
            <input type="text" name="slug" id="slug" value={formData.slug || ''} onChange={handleChange} required className={`${inputBaseStyle} ${formErrors.slug ? inputErrorStyle : inputFocusStyle} font-mono text-sm`} />
            <p className="text-xs font-sans text-neutral-medium mt-1">
              ใช้ตัวอักษรภาษาอังกฤษตัวพิมพ์เล็ก, ตัวเลข, และขีดกลางเท่านั้น (เช่น 'my-awesome-post-123')
            </p>
            {formErrors.slug && <p className="text-red-500 font-sans text-xs mt-1">{formErrors.slug}</p>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-sans font-medium text-neutral-dark">Cover Image</label>
            <input type="file" name="coverImage" id="coverImage" onChange={handleImageChange} accept="image/*" className="w-full text-sm font-sans text-neutral-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary-dark hover:file:bg-primary" />
            {formData.newCoverImagePreview && (
                <div className="mt-2 space-y-3">
                    <div className="relative w-fit">
                        <img src={formData.newCoverImagePreview} alt="Preview" className="h-40 rounded-md" loading="lazy" decoding="async" />
                        <Button type="button" onClick={handleRemoveImage} size="sm" colorScheme='accent' className='absolute -top-2 -right-2 !rounded-full !p-1 !h-6 !w-6 flex items-center justify-center'>
                          &times;
                        </Button>
                    </div>
                    <div>
                        <label htmlFor="coverImageAltText" className="block text-sm font-sans font-medium text-neutral-dark">Cover Image Alt Text (for SEO)</label>
                        <input type="text" name="coverImageAltText" id="coverImageAltText" value={formData.coverImageAltText || ''} onChange={handleChange} placeholder="Defaults to main title if empty..." className={`${inputBaseStyle} ${inputFocusStyle} font-sans text-sm`} />
                        <p className="text-xs font-sans text-neutral-medium mt-1">
                            คำอธิบายสั้นๆ ของรูปภาพสำหรับ SEO และผู้พิการทางสายตา
                        </p>
                    </div>
                </div>
            )}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="excerpt" className="block text-sm font-sans font-medium text-neutral-dark">Meta Description / Excerpt</label>
            <div className="flex items-center gap-2">
              <textarea name="excerpt" id="excerpt" value={formData.excerpt} onChange={handleChange} rows={3} className={`${inputBaseStyle} ${inputFocusStyle}`}></textarea>
            </div>
            <p className="text-xs font-sans text-neutral-medium mt-1">
              บทคัดย่อสั้นๆ ที่จะแสดงในผลการค้นหาของ Google และการ์ดบทความ (ประมาณ 1-2 ประโยค)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-sans font-medium text-neutral-dark">Content (HTML is supported)</label>
            <textarea name="content" id="content" value={formData.content} onChange={handleChange} rows={15} required className={`${inputBaseStyle} ${formErrors.content ? inputErrorStyle : inputFocusStyle} font-mono text-sm`} ref={contentTextAreaRef}></textarea>
             {formErrors.content && <p className="text-red-500 font-sans text-xs mt-1">{formErrors.content}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                  <label htmlFor="category" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Category</label>
                  <select name="category" id="category" value={formData.category} onChange={handleChange} required className={`${selectBaseStyle} ${formErrors.category ? inputErrorStyle : inputFocusStyle}`}>
                    <option value="" disabled>Select a category</option>
                    {Object.values(BlogCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {formErrors.category && <p className="text-red-500 font-sans text-xs mt-1">{formErrors.category}</p>}
              </div>
               <div>
                  <label htmlFor="tagsInput" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Tags (comma-separated)</label>
                  <input type="text" name="tagsInput" id="tagsInput" value={formData.tagsInput} onChange={handleChange} className={`${inputBaseStyle} ${inputFocusStyle}`} />
              </div>
               <div>
                  <label htmlFor="status" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Status</label>
                  <select name="status" id="status" value={formData.status} onChange={handleChange} required className={`${selectBaseStyle} ${inputFocusStyle}`}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                  </select>
              </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-neutral-DEFAULT">
              <Button type="button" onClick={onCancel} variant="outline" size="lg">Cancel</Button>
              <Button type="submit" variant="primary" size="lg">{isEditing ? 'Update Article' : 'Create Article'}</Button>
          </div>
        </form>
      </div>
    </>
  );
};