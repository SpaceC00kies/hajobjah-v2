
import React, { useRef, useCallback } from 'react';
import type { FilterableCategory, JobSubCategory } from '../types/types.ts';
import { JobCategory, Province } from '../types/types.ts';
import { Button } from './Button.tsx';

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categorySelectRef = useRef<HTMLSelectElement>(null);
  const subCategorySelectRef = useRef<HTMLSelectElement>(null);
  const provinceSelectRef = useRef<HTMLSelectElement>(null);

  // Count active filters for accessibility announcement
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedSubCategory !== 'all') count++;
    if (selectedProvince !== 'all') count++;
    if (searchTerm && searchTerm.trim()) count++;
    return count;
  }, [selectedCategory, selectedSubCategory, selectedProvince, searchTerm]);

  // Clear all filters function
  const clearAllFilters = useCallback(() => {
    onCategoryChange('all');
    onSubCategoryChange('all');
    onProvinceChange('all');
    if (onSearchTermChange) {
      onSearchTermChange('');
    }
    // Focus search input after clearing
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [onCategoryChange, onSubCategoryChange, onProvinceChange, onSearchTermChange]);

  // Keyboard event handler for the entire filter sidebar
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+F or Cmd+F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    // Escape to clear all filters
    if (e.key === 'Escape') {
      e.preventDefault();
      clearAllFilters();
      return;
    }

    // Arrow key navigation between filter groups
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const focusableElements = [
        searchInputRef.current,
        categorySelectRef.current,
        subCategorySelectRef.current,
        provinceSelectRef.current,
      ].filter(Boolean) as HTMLElement[];

      const currentIndex = focusableElements.findIndex(el => el === document.activeElement);

      if (currentIndex !== -1) {
        e.preventDefault();
        const nextIndex = e.key === 'ArrowDown'
          ? (currentIndex + 1) % focusableElements.length
          : (currentIndex - 1 + focusableElements.length) % focusableElements.length;

        focusableElements[nextIndex]?.focus();
      }
    }
  }, [clearAllFilters]);

  // Enhanced select keyboard handler
  const handleSelectKeyDown = useCallback((e: React.KeyboardEvent<HTMLSelectElement>, type: 'category' | 'subcategory' | 'province') => {
    // Allow normal select behavior for space and enter
    if (e.key === ' ' || e.key === 'Enter') {
      return;
    }

    // Handle escape to close and clear
    if (e.key === 'Escape') {
      e.preventDefault();
      const target = e.currentTarget;
      target.blur();

      // Clear the specific filter
      switch (type) {
        case 'category':
          onCategoryChange('all');
          break;
        case 'subcategory':
          onSubCategoryChange('all');
          break;
        case 'province':
          onProvinceChange('all');
          break;
      }
    }
  }, [onCategoryChange, onSubCategoryChange, onProvinceChange]);

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div
      className="sticky top-24 bg-white p-4 rounded-xl shadow-lg border border-primary-light"
      onKeyDown={handleKeyDown}
    >
      <div className="space-y-4" role="region" aria-label="ตัวกรองการค้นหา">
        <div className="flex items-center justify-between">
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs bg-primary-blue text-white px-2 py-1 rounded-full"
                aria-label={`มีตัวกรอง ${activeFiltersCount} รายการ`}
              >
                {activeFiltersCount}
              </span>
              <button
                onClick={clearAllFilters}
                className="text-xs font-sans text-gray-500 hover:text-primary-dark px-2 py-1 rounded transition-colors duration-150 hover:bg-gray-50"
                aria-label="ล้างตัวกรองทั้งหมด"
                title="กด Escape เพื่อล้างตัวกรองทั้งหมด"
              >
                ล้างทั้งหมด
              </button>
            </div>
          )}
        </div>

        {onSearchTermChange && (
          <div>

            <input
              ref={searchInputRef}
              id="sidebar-search-input"
              type="search"
              value={searchTerm || ''}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={`${searchPlaceholder} กด Ctrl+F เพื่อโฟกัส`}
              aria-describedby="search-help"
              className="form-input focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
            />
            <div id="search-help" className="sr-only">
              กด Ctrl+F เพื่อโฟกัสที่ช่องค้นหา หรือ Escape เพื่อล้างตัวกรองทั้งหมด
            </div>
          </div>
        )}

        <div>
          <label htmlFor="category-filter" className="block text-sm font-sans font-medium text-primary-dark mb-2">
            หมวดหมู่
            {selectedCategory !== 'all' && (
              <span className="text-xs text-primary-blue ml-1">({selectedCategory})</span>
            )}
          </label>
          <select
            ref={categorySelectRef}
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as FilterableCategory)}
            onKeyDown={(e) => handleSelectKeyDown(e, 'category')}
            className="form-select w-full focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
            aria-describedby="category-help"
          >
            <option value="all">หมวดหมู่ทั้งหมด</option>
            {Object.values(JobCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <div id="category-help" className="sr-only">
            เลือกหมวดหมู่เพื่อกรองผลการค้นหา กด Escape เพื่อล้างการเลือก
          </div>
        </div>

        <div>
          <label htmlFor="subcategory-filter" className="block text-sm font-sans font-medium text-primary-dark mb-2">
            หมวดหมู่ย่อย
            {selectedSubCategory !== 'all' && (
              <span className="text-xs text-primary-blue ml-1">({selectedSubCategory})</span>
            )}
          </label>
          <select
            ref={subCategorySelectRef}
            id="subcategory-filter"
            value={selectedSubCategory}
            onChange={(e) => onSubCategoryChange(e.target.value as JobSubCategory | 'all')}
            onKeyDown={(e) => handleSelectKeyDown(e, 'subcategory')}
            disabled={availableSubCategories.length === 0}
            className="form-select w-full disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
            aria-describedby="subcategory-help"
          >
            <option value="all">หมวดหมู่ย่อยทั้งหมด</option>
            {availableSubCategories.map(subCat => <option key={subCat} value={subCat}>{subCat}</option>)}
          </select>
          <div id="subcategory-help" className="sr-only">
            {availableSubCategories.length === 0
              ? "เลือกหมวดหมู่หลักก่อนเพื่อดูหมวดหมู่ย่อย กด Escape เพื่อล้างการเลือก"
              : "เลือกหมวดหมู่ย่อยเพื่อกรองผลการค้นหาเพิ่มเติม กด Escape เพื่อล้างการเลือก"
            }
          </div>
        </div>

        <div>
          <label htmlFor="province-filter" className="block text-sm font-sans font-medium text-primary-dark mb-2">
            จังหวัด
            {selectedProvince !== 'all' && (
              <span className="text-xs text-primary-blue ml-1">({selectedProvince})</span>
            )}
          </label>
          <select
            ref={provinceSelectRef}
            id="province-filter"
            value={selectedProvince}
            onChange={(e) => onProvinceChange(e.target.value as Province | 'all')}
            onKeyDown={(e) => handleSelectKeyDown(e, 'province')}
            className="form-select w-full focus:ring-2 focus:ring-primary-blue focus:border-primary-blue"
            aria-describedby="province-help"
          >
            <option value="all">ทุกจังหวัด</option>
            {Object.values(Province).map(prov => <option key={prov} value={prov}>{prov}</option>)}
          </select>
          <div id="province-help" className="sr-only">
            เลือกจังหวัดเพื่อกรองผลการค้นหาตามพื้นที่ กด Escape เพื่อล้างการเลือก
          </div>
        </div>

        {actionButtonText && onActionButtonClick && (
          <Button
            onClick={onActionButtonClick}
            variant="secondary"
            className="w-full !rounded-lg !py-3 !min-h-[48px]"
            aria-describedby="action-button-help"
          >
            {actionButtonText}
          </Button>
        )}

        {/* Enhanced live region for filter status */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {activeFiltersCount === 0
            ? "ไม่มีตัวกรองที่เลือก"
            : `มีตัวกรอง ${activeFiltersCount} รายการ: ${[
              selectedCategory !== 'all' ? `หมวดหมู่ ${selectedCategory}` : '',
              selectedSubCategory !== 'all' ? `หมวดหมู่ย่อย ${selectedSubCategory}` : '',
              selectedProvince !== 'all' ? `จังหวัด ${selectedProvince}` : '',
              searchTerm && searchTerm.trim() ? `ค้นหา "${searchTerm}"` : ''
            ].filter(Boolean).join(', ')}`
          }
        </div>

        {/* Keyboard shortcuts help */}
        <div className="sr-only">
          คีย์บอร์ดช็อตคัต: กด Ctrl+F เพื่อโฟกัสช่องค้นหา, กด Escape เพื่อล้างตัวกรองทั้งหมด,
          ใช้ลูกศรขึ้นลงเพื่อนำทางระหว่างตัวกรอง
        </div>
      </div>
    </div>
  );
};
