



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
  const [isInputFocused, setIsInputFocused] = useState(false); // Renamed for clarity
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showRecentSearches = isInputFocused && searchTerm.trim() === '' && recentSearches.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label htmlFor="main-search-input" className="sr-only">{ariaLabel}</label>
      <input
        id="main-search-input"
        type="search"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        onFocus={() => setIsInputFocused(true)}
        onBlur={() => setIsInputFocused(false)} // Handle blur to hide underline
        placeholder={placeholder}
        className="w-full p-3 bg-white border border-primary-light rounded-lg text-primary-dark placeholder-neutral-medium text-base font-sans transition-colors duration-150 ease-in-out focus:outline-none focus:bg-white" // Removed focus:ring styles
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{
          scaleX: isInputFocused ? 1 : 0,
          opacity: isInputFocused ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeOut" as const }}
      />
      {showRecentSearches && (
        <ul
          className="absolute z-10 w-full mt-1 bg-white border border-primary-light rounded-md shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
          aria-label="Recent searches"
        >
          {recentSearches.map((recentTerm, index) => (
            <li
              key={`${recentTerm}-${index}`}
              onClick={() => {
                onRecentSearchSelect(recentTerm);
                setIsInputFocused(false); 
              }}
              className="px-4 py-2 text-sm text-neutral-dark hover:bg-primary-light cursor-pointer font-sans"
              role="option"
              aria-selected="false"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onRecentSearchSelect(recentTerm);
                  setIsInputFocused(false);
                }
              }}
            >
              🕒 {recentTerm}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};