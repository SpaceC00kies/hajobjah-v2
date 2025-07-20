"use client";
import React from 'react';
import type { FilterableCategory, JobSubCategory } from '../types/types';
import { JobCategory, Province } from '../types/types';
import { Button } from './Button';

interface FilterSidebarProps {
  selectedCategory: FilterableCategory;
  onCategoryChange: (category: FilterableCategory) => void;
  availableSubCategories: JobSubCategory[];
  selectedSubCategory: JobSubCategory | 'all';
  onSubCategoryChange: (subCategory: JobSubCategory | 'all') => void;
  selectedProvince: Province | 'all';
  onProvinceChange: (province: Province | 'all') => void;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  actionButtonText?: string;
  onActionButtonClick?: () => void;
  searchPlaceholder: string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  selectedCategory,
  onCategoryChange,
  availableSubCategories,
  selectedSubCategory,
  onSubCategoryChange,
  selectedProvince,
  onProvinceChange,
  searchTerm,
  onSearchTermChange,
  actionButtonText,
  onActionButtonClick,
  searchPlaceholder,
}) => {
  return (
    <div className="sticky top-24 bg-white p-4 rounded-xl shadow-lg border border-primary-light">
      <div className="space-y-6">
        {onSearchTermChange && (
          <div>
            <label htmlFor="sidebar-search-input" className="block text-sm font-sans font-medium text-primary-dark mb-1">ค้นหา</label>
            <input
              id="sidebar-search-input"
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
          </div>
        )}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">หมวดหมู่</label>
          <select id="category-filter" value={selectedCategory} onChange={(e) => onCategoryChange(e.target.value as FilterableCategory)}>
            <option value="all">หมวดหมู่ทั้งหมด</option>
            {Object.values(JobCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="subcategory-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">หมวดหมู่ย่อย</label>
          <select id="subcategory-filter" value={selectedSubCategory} onChange={(e) => onSubCategoryChange(e.target.value as JobSubCategory | 'all')} disabled={availableSubCategories.length === 0}>
            <option value="all">หมวดหมู่ย่อยทั้งหมด</option>
            {availableSubCategories.map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="province-filter" className="block text-sm font-sans font-medium text-primary-dark mb-1">จังหวัด</label>
          <select id="province-filter" value={selectedProvince} onChange={(e) => onProvinceChange(e.target.value as Province | 'all')}>
            <option value="all">ทุกจังหวัด</option>
            {Object.values(Province).map(prov => <option key={prov} value={prov}>{prov}</option>)}
          </select>
        </div>
        {actionButtonText && onActionButtonClick && (
          <Button onClick={onActionButtonClick} variant="secondary" className="w-full !rounded-lg !py-3">
            {actionButtonText}
          </Button>
        )}
      </div>
    </div>
  );
};