

import React, { useRef, useCallback } from 'react';
import type { JobCategory, FilterableCategory } from '../types/types.ts';
// JOB_CATEGORY_EMOJIS_MAP is not used as emojis are disabled.

interface CategoryFilterBarProps {
  categories: JobCategory[];
  selectedCategory: FilterableCategory;
  onSelectCategory: (category: FilterableCategory) => void;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);
  const allItemsLabel = 'หมวดหมู่ทั้งหมด';
  const inputBaseStyle = "w-full p-3 bg-white border border-primary-light rounded-[10px] text-primary-dark font-normal focus:outline-none transition-colors duration-150 ease-in-out min-h-[48px]";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  // Enhanced focus style for better accessibility
  const inputFocusStyle = "focus:border-primary-blue focus:ring-2 focus:ring-primary-blue focus:ring-opacity-50";

  // Enhanced keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLSelectElement>) => {
    // Handle escape to clear selection
    if (e.key === 'Escape') {
      e.preventDefault();
      onSelectCategory('all');
      selectRef.current?.blur();
    }
    
    // Handle Enter to confirm selection (default behavior)
    if (e.key === 'Enter') {
      selectRef.current?.blur();
    }
  }, [onSelectCategory]);

  return (
    <div className="px-1" role="region" aria-label="ตัวกรองหมวดหมู่">
      <label htmlFor="category-filter-select" className="block text-sm font-sans font-medium text-primary-dark mb-1">
        เลือกหมวดหมู่:
        {selectedCategory !== 'all' && (
          <span className="text-xs text-primary-blue ml-1">({selectedCategory})</span>
        )}
      </label>
      <select
        ref={selectRef}
        id="category-filter-select"
        value={selectedCategory}
        onChange={(e) => onSelectCategory(e.target.value as FilterableCategory)}
        onKeyDown={handleKeyDown}
        className={`${selectBaseStyle} ${inputFocusStyle} text-base focus:bg-white`}
        aria-label="กรองตามหมวดหมู่ กด Escape เพื่อล้างการเลือก"
        aria-describedby="category-filter-help"
      >
        <option value="all">{allItemsLabel}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <div id="category-filter-help" className="sr-only">
        เลือกหมวดหมู่เพื่อกรองผลการค้นหา กด Escape เพื่อล้างการเลือก
      </div>
      
      {/* Live region for selection status */}
      <div className="sr-only" aria-live="polite">
        {selectedCategory === 'all' 
          ? "แสดงหมวดหมู่ทั้งหมด" 
          : `กรองตามหมวดหมู่: ${selectedCategory}`
        }
      </div>
    </div>
  );
};