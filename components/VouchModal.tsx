"use client";
import React, { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import type { User, VouchType } from '../types/types';
import { VOUCH_TYPE_LABELS } from '../types/types';
import { useUser } from '../hooks/useUser';

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
  currentUser
}) => {
  const [selectedVouchType, setSelectedVouchType] = useState<VouchType | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { vouchForUser } = useUser();

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`👍 รับรองคุณ @${userToVouch.publicDisplayName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-sans font-medium text-neutral-dark mb-2">
            คุณรู้จักผู้ใช้นี้ในความสัมพันธ์แบบใด? <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {Object.entries(VOUCH_TYPE_LABELS).map(([key, label]) => (
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
                  className="form-radio h-4 w-4 text-primary border-neutral-DEFAULT focus:ring-primary"
                />
                <span className="text-sm font-sans text-neutral-dark">{label}</span>
              </label>
            ))}
          </div>
          {error && <p className="text-red-500 font-sans text-xs mt-1">{error}</p>}
        </div>

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
            className="w-full"
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