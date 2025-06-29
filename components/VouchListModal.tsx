import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import type { User, Vouch } from '../types';
import { VOUCH_TYPE_LABELS } from '../types';
import { getVouchesForUserService } from '../services/firebaseService';
import { logFirebaseError } from '../firebase/logging';

interface VouchesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToList: User;
  navigateToPublicProfile: (userId: string) => void;
}

export const VouchesListModal: React.FC<VouchesListModalProps> = ({
  isOpen,
  onClose,
  userToList,
  navigateToPublicProfile,
}) => {
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setVouches([]);
      getVouchesForUserService(userToList.id)
        .then(fetchedVouches => {
          setVouches(fetchedVouches);
        })
        .catch(err => {
          logFirebaseError("VouchesListModal.getVouches", err);
          setError("ไม่สามารถโหลดข้อมูลการรับรองได้");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, userToList.id]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`⭐ การรับรองสำหรับ @${userToList.publicDisplayName}`}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {isLoading && <p className="text-center text-neutral-medium">กำลังโหลด...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}
        {!isLoading && !error && vouches.length === 0 && (
          <p className="text-center text-neutral-medium">ยังไม่มีข้อมูลการรับรอง</p>
        )}
        {!isLoading && vouches.length > 0 && (
          vouches.map(vouch => (
            <div key={vouch.id} className="p-3 bg-neutral-light/50 rounded-lg border border-neutral-DEFAULT/30">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateToPublicProfile(vouch.voucherId)}
                  className="text-sm font-semibold text-neutral-dark hover:underline"
                >
                  @{vouch.voucherDisplayName}
                </button>
                <span className="text-xs font-medium text-white px-2 py-0.5 rounded-full bg-blue-400">
                  {VOUCH_TYPE_LABELS[vouch.vouchType]}
                </span>
              </div>
              {vouch.comment && (
                <p className="mt-2 text-sm text-neutral-dark pl-2 border-l-2 border-neutral-DEFAULT">
                  "{vouch.comment}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
       <div className="text-center mt-6">
          <Button onClick={onClose} variant="outline" colorScheme="neutral" size="md">
            ปิด
          </Button>
        </div>
    </Modal>
  );
};