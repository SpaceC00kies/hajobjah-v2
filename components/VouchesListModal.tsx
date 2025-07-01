
import React, { useState, useEffect } from 'react';
import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';
import type { User, Vouch } from '../types.ts';
import { VOUCH_TYPE_LABELS } from '../types.ts';
import { getVouchesForUserService } from '../services/firebaseService.ts';
import { logFirebaseError } from '../firebase/logging.ts';

interface VouchesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToList: User;
  navigateToPublicProfile: (userId: string) => void;
  onReportVouch: (vouch: Vouch) => void; // New prop for reporting
  currentUser: User | null; // New prop to check login status
}

export const VouchesListModal: React.FC<VouchesListModalProps> = ({
  isOpen,
  onClose,
  userToList,
  navigateToPublicProfile,
  onReportVouch,
  currentUser,
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

  const handleReportClick = (e: React.MouseEvent, vouch: Vouch) => {
    e.stopPropagation();
    onReportVouch(vouch);
  };

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
              <div className="flex items-start justify-between">
                <div>
                  <button
                    onClick={() => navigateToPublicProfile(vouch.voucherId)}
                    className="text-sm font-semibold text-neutral-dark hover:underline"
                  >
                    @{vouch.voucherDisplayName}
                  </button>
                  <span className="block text-xs font-medium text-blue-600">
                    {VOUCH_TYPE_LABELS[vouch.vouchType]}
                  </span>
                </div>
                {currentUser && (
                   <button
                    onClick={(e) => handleReportClick(e, vouch)}
                    className="text-xs text-neutral-medium hover:text-red-500 p-1 rounded-full flex items-center gap-1"
                    title="รายงานการรับรองนี้"
                  >
                    <span className="text-base">🚩</span>
                    <span className="hidden sm:inline">Report</span>
                  </button>
                )}
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
