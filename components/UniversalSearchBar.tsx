
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Province } from '../types/types.ts';
import { motion } from 'framer-motion';

type SelectedProvince = 'all' | Province.ChiangMai | Province.Bangkok;

interface UniversalSearchBarProps {
  onSearch: (searchParams: { query: string, province: string }) => void;
  isLoading: boolean;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  onOpenLocationModal: () => void;
}

// Custom hook for typewriter effect
const useTypewriter = (texts: string[], speed: number = 100, deleteSpeed: number = 50, pauseTime: number = 2000) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = texts[currentIndex];

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1));
        } else {
          // Finished typing, start pause before deleting
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        // Deleting
        if (displayText.length > 0) {
          setDisplayText(currentText.slice(0, displayText.length - 1));
        } else {
          // Finished deleting, move to next text
          setIsDeleting(false);
          setCurrentIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? deleteSpeed : speed);

    return () => clearTimeout(timeout);
  }, [displayText, currentIndex, isDeleting, texts, speed, deleteSpeed, pauseTime]);

  return displayText;
};

export const UniversalSearchBar: React.FC<UniversalSearchBarProps> = ({ onSearch, isLoading, selectedProvince, onProvinceChange, onOpenLocationModal }) => {
  const [query, setQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const locationPillsRef = useRef<HTMLDivElement>(null);

  // Typewriter effect for placeholder
  const placeholderTexts = [
    'อย่าหาแฟนตรงนี้!',
    'วันหยุดรองรับงานเอน เอ้ย งานจ้างไหม?',
    'มองหาคนทำงานแค่ 1 ชม. ลองประกาศสิ',
    'ให้แมวจอมซนช่วยค้นหา'
  ];
  const animatedPlaceholder = useTypewriter(placeholderTexts, 80, 40, 1500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch({ query: query.trim(), province: selectedProvince });
    }
  };

  // Debounced search for better performance
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim() && !isLoading) {
        onSearch({ query: searchQuery.trim(), province: selectedProvince });
      }
    }, 300);
  }, [onSearch, selectedProvince, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    // Optional: Enable live search with debounce
    // debouncedSearch(value);
  };

  // Keyboard navigation for location pills
  const handleLocationPillKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const pills = locationPillsRef.current?.querySelectorAll('[role="button"]');
      if (pills) {
        const currentIndex = Array.from(pills).indexOf(e.target as Element);
        let nextIndex;
        if (e.key === 'ArrowRight') {
          nextIndex = currentIndex < pills.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : pills.length - 1;
        }
        (pills[nextIndex] as HTMLElement).focus();
      }
    }
  };

  const locationPills: { id: SelectedProvince | 'more', label: string, action: () => void }[] = [
    { id: 'all', label: 'ทั้งหมด', action: () => onProvinceChange('all') },
    { id: Province.ChiangMai, label: 'เชียงใหม่', action: () => onProvinceChange(Province.ChiangMai) },
    { id: Province.Bangkok, label: 'กทม.', action: () => onProvinceChange(Province.Bangkok) },
    // { id: 'more', label: '... เลือกจังหวัดอื่น', action: onOpenLocationModal } // Hidden for now - only Chiang Mai and Bangkok available
  ];

  return (
    <>
      <motion.form
        onSubmit={handleSubmit}
        className="universal-search-bar"
        role="search"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="relative">
          <label htmlFor="universal-search-input" className="sr-only">
            ค้นหางานและผู้ช่วย
          </label>
          <motion.input
            id="universal-search-input"
            type="search"
            value={query}
            onChange={handleInputChange}
            placeholder={animatedPlaceholder}
            className="universal-search-input w-full"
            disabled={isLoading}
            aria-label="ค้นหางานและผู้ช่วย"
            aria-describedby="search-help-text"
            autoComplete="off"
            whileFocus={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            onFocus={(e) => (e.target as HTMLInputElement).classList.add('glow-active')}
            onBlur={(e) => (e.target as HTMLInputElement).classList.remove('glow-active')}
            onMouseEnter={(e) => (e.target as HTMLInputElement).classList.add('glow-hover')}
            onMouseLeave={(e) => (e.target as HTMLInputElement).classList.remove('glow-hover')}
          />
          <div id="search-help-text" className="sr-only">
            พิมพ์คำค้นหาและกด Enter หรือคลิกปุ่มค้นหา
          </div>
          <button
            type="submit"
            className="search-button absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-blue-600 focus:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-md min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors duration-200 z-10"
            disabled={isLoading || !query.trim()}
            aria-label={isLoading ? "กำลังค้นหา..." : "ค้นหา"}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </motion.form>

      <motion.div
        ref={locationPillsRef}
        className="location-pills-container"
        role="group"
        aria-label="เลือกจังหวัด"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <motion.div
          className="flex flex-wrap gap-3 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          {locationPills.map((pill) => (
            <motion.button
              key={pill.id}
              onClick={pill.action}
              onKeyDown={(e) => handleLocationPillKeyDown(e, pill.action)}
              className="location-pill px-6 py-3 text-sm font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
              role="button"
              tabIndex={0}
              aria-pressed={selectedProvince === pill.id}
              aria-label={`เลือกจังหวัด ${pill.label}`}
              initial={false}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {pill.label}
            </motion.button>
          ))}
        </motion.div>
        <div className="sr-only" aria-live="polite">
          จังหวัดที่เลือก: {locationPills.find(p => p.id === selectedProvince)?.label || 'ทั้งหมด'}
        </div>
      </motion.div>
    </>
  );
};
