import React, { useState, useEffect, useRef } from 'react';
import type { BlogPost } from '../types/types.ts';
import { BlogCategory } from '../types/types.ts';
import { Button } from './Button.tsx';
import { useBlog } from '../hooks/useBlog.ts';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// Image compression utility
const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};


type BlogPostFormData = Partial<Omit<BlogPost, 'id' | 'authorId' | 'authorDisplayName' | 'authorPhotoURL' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'tags' | 'likes' | 'likeCount'>> & {
  slug?: string;
  metaTitle?: string;
  coverImageAltText?: string;
  cardImageAltText?: string;
  newCoverImageBase64?: string | null;
  newCoverImagePreview?: string | null;
  newCardImageBase64?: string | null;
  newCardImagePreview?: string | null;
  tagsInput: string;
  isFeatured?: boolean;
  isSubFeatured?: boolean;
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
  cardImageAltText: '',
  coverImageURL: undefined,
  cardImageURL: undefined,
  newCoverImageBase64: undefined,
  newCoverImagePreview: undefined,
  newCardImageBase64: undefined,
  newCardImagePreview: undefined,
  isFeatured: false,
  isSubFeatured: false,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingCard, setIsUploadingCard] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
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
        cardImageAltText: initialData.cardImageAltText || '',
        coverImageURL: initialData.coverImageURL,
        cardImageURL: initialData.cardImageURL,
        newCoverImagePreview: initialData.coverImageURL,
        newCardImagePreview: initialData.cardImageURL,
        isFeatured: initialData.isFeatured || false,
        isSubFeatured: initialData.isSubFeatured || false,
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

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingCover(true);
      try {
        // Compress image for cover (horizontal, larger)
        const compressedDataUrl = await compressImage(file, 1200, 0.8);

        setFormData(prev => ({
          ...prev,
          newCoverImageBase64: compressedDataUrl,
          newCoverImagePreview: compressedDataUrl,
        }));
        setIsUploadingCover(false);
      } catch (error) {
        setIsUploadingCover(false);
        alert('Error processing cover image. Please try again.');
        console.error('Cover image compression error:', error);
      }
    }
  };

  const handleCardImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingCard(true);
      try {
        // Compress image for card (vertical, smaller)
        const compressedDataUrl = await compressImage(file, 800, 0.8);

        setFormData(prev => ({
          ...prev,
          newCardImageBase64: compressedDataUrl,
          newCardImagePreview: compressedDataUrl,
        }));
        setIsUploadingCard(false);
      } catch (error) {
        setIsUploadingCard(false);
        alert('Error processing card image. Please try again.');
        console.error('Card image compression error:', error);
      }
    }
  };

  const handleRemoveCoverImage = () => {
    setFormData(prev => ({
      ...prev,
      coverImageURL: undefined,
      newCoverImageBase64: null,
      newCoverImagePreview: null,
    }))
  }

  const handleRemoveCardImage = () => {
    setFormData(prev => ({
      ...prev,
      cardImageURL: undefined,
      newCardImageBase64: null,
      newCardImagePreview: null,
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

  const handleTextFormat = (tag: 'b' | 'i' | 'u' | 'h1' | 'h2' | 'h3' | 'ul') => {
    if (!contentTextAreaRef.current) return;

    const textarea = contentTextAreaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let prefix = `<${tag}>`;
    let suffix = `</${tag}>`;
    let textToWrap = selectedText;
    let replacement = '';

    if (tag === 'ul') {
      if (selectedText) {
        prefix = '<ul>\n';
        textToWrap = selectedText.split('\n').map(line => `  <li>${line.trim()}</li>`).join('\n');
        suffix = '\n</ul>';
      } else {
        prefix = '<ul>\n  <li>';
        textToWrap = '';
        suffix = '</li>\n</ul>';
      }
    }

    replacement = prefix + textToWrap + suffix;

    const newValue =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    setFormData(prev => ({ ...prev, content: newValue }));

    // Defer focusing and setting selection to after the state update has been processed.
    setTimeout(() => {
      textarea.focus();
      if (!selectedText) {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      } else {
        textarea.setSelectionRange(start, start + replacement.length);
      }
    }, 0);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      console.log('Starting article submission...', {
        hasNewCoverImage: !!formData.newCoverImageBase64,
        hasNewCardImage: !!formData.newCardImageBase64,
        isEditing
      });

      const finalData = { ...formData, slug: generateSlug(formData.slug || '') };

      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout - operation took too long')), 30000); // 30 second timeout
      });

      const result = await Promise.race([
        addOrUpdateBlogPost(finalData, initialData?.id),
        timeoutPromise
      ]);
      console.log('Article submission successful:', result);

      setSubmitStatus('success');
      setSubmitMessage(isEditing ? 'Article updated successfully!' : 'Article created successfully!');

      // Navigate after a short delay to show success message
      setTimeout(() => {
        navigate('/admin');
      }, 1500);

    } catch (error: any) {
      console.error('Error saving article:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      let errorMessage = 'Failed to save article. ';

      if (error.message?.includes('payload size exceeds')) {
        errorMessage += 'Images are too large. Please use smaller images (under 2MB each).';
      } else if (error.message?.includes('permission')) {
        errorMessage += 'Permission denied. Please check your account permissions.';
      } else if (error.message?.includes('network')) {
        errorMessage += 'Network error. Please check your internet connection.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }

      setSubmitStatus('error');
      setSubmitMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
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
            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={`${inputBaseStyle} ${formErrors.title ? inputErrorStyle : inputFocusStyle} font-sans text-lg`} />
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

          {/* Dual Image Upload System */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Image - Vertical/Poster for blog cards */}
            <div className="space-y-2">
              <label className="block text-sm font-sans font-medium text-neutral-dark">
                📱 Card Image (Vertical/Poster)
              </label>
              <p className="text-xs font-sans text-neutral-medium">
                รูปแนวตั้งสำหรับแสดงในการ์ดบทความ (แนะนำ 3:4 หรือ 2:3)
              </p>
              <input
                type="file"
                name="cardImage"
                id="cardImage"
                onChange={handleCardImageChange}
                accept="image/*"
                disabled={isUploadingCard}
                className="w-full text-sm font-sans text-neutral-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 disabled:opacity-50"
              />
              {isUploadingCard && (
                <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <span>Processing card image...</span>
                </div>
              )}
              {formData.newCardImagePreview && (
                <div className="mt-2 space-y-3">
                  <div className="relative w-fit">
                    <img src={formData.newCardImagePreview} alt="Card Preview" className="h-40 w-32 object-cover rounded-md border-2 border-purple-200" loading="lazy" decoding="async" />
                    <Button type="button" onClick={handleRemoveCardImage} size="sm" colorScheme='accent' className='absolute -top-2 -right-2 !rounded-full !p-1 !h-6 !w-6 flex items-center justify-center'>
                      &times;
                    </Button>
                  </div>
                  <div>
                    <label htmlFor="cardImageAltText" className="block text-sm font-sans font-medium text-neutral-dark">Card Image Alt Text</label>
                    <input type="text" name="cardImageAltText" id="cardImageAltText" value={formData.cardImageAltText || ''} onChange={handleChange} placeholder="Alt text for card image..." className={`${inputBaseStyle} ${inputFocusStyle} font-sans text-sm`} />
                  </div>
                </div>
              )}
            </div>

            {/* Cover Image - Horizontal for article header */}
            <div className="space-y-2">
              <label className="block text-sm font-sans font-medium text-neutral-dark">
                🖼️ Cover Image (Horizontal)
              </label>
              <p className="text-xs font-sans text-neutral-medium">
                รูปแนวนอนสำหรับแสดงในหน้าบทความ (แนะนำ 16:9 หรือ 4:3)
              </p>
              <input
                type="file"
                name="coverImage"
                id="coverImage"
                onChange={handleCoverImageChange}
                accept="image/*"
                disabled={isUploadingCover}
                className="w-full text-sm font-sans text-neutral-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 disabled:opacity-50"
              />
              {isUploadingCover && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Processing cover image...</span>
                </div>
              )}
              {formData.newCoverImagePreview && (
                <div className="mt-2 space-y-3">
                  <div className="relative w-fit">
                    <img src={formData.newCoverImagePreview} alt="Cover Preview" className="h-32 w-48 object-cover rounded-md border-2 border-blue-200" loading="lazy" decoding="async" />
                    <Button type="button" onClick={handleRemoveCoverImage} size="sm" colorScheme='accent' className='absolute -top-2 -right-2 !rounded-full !p-1 !h-6 !w-6 flex items-center justify-center'>
                      &times;
                    </Button>
                  </div>
                  <div>
                    <label htmlFor="coverImageAltText" className="block text-sm font-sans font-medium text-neutral-dark">Cover Image Alt Text</label>
                    <input type="text" name="coverImageAltText" id="coverImageAltText" value={formData.coverImageAltText || ''} onChange={handleChange} placeholder="Alt text for cover image..." className={`${inputBaseStyle} ${inputFocusStyle} font-sans text-sm`} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="excerpt" className="block text-sm font-sans font-medium text-neutral-dark">Meta Description / Excerpt</label>
            <textarea name="excerpt" id="excerpt" value={formData.excerpt} onChange={handleChange} rows={3} className={`${inputBaseStyle} ${inputFocusStyle}`}></textarea>
            <p className="text-xs font-sans text-neutral-medium mt-1">
              บทคัดย่อสั้นๆ ที่จะแสดงในผลการค้นหาของ Google และการ์ดบทความ (ประมาณ 1-2 ประโยค)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-sans font-medium text-neutral-dark">Content (HTML is supported)</label>
            <div className="flex flex-wrap items-center gap-2 p-2 bg-neutral-light/50 border border-primary-light rounded-lg">
              <Button type="button" onClick={() => handleTextFormat('h1')} size="sm" variant="outline" colorScheme="neutral" className="font-sans">H1</Button>
              <Button type="button" onClick={() => handleTextFormat('h2')} size="sm" variant="outline" colorScheme="neutral" className="font-sans">H2</Button>
              <Button type="button" onClick={() => handleTextFormat('h3')} size="sm" variant="outline" colorScheme="neutral" className="font-sans">H3</Button>
              <div className="w-px h-5 bg-primary-light mx-1"></div>
              <Button type="button" onClick={() => handleTextFormat('b')} size="sm" variant="outline" colorScheme="neutral" className="font-sans font-bold">B</Button>
              <Button type="button" onClick={() => handleTextFormat('i')} size="sm" variant="outline" colorScheme="neutral" className="font-sans italic">I</Button>
              <Button type="button" onClick={() => handleTextFormat('u')} size="sm" variant="outline" colorScheme="neutral" className="font-sans underline">U</Button>
              <div className="w-px h-5 bg-primary-light mx-1"></div>
              <Button type="button" onClick={() => handleTextFormat('ul')} size="sm" variant="outline" colorScheme="neutral" className="font-sans">List</Button>
            </div>
            <textarea name="content" id="content" value={formData.content} onChange={handleChange} rows={15} required className={`${inputBaseStyle} ${formErrors.content ? inputErrorStyle : inputFocusStyle} font-mono text-sm mt-2`} ref={contentTextAreaRef}></textarea>
            {formErrors.content && <p className="text-red-500 font-sans text-xs mt-1">{formErrors.content}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="space-y-3">
              <label className="block text-sm font-sans font-medium text-neutral-dark mb-1">Article Priority</label>
              
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <input 
                  type="checkbox" 
                  name="isFeatured" 
                  id="isFeatured" 
                  checked={formData.isFeatured || false}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    isFeatured: e.target.checked,
                    isSubFeatured: e.target.checked ? false : prev.isSubFeatured // Clear sub-featured if featured is checked
                  }))}
                  className="w-4 h-4 text-yellow-600 bg-white border-yellow-300 rounded focus:ring-yellow-500 focus:ring-2"
                />
                <label htmlFor="isFeatured" className="text-sm font-sans text-yellow-800 cursor-pointer">
                  ⭐ Main Featured (Row 1)
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <input 
                  type="checkbox" 
                  name="isSubFeatured" 
                  id="isSubFeatured" 
                  checked={formData.isSubFeatured || false}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    isSubFeatured: e.target.checked,
                    isFeatured: e.target.checked ? false : prev.isFeatured // Clear featured if sub-featured is checked
                  }))}
                  className="w-4 h-4 text-blue-600 bg-white border-blue-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="isSubFeatured" className="text-sm font-sans text-blue-800 cursor-pointer">
                  🔹 Sub-Featured (Row 2)
                </label>
              </div>

              <p className="text-xs font-sans text-neutral-medium">
                Featured: Yellow section (1 big card). Sub-Featured: Row 2 (3 cards). Regular: Row 3+ (5 cards)
              </p>
            </div>
          </div>

          {/* Success/Error Feedback */}
          {submitStatus !== 'idle' && (
            <div className={`p-4 rounded-lg border ${submitStatus === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
              }`}>
              <div className="flex items-center gap-2">
                {submitStatus === 'success' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium">{submitMessage}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-neutral-DEFAULT">
            <Button type="button" onClick={onCancel} variant="outline" size="lg" disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                </div>
              ) : (
                isEditing ? 'Update Article' : 'Create Article'
              )}
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log('Current form data:', formData);
                console.log('Has images:', {
                  cover: !!formData.newCoverImageBase64,
                  card: !!formData.newCardImageBase64
                });
              }}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Debug
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
