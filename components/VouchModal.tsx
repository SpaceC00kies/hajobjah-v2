import React, { useState, useRef } from 'react';
import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';
import type { User, VouchType } from '../types/types';
import { VOUCH_TYPE_LABELS } from '../types/types';
import { useUser } from '../hooks/useUser.ts';

interface VouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToVouch: User;
  currentUser: User;
}

export const VouchModal: React.FC<VouchModalProps> = ({
  isOpen,
  onClose,
  userToVouch,
  currentUser: _currentUser
}) => {
  const [selectedVouchType, setSelectedVouchType] = useState<VouchType | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { vouchForUser } = useUser();
  const firstRadioRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVouchType) {
      setError('กรุณาเลือกประเภทความสัมพันธ์');
      return;
    }
    vouchForUser(userToVouch.id, selectedVouchType, comment);
    onClose();
  };

  if (!isOpen) return null;

  const modalDescription = `กรอกข้อมูลเพื่อรับรองผู้ใช้ @${userToVouch.publicDisplayName}`;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`👍 รับรองคุณ @${userToVouch.publicDisplayName}`}
      description={modalDescription}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset>
          <legend className="block text-sm font-sans font-medium text-neutral-dark mb-2">
            มีความสัมพันธ์แบบไหน? <span className="text-red-500" aria-label="จำเป็น">*</span>
          </legend>
          <div className="space-y-2" role="radiogroup" aria-required="true" aria-invalid={error ? 'true' : 'false'}>
            {Object.entries(VOUCH_TYPE_LABELS).map(([key, label], index) => (
              <label key={key} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-neutral-light/50">
                <input
                  type="radio"
                  name="vouchType"
                  value={key}
                  checked={selectedVouchType === key}
                  onChange={() => {
                    setSelectedVouchType(key as VouchType);
                    setError(null);
                  }}
                  className="form-radio h-4 w-4 text-primary border-neutral-DEFAULT focus:ring-2 focus:ring-primary/50 focus:ring-offset-1"
                  aria-describedby={error ? 'vouch-type-error' : undefined}
                />
                <span className="text-sm font-sans text-neutral-dark">{label}</span>
              </label>
            ))}
          </div>
          {error && (
            <p id="vouch-type-error" className="text-red-500 font-sans text-xs mt-1" role="alert">
              {error}
            </p>
          )}
        </fieldset>

        <div>
          <label htmlFor="vouchComment" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            เพิ่มความคิดเห็น (ถ้ามี)
          </label>
          <textarea
            id="vouchComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="เช่น 'ทำงานด้วยแล้วประทับใจมากครับ', 'เป็นเพื่อนบ้านที่ดี ช่วยเหลือตลอด'"
            className="w-full border border-neutral-DEFAULT rounded-md px-3 py-2 focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:border-primary"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" onClick={onClose} variant="outline" colorScheme="neutral">
            ยกเลิก
          </Button>
          <Button type="submit" variant="primary">
            ยืนยันการรับรอง
          </Button>
        </div>
      </form>
    </Modal>
  );
};