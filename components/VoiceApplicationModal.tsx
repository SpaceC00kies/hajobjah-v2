import React, { useState } from 'react';
import type { Job, User } from '../types/types.ts';
import { VoiceRecordingModal } from './VoiceRecordingModal.tsx';
import { addJobApplicationService } from '../services/applicationService.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface VoiceApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    job: Job;
}

export const VoiceApplicationModal: React.FC<VoiceApplicationModalProps> = ({ isOpen, onClose, job }) => {
    const { currentUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (audioBlob: Blob) => {
        if (!currentUser) {
            setError("You must be logged in to apply.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            await addJobApplicationService(job, currentUser, audioBlob);
            alert("สมัครงานด้วยเสียงสำเร็จ!");
            onClose();
        } catch (err: any) {
            console.error("Failed to submit voice application:", err);
            setError(err.message || "เกิดข้อผิดพลาดในการส่งใบสมัคร");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isSubmitting) {
        return (
             <VoiceRecordingModal
                isOpen={isOpen}
                onClose={onClose}
                onSave={() => {}}
                title="กำลังส่งใบสมัคร..."
            />
        )
    }
    
    if (error) {
         return (
             <VoiceRecordingModal
                isOpen={isOpen}
                onClose={onClose}
                onSave={() => {}}
                title={`เกิดข้อผิดพลาด: ${error}`}
            />
        )
    }

    return (
        <VoiceRecordingModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSave}
            title="สมัครงานนี้ด้วยเสียง"
        />
    );
};