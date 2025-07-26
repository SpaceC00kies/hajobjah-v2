import React, { useState } from 'react';
import { Province } from '../types/types.ts';

type SelectedProvince = 'all' | Province.ChiangMai | Province.Bangkok;

interface UniversalSearchBarProps {
  onSearch: (searchParams: { query: string, province: string }) => void;
  isLoading: boolean;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  onOpenLocationModal: () => void;
}

export const UniversalSearchBar: React.FC<UniversalSearchBarProps> = ({ onSearch, isLoading, selectedProvince, onProvinceChange, onOpenLocationModal }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch({ query: query.trim(), province: selectedProvince });
    }
  };

  const locationPills: { id: SelectedProvince | 'more', label: string, action: () => void }[] = [
    { id: 'all', label: 'ทั้งหมด', action: () => onProvinceChange('all') },
    { id: Province.ChiangMai, label: '📍 เชียงใหม่', action: () => onProvinceChange(Province.ChiangMai) },
    { id: Province.Bangkok, label: '📍 กรุงเทพมหานคร', action: () => onProvinceChange(Province.Bangkok) },
    { id: 'more', label: '... เลือกจังหวัดอื่น', action: onOpenLocationModal }
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
            onClick={pill.action}
            className={`location-pill ${selectedProvince === pill.id ? 'active' : ''}`}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </>
  );
};