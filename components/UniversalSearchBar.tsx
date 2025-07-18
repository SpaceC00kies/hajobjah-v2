import React, { useState } from 'react';
import { Province } from '../types/types.ts';

type SelectedProvince = 'all' | Province.ChiangMai | Province.Bangkok;

interface UniversalSearchBarProps {
  onSearch: (searchParams: { query: string, province: string }) => void;
  isLoading: boolean;
}

export const UniversalSearchBar: React.FC<UniversalSearchBarProps> = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<SelectedProvince>('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch({ query: query.trim(), province: selectedProvince });
    }
  };

  const locationPills: { id: SelectedProvince, label: string }[] = [
    { id: 'all', label: 'ทั้งหมด' },
    { id: Province.ChiangMai, label: '📍 เชียงใหม่' },
    { id: Province.Bangkok, label: '📍 กรุงเทพมหานคร' }
  ];

  return (
    <>
      <form onSubmit={handleSubmit} className="universal-search-bar">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="หาผู้ช่วยทำความสะอาด, งานเสิร์ฟใกล้ฉัน..."
          className="universal-search-input"
          disabled={isLoading}
          aria-label="ค้นหางานและผู้ช่วย"
        />
        <button
          type="submit"
          className="universal-search-button"
          disabled={isLoading || !query.trim()}
          aria-label="ค้นหา"
        >
          {isLoading ? (
            <div className="loader"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </form>
      <div className="location-pills-container">
        {locationPills.map(pill => (
          <button
            key={pill.id}
            onClick={() => setSelectedProvince(pill.id)}
            className={`location-pill ${selectedProvince === pill.id ? 'active' : ''}`}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </>
  );
};