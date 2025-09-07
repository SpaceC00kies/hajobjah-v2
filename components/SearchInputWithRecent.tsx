
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface SearchInputWithRecentProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  placeholder: string;
  recentSearches: string[];
  onRecentSearchSelect: (term: string) => void;
  ariaLabel?: string;
}

export const SearchInputWithRecent: React.FC<SearchInputWithRecentProps> = ({
  searchTerm,
  onSearchTermChange,
  placeholder,
  recentSearches,
  onRecentSearchSelect,
  ariaLabel = "Search",
}) => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showRecentSearches = isInputFocused && searchTerm.trim() === '' && recentSearches.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsInputFocused(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Enhanced keyboard navigation for recent searches
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showRecentSearches) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < recentSearches.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < recentSearches.length) {
          onRecentSearchSelect(recentSearches[selectedIndex]);
          setIsInputFocused(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setIsInputFocused(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleRecentSearchSelect = (term: string) => {
    onRecentSearchSelect(term);
    setIsInputFocused(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label htmlFor="main-search-input" className="sr-only">{ariaLabel}</label>
      <input
        ref={inputRef}
        id="main-search-input"
        type="search"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        onFocus={() => {
          setIsInputFocused(true);
          setSelectedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={showRecentSearches}
        aria-haspopup="listbox"
        aria-controls={showRecentSearches ? "recent-searches-listbox" : undefined}
        aria-activedescendant={
          selectedIndex >= 0 ? `recent-search-${selectedIndex}` : undefined
        }
        autoComplete="off"
        className="form-input"
      />
      {showRecentSearches && (
        <motion.ul
          id="recent-searches-listbox"
          className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
          aria-label="การค้นหาล่าสุด"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {recentSearches.map((recentTerm, index) => (
            <li
              key={`${recentTerm}-${index}`}
              id={`recent-search-${index}`}
              onClick={() => handleRecentSearchSelect(recentTerm)}
              className={`
                px-4 py-3 text-sm cursor-pointer font-sans transition-colors min-h-[44px] flex items-center
                ${selectedIndex === index 
                  ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
              role="option"
              aria-selected={selectedIndex === index}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseLeave={() => setSelectedIndex(-1)}
            >
              <span className="mr-2 text-gray-400" aria-hidden="true">🕒</span>
              <span>{recentTerm}</span>
              {selectedIndex === index && (
                <span className="sr-only">กด Enter เพื่อเลือก</span>
              )}
            </li>
          ))}
          <li className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
            ใช้ลูกศรขึ้น/ลง เพื่อเลือก, Enter เพื่อค้นหา, Esc เพื่อปิด
          </li>
        </motion.ul>
      )}
    </div>
  );
};
