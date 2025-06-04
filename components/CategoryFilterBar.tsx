
import React from 'react';
import type { JobCategory, FilterableCategory } from '../types';
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
  const inputBaseStyle = "w-full p-3 bg-white dark:bg-dark-inputBg border border-[#CCCCCC] dark:border-dark-border rounded-[10px] text-neutral-dark dark:text-dark-text font-serif font-normal focus:outline-none";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  // Using a neutral focus style for the dropdown, similar to form inputs
  const inputFocusStyle = "focus:border-neutral-dark dark:focus:border-dark-text focus:ring-1 focus:ring-neutral-dark dark:focus:ring-dark-text focus:ring-opacity-50";


  return (
    <div className="mb-6 sm:mb-8 px-1"> {/* Added small horizontal padding for better spacing */}
      <label htmlFor="category-filter-select" className="block text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mb-1">
        เลือกหมวดหมู่:
      </label>
      <select
        id="category-filter-select"
        value={selectedCategory}
        onChange={(e) => onSelectCategory(e.target.value as FilterableCategory)}
        className={`${selectBaseStyle} ${inputFocusStyle} text-base`} // Ensure text size is appropriate
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
