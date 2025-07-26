
import React from 'react';
import { UniversalSearchBar } from './UniversalSearchBar.tsx';
import { View } from '../types/types.ts';

interface HomePageProps {
  onSearch: (searchParams: { query: string; province: string }) => void;
  isSearching: boolean;
  selectedProvince: string;
  onProvinceChange: (province: string) => void;
  onOpenLocationModal: () => void;
  navigateTo: (view: View) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSearch,
  isSearching,
  selectedProvince,
  onProvinceChange,
  onOpenLocationModal,
  navigateTo,
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="container mx-auto flex flex-col items-center px-6 text-center py-12 sm:py-20">
        <h1 className="hero-title">✨ หาจ๊อบจ้า ✨</h1>
        <p className="hero-subtitle">แพลตฟอร์มที่อยู่เคียงข้างคนขยัน</p>

        <UniversalSearchBar
          onSearch={onSearch}
          isLoading={isSearching}
          selectedProvince={selectedProvince}
          onProvinceChange={onProvinceChange}
          onOpenLocationModal={onOpenLocationModal}
        />

        <div className="flex items-center space-x-6 mt-4">
          <button onClick={() => navigateTo(View.FindJobs)} className="secondary-browse-link">
            ดูประกาศงานทั้งหมด
          </button>
          <span className="text-neutral-medium">|</span>
          <button onClick={() => navigateTo(View.FindHelpers)} className="secondary-browse-link">
            ดูโปรไฟล์ทั้งหมด
          </button>
        </div>
      </div>
    </div>
  );
};
