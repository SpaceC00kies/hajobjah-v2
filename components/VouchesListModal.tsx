import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';
import type { User, Vouch } from '../types/types.ts';
import { VOUCH_TYPE_LABELS } from '../types/types.ts';
import { getVouchesForUserService } from '../services/userService.ts';
import { logFirebaseError } from '../firebase/logging.ts';

interface VouchesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToList: User;
  navigateToPublicProfile: (userId: string) => void;
  onReportVouch: (vouch: Vouch, mode: 'report' | 'withdraw') => void;
  currentUser: User | null;
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  const modalDescription = `รายการการรับรองทั้งหมดสำหรับผู้ใช้ @${userToList.publicDisplayName}`;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`⭐ การรับรองสำหรับ @${userToList.publicDisplayName}`}
      description={modalDescription}
      initialFocusRef={closeButtonRef}
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2" role="list" aria-label="รายการการรับรอง">
        {isLoading && (
          <p className="text-center text-neutral-medium" role="status" aria-live="polite">
            กำลังโหลดข้อมูลการรับรอง...
          </p>
        )}
        {error && (
          <p className="text-center text-red-500" role="alert">
            {error}
          </p>
        )}
        {!isLoading && !error && vouches.length === 0 && (
          <p className="text-center text-neutral-medium" role="status">
            ยังไม่มีข้อมูลการรับรองสำหรับผู้ใช้นี้
          </p>
        )}
        {!isLoading && vouches.length > 0 && (
          vouches.map((vouch, index) => {
            const isOwnVouch = currentUser && currentUser.id === vouch.voucherId;
            const reportMode = isOwnVouch ? 'withdraw' : 'report';
            const reportButtonText = isOwnVouch ? 'ขอถอน' : 'Report';
            const reportButtonIcon = isOwnVouch ? '💬' : '🚩';
            const reportButtonTitle = isOwnVouch ? 'ขอถอนการรับรองนี้' : 'รายงานการรับรองนี้';
            
            return (
              <div 
                key={vouch.id} 
                className="p-3 bg-neutral-light/50 rounded-lg border border-neutral-DEFAULT/30"
                role="listitem"
                aria-label={`การรับรองจาก ${vouch.voucherDisplayName}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <button
                      onClick={() => navigateToPublicProfile(vouch.voucherId)}
                      className="text-sm font-semibold text-neutral-dark hover:underline focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 rounded"
                      type="button"
                      aria-describedby={`vouch-type-${index}`}
                    >
                      @{vouch.voucherDisplayName}
                    </button>
                    <span 
                      id={`vouch-type-${index}`}
                      className="block text-xs font-medium text-blue-600"
                    >
                      {VOUCH_TYPE_LABELS[vouch.vouchType]}
                    </span>
                  </div>
                  {currentUser && (
                     <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReportVouch(vouch, reportMode);
                      }}
                      className="text-xs text-neutral-medium hover:text-red-500 p-1 rounded-full flex items-center gap-1 focus:ring-2 focus:ring-primary/50 focus:ring-offset-1"
                      title={reportButtonTitle}
                      aria-label={reportButtonTitle}
                      type="button"
                    >
                      <span className="text-base" aria-hidden="true">{reportButtonIcon}</span>
                      <span className="hidden sm:inline">{reportButtonText}</span>
                    </button>
                  )}
                </div>
                {vouch.comment && (
                  <blockquote className="mt-2 text-sm text-neutral-dark pl-2 border-l-2 border-neutral-DEFAULT">
                    "{vouch.comment}"
                  </blockquote>
                )}
              </div>
            );
          })
        )}
      </div>
       <div className="text-center mt-6">
          <Button 
            ref={closeButtonRef}
            onClick={onClose} 
            variant="outline" 
            colorScheme="neutral" 
            size="md"
            type="button"
          >
            ปิด
          </Button>
        </div>
    </Modal>
  );
};