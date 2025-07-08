import React, { useState, useEffect, useRef } from 'react';
import type { BlogPost, User } from '../types.ts';
import { BlogCategory } from '../types.ts'; // Import the enum
import { Button } from './Button.tsx';
import { AISuggestionsModal } from './AISuggestionsModal.tsx';

type BlogPostFormData = Partial<Omit<BlogPost, 'id' | 'authorId' | 'authorDisplayName' | 'authorPhotoURL' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'slug' | 'tags'>> & {
  newCoverImageBase64?: string | null;
  newCoverImagePreview?: string | null;
  tagsInput: string;
};

interface ArticleEditorProps {
  onSubmit: (data: BlogPostFormData, existingPostId?: string) => void;
  onCancel: () => void;
  initialData?: BlogPost;
  isEditing: boolean;
  currentUser: User;
  onGenerateSuggestions: (task: 'title' | 'excerpt', content: string) => Promise<{ suggestions: string[] }>;
}

const initialFormState: BlogPostFormData = {
  title: '',
  content: '',
  excerpt: '',
  category: '',
  tagsInput: '',
  status: 'draft',
  coverImageURL: undefined,
  newCoverImageBase64: undefined,
  newCoverImagePreview: undefined,
};

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ onSubmit, onCancel, initialData, isEditing, currentUser, onGenerateSuggestions }) => {
  const [formData, setFormData] = useState<BlogPostFormData>(initialFormState);
  const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiTask, setAiTask] = useState<'title' | 'excerpt' | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        excerpt: initialData.excerpt || '',
        category: initialData.category || '',
        // FIX: Use optional chaining to prevent crash if initialData or initialData.tags is undefined.
        tagsInput: (initialData?.tags || []).join(', '), 
        status: initialData.status || 'draft',
        coverImageURL: initialData.coverImageURL,
        newCoverImagePreview: initialData.coverImageURL,
      });
    } else {
      setFormData(initialFormState);
    }
  }, [initialData, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          newCoverImageBase64: null, // Use null to signify removal
          newCoverImagePreview: null,
      }))
  }

  const handleGenerateSuggestions = async (task: 'title' | 'excerpt') => {
    if (!formData.content) {
      alert("Please write some content first to generate suggestions.");
      return;
    }
    setIsAiLoading(true);
    setAiTask(task);
    try {
      const result = await onGenerateSuggestions(task, formData.content);
      setAiSuggestions(result.suggestions);
      setIsAiModalOpen(true);
    } catch (error) {
      console.error("AI suggestion error:", error);
      alert("Failed to get AI suggestions.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (aiTask) {
      setFormData(prev => ({ ...prev, [aiTask]: suggestion }));
    }
    setIsAiModalOpen(false);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
        ...formData,
        tags: formData.tagsInput.split(',').map(tag => tag.trim()).filter(Boolean),
    };
    onSubmit(finalData, initialData?.id);
  };

  const insertTag = (tag: 'h1' | 'h2' | 'b' | 'i' | 'ul') => {
    const textarea = contentTextAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText = '';

    if (tag === 'ul') {
      const lines = selectedText.split('\n').map(line => `<li>${line}</li>`);
      newText = `<ul>\n${lines.join('\n')}\n</ul>`;
    } else {
      newText = `<${tag}>${selectedText}</${tag}>`;
    }

    const updatedValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    setFormData(prev => ({ ...prev, content: updatedValue }));
  };
  
  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const inputFocusStyle = "focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-70";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;


  return (
    <>
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-4xl mx-auto my-8 border border-neutral-DEFAULT">
      <h2 className="text-3xl font-sans font-semibold text-primary mb-6 text-center">
        {isEditing ? '📝 Edit Article' : '✍️ Create New Article'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Title</label>
           <div className="relative">
              <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className={`${inputBaseStyle} ${inputFocusStyle} font-sans text-lg pr-12`} />
              <Button type="button" onClick={() => handleGenerateSuggestions('title')} size="sm" variant='outline' className="absolute right-2 top-1/2 -translate-y-1/2" disabled={isAiLoading}>✨</Button>
           </div>
        </div>

        <div>
            <label htmlFor="coverImage" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Cover Image</label>
            <input type="file" name="coverImage" id="coverImage" onChange={handleImageChange} accept="image/*" className="w-full text-sm font-sans text-neutral-dark file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-hover/20 file:text-primary-hover/80 hover:file:bg-primary-hover/30" />
            {formData.newCoverImagePreview && (
                <div className="mt-2 relative w-fit">
                    <img src={formData.newCoverImagePreview} alt="Preview" className="h-40 rounded-md" />
                    <Button type="button" onClick={handleRemoveImage} size="sm" colorScheme='accent' className='absolute -top-2 -right-2 !rounded-full !p-1 !h-6 !w-6 flex items-center justify-center'>
                      &times;
                    </Button>
                </div>
            )}
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Excerpt</label>
           <div className="relative">
              <textarea name="excerpt" id="excerpt" value={formData.excerpt} onChange={handleChange} rows={3} required className={`${inputBaseStyle} ${inputFocusStyle} pr-12`}></textarea>
              <Button type="button" onClick={() => handleGenerateSuggestions('excerpt')} size="sm" variant='outline' className="absolute right-2 top-2" disabled={isAiLoading}>✨</Button>
           </div>
        </div>

        <div>
          <label htmlFor="content" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Content (HTML is supported)</label>
          <div className="flex gap-2 mb-1">
            <Button type="button" onClick={() => insertTag('h1')} size="sm" variant="outline">H1</Button>
            <Button type="button" onClick={() => insertTag('h2')} size="sm" variant="outline">H2</Button>
            <Button type="button" onClick={() => insertTag('b')} size="sm" variant="outline"><b>B</b></Button>
            <Button type="button" onClick={() => insertTag('i')} size="sm" variant="outline"><i>I</i></Button>
            <Button type="button" onClick={() => insertTag('ul')} size="sm" variant="outline">UL</Button>
          </div>
          <textarea name="content" id="content" value={formData.content} onChange={handleChange} rows={15} required className={`${inputBaseStyle} ${inputFocusStyle} font-mono text-sm`} ref={contentTextAreaRef}></textarea>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <label htmlFor="category" className="block text-sm font-sans font-medium text-neutral-dark mb-1">Category</label>
                <select name="category" id="category" value={formData.category} onChange={handleChange} required className={`${selectBaseStyle} ${inputFocusStyle}`}>
                  <option value="" disabled>Select a category</option>
                  {Object.values(BlogCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
    <AISuggestionsModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        suggestions={aiSuggestions}
        onSelect={handleSelectSuggestion}
        title={aiTask === 'title' ? 'Title Suggestions' : 'Excerpt Suggestion'}
    />
    </>
  );
};
