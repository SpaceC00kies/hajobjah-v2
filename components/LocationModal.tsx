import React, { useState, useMemo } from 'react';
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

  const filteredProvinces = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase().trim();
    if (!lowercasedTerm) {
      return PROVINCES_BY_REGION;
    }

    const filtered: Record<string, string[]> = {};
    for (const region in PROVINCES_BY_REGION) {
      const matchingProvinces = (PROVINCES_BY_REGION as any)[region].filter((province: string) =>
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="เลือกจังหวัด">
      <div className="location-modal-content">
        <div className="location-modal-search">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาจังหวัด..."
            className="location-modal-search-input"
            autoFocus
          />
        </div>
        <div className="location-modal-list">
          {Object.keys(filteredProvinces).length === 0 && searchTerm ? (
            <p className="text-center text-neutral-medium p-4">ไม่พบจังหวัดที่ค้นหา</p>
          ) : (
            Object.entries(filteredProvinces).map(([region, provinces]) => (
              <div key={region}>
                <h3 className="location-modal-region-title">{region}</h3>
                {provinces.map((province) => (
                  <div
                    key={province}
                    onClick={() => handleSelect(province)}
                    className={`location-modal-province-item ${currentProvince === province ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => e.key === 'Enter' && handleSelect(province)}
                  >
                    {province}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};