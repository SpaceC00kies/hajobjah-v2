import React, { useEffect, useRef } from 'react';
import { Button } from './Button.tsx';
import { Modal } from './Modal.tsx';
import { useNavigate } from 'react-router-dom';


interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const navigate = useNavigate();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  
  const handleActualConfirm = () => {
    onConfirm();
    // Parent will typically close the modal by setting isOpen to false
  };

  const modalDescription = "กรุณายืนยันการดำเนินการนี้ การกระทำนี้ไม่สามารถยกเลิกได้";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={modalDescription}
      initialFocusRef={confirmButtonRef}
    >
      <div role="alertdialog" aria-describedby="confirm-modal-message">
        <p id="confirm-modal-message" className="font-serif text-base text-neutral-dark mb-6 whitespace-pre-wrap">
          {message.includes("โปรดอ่านเพื่อความปลอดภัย") ? (
            <>
              <span className="font-sans font-semibold text-lg flex items-center gap-2 mb-2">
                <span>⚠️</span>
                <span>โปรดระวังมิจฉาชีพ</span>
              </span>
              <br/>
              กรุณาใช้ความระมัดระวังในการติดต่อ ควรมีการตกลงเรื่องเงินที่ชัดเจนและควรนัดเจอในที่ปลอดภัย หาจ๊อบจ้าเป็นเพียงพื้นที่ให้คนเจอกัน โปรดใช้วิจารณญาณในการติดต่อ ฉบับเต็มโปรดอ่านที่หน้า{" "}
              <button
                onClick={() => { onClose(); navigate('/safety'); }}
                className="font-serif font-normal underline text-neutral-dark hover:text-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1"
                type="button"
              >
                "โปรดอ่านเพื่อความปลอดภัย"
              </button>
            </>
          ) : (
            message
          )}
        </p>
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <Button 
            onClick={onClose} 
            variant="outline" 
            colorScheme="neutral" 
            size="md" 
            className="w-full sm:w-auto"
            type="button"
          >
            ยกเลิก
          </Button>
          <Button 
            ref={confirmButtonRef}
            onClick={handleActualConfirm} 
            size="md"
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2"
            type="button"
          >
            <span className="flex items-center justify-center gap-1.5">
              <span>🗑️</span>
              <span>ยืนยัน</span>
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};