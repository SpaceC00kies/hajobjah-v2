"use client";

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
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
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