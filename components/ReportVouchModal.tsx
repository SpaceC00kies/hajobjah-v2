import React, { useState, useEffect } from 'react';
import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';
import type { Vouch } from '../types/types.ts';
import { useUser } from '../hooks/useUser.ts';
import { useUsers } from '../hooks/useUsers.ts';

interface ReportVouchModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchToReport: Vouch;
  mode: 'report' | 'withdraw';
}

export const ReportVouchModal: React.FC<ReportVouchModalProps> = ({
  isOpen,
  onClose,
  vouchToReport,
  mode,
}) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { reportVouch } = useUser();
  const { users } = useUsers();

  useEffect(() => {
    if (isOpen) {
      setComment('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim().length > 500) {
      setError('เหตุผลต้องมีความยาวไม่เกิน 500 ตัวอักษร');
      return;
    }
    reportVouch(vouchToReport, comment);
    onClose();
  };

  if (!isOpen) return null;

  const voucheeUser = users.find(u => u.id === vouchToReport.voucheeId);
  const voucheeDisplayName = voucheeUser?.publicDisplayName || 'ผู้ใช้ไม่ทราบชื่อ';

  const isReportMode = mode === 'report';
  const title = isReportMode ? '🚩 รายงานการรับรอง' : '💬 ขอถอนการรับรอง';
  
  const reasonLabel = isReportMode
    ? "กรุณาระบุเหตุผลในการรายงาน (ไม่บังคับ)"
    : "กรุณาระบุเหตุผลที่ต้องการถอนการรับรอง (ไม่บังคับ)";
  
  const reasonPlaceholder = isReportMode
    ? "เช่น ไม่เคยรู้จักผู้ใช้นี้, เป็นการรับรองที่ไม่เป็นจริง, ใช้คำพูดไม่เหมาะสม..."
    : "เช่น รับรองผิดคน, ไม่ได้รู้จักผู้ใช้นี้แล้ว";
  
  const submitButtonText = isReportMode ? 'ส่งรายงาน' : 'ส่งคำขอ';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-neutral-light/60 rounded-lg border border-neutral-DEFAULT/40">
            {isReportMode ? (
              <>
                <p className="text-sm font-sans text-neutral-dark">
                    คุณกำลังจะรายงานการรับรองจาก: <strong className="font-semibold">@{vouchToReport.voucherDisplayName}</strong>
                </p>
                <p className="text-sm font-sans text-neutral-dark">
                    ที่ให้กับ: <strong className="font-semibold">@{voucheeDisplayName}</strong>
                </p>
              </>
            ) : (
                <p className="text-sm font-sans text-neutral-dark">
                    คุณกำลังจะขอถอนการรับรองที่คุณเคยให้กับ: <strong className="font-semibold">@{voucheeDisplayName}</strong>
                </p>
            )}
             {vouchToReport.comment && (
                <p className="mt-2 text-xs text-neutral-medium pl-2 border-l-2 border-neutral-DEFAULT">
                    ความคิดเห็นเดิม: "{vouchToReport.comment}"
                </p>
             )}
        </div>

        <div>
          <label htmlFor="reportComment" className="block text-sm font-sans font-medium text-neutral-dark mb-1">
            {reasonLabel}
          </label>
          <textarea
            id="reportComment"
            value={comment}
            onChange={(e) => {
                setComment(e.target.value);
                if (error) setError(null);
            }}
            rows={4}
            maxLength={500}
            placeholder={reasonPlaceholder}
            className={`w-full ${error ? 'input-error' : ''}`}
          />
          <div className="flex justify-between items-center">
            {error && <p className="text-red-500 font-sans text-xs mt-1">{error}</p>}
            <p className={`text-xs text-right w-full mt-1 ${comment.length > 500 ? 'text-red-500' : 'text-neutral-medium'}`}>
              {comment.length}/500
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" onClick={onClose} variant="outline" colorScheme="neutral">
            ยกเลิก
          </Button>
          <Button type="submit" variant="accent" className="bg-red-500 hover:bg-red-600 focus:ring-red-500">
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Modal>
  );
};