
import React from 'react';
import type { JobCategory, FilterableCategory } from '../types.ts';
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
  const inputBaseStyle = "w-full p-3 bg-white border border-[#CCCCCC] rounded-[10px] text-neutral-dark font-serif font-normal focus:outline-none transition-colors duration-150 ease-in-out";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;
  // Using a neutral focus style for the dropdown, similar to form inputs
  const inputFocusStyle = "focus:border-neutral-dark focus:ring-1 focus:ring-neutral-dark focus:ring-opacity-50";


  return (
    <div className="px-1"> {/* Removed mb-6 sm:mb-8 */}
      <label htmlFor="category-filter-select" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
        เลือกหมวดหมู่:
      </label>
      <select
        id="category-filter-select"
        value={selectedCategory}
        onChange={(e) => onSelectCategory(e.target.value as FilterableCategory)}
        className={`${selectBaseStyle} ${inputFocusStyle} text-base focus:bg-gray-50`} // Ensure text size is appropriate
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