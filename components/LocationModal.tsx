import React, { useState, useMemo, useRef } from 'react';
import { Modal } from './Modal.tsx';
import { PROVINCES_BY_REGION } from '../utils/provinceData.ts';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvince: (province: string) => void;
  currentProvince: string;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onSelectProvince,
  currentProvince,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProvinces = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase().trim();
    if (!lowercasedTerm) {
      return PROVINCES_BY_REGION;
    }

    const filtered: Record<string, string[]> = {};
    for (const region in PROVINCES_BY_REGION) {
      const matchingProvinces = PROVINCES_BY_REGION[region].filter((province: string) =>
        province.toLowerCase().includes(lowercasedTerm)
      );
      if (matchingProvinces.length > 0) {
        filtered[region] = matchingProvinces;
      }
    }
    return filtered;
  }, [searchTerm]);

  const handleSelect = (province: string) => {
    onSelectProvince(province);
    onClose();
  };

  const modalDescription = "ค้นหาและเลือกจังหวัดที่คุณต้องการ";

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="เลือกจังหวัด"
      description={modalDescription}
      initialFocusRef={searchInputRef}
    >
      <div className="location-modal-content">
        <div className="location-modal-search">
          <label htmlFor="province-search" className="sr-only">
            ค้นหาจังหวัด
          </label>
          <input
            ref={searchInputRef}
            id="province-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาจังหวัด..."
            className="location-modal-search-input w-full focus:ring-2 focus:ring-primary/50 focus:ring-offset-1"
            aria-describedby="search-help"
          />
          <p id="search-help" className="text-xs text-neutral-dark mt-1">
            พิมพ์ชื่อจังหวัดเพื่อค้นหา
          </p>
        </div>
        <div className="location-modal-list" role="listbox" aria-label="รายการจังหวัด">
          {Object.keys(filteredProvinces).length === 0 && searchTerm ? (
            <p className="text-center text-neutral-medium p-4" role="status">
              ไม่พบจังหวัดที่ค้นหา "{searchTerm}"
            </p>
          ) : (
            Object.entries(filteredProvinces).map(([region, provinces]) => (
              <div key={region} role="group" aria-labelledby={`region-${region}`}>
                <h3 id={`region-${region}`} className="location-modal-region-title">
                  {region}
                </h3>
                {provinces.map((province) => (
                  <button
                    key={province}
                    onClick={() => handleSelect(province)}
                    className={`location-modal-province-item w-full text-left focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 ${
                      currentProvince === province ? 'active bg-primary/10 font-semibold' : ''
                    }`}
                    role="option"
                    aria-selected={currentProvince === province}
                    type="button"
                  >
                    {province}
                    {currentProvince === province && (
                      <span className="ml-2" aria-label="เลือกอยู่">✓</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};