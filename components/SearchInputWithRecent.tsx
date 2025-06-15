
import React, { useState, useEffect, useRef } from 'react';

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
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const showRecentSearches = isFocused && searchTerm.trim() === '' && recentSearches.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
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
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        className="w-full p-3 bg-white dark:bg-dark-inputBg border border-neutral-DEFAULT dark:border-dark-border rounded-lg text-neutral-dark dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-neutral-dark dark:focus:ring-dark-text placeholder-neutral-medium dark:placeholder-dark-textMuted text-base font-serif transition-colors duration-150 ease-in-out focus:bg-gray-50 dark:focus:bg-[#383838]"
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {showRecentSearches && (
        <ul
          className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-cardBg border border-neutral-DEFAULT dark:border-dark-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
          aria-label="Recent searches"
        >
          {recentSearches.map((recentTerm, index) => (
            <li
              key={`${recentTerm}-${index}`}
              onClick={() => {
                onRecentSearchSelect(recentTerm);
                setIsFocused(false); 
              }}
              className="px-4 py-2 text-sm text-neutral-dark dark:text-dark-text hover:bg-neutral-light dark:hover:bg-dark-inputBg cursor-pointer font-serif"
              role="option"
              aria-selected="false"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onRecentSearchSelect(recentTerm);
                  setIsFocused(false);
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
