

import React from 'react';
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
  const allItemsLabel = 'หมวดหมู่ทั้งหมด';
  const inputBaseStyle = "w-full p-3 bg-white border border-primary-light rounded-[10px] text-primary-dark font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  // Using a neutral focus style for the dropdown, similar to form inputs
  const inputFocusStyle = "focus:border-primary-blue focus:ring-1 focus:ring-primary-blue focus:ring-opacity-50";


  return (
    <div className="px-1"> {/* Removed mb-6 sm:mb-8 */}
      <label htmlFor="category-filter-select" className="block text-sm font-sans font-medium text-primary-dark mb-1">
        เลือกหมวดหมู่:
      </label>
      <select
        id="category-filter-select"
        value={selectedCategory}
        onChange={(e) => onSelectCategory(e.target.value as FilterableCategory)}
        className={`${selectBaseStyle} ${inputFocusStyle} text-base focus:bg-white`} // Ensure text size is appropriate
        aria-label="กรองตามหมวดหมู่"
      >
        <option value="all">{allItemsLabel}</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </div>
  );
};