"use client";

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { useAuthActions } from '@/hooks/useAuthActions';
import { ConfirmModal } from './ConfirmModal';
import { FeedbackForm } from './FeedbackForm';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { VouchModal } from './VouchModal';
import { VouchesListModal } from './VouchesListModal';
import { ReportVouchModal } from './ReportVouchModal';
import { LocationModal } from './LocationModal';
import { motion, AnimatePresence } from "framer-motion";

export const GlobalModals: React.FC = () => {
    const router = useRouter();
    const { 
        isConfirmModalOpen,
        closeConfirmModal,
        onConfirmAction,
        confirmModalTitle,
        confirmModalMessage,
        isFeedbackModalOpen,
        setIsFeedbackModalOpen,
        isForgotPasswordModalOpen,
        setIsForgotPasswordModalOpen,
        isLocationModalOpen,
        setIsLocationModalOpen,
        vouchModalData,
        setVouchModalData,
        vouchListModalData,
        setVouchListModalData,
        reportVouchModalData,
        setReportVouchModalData
    } = useData();
    
    const { currentUser } = useAuth();
    const authActions = useAuthActions();

    const [copiedLinkNotification, setCopiedLinkNotification] = React.useState<string | null>(null);
    const copiedNotificationTimerRef = useRef<number | null>(null);

    const onConfirmDeletion = () => {
        if (onConfirmAction) onConfirmAction();
        closeConfirmModal();
    };

    const handleNavigateToPublicProfile = (userId: string) => {
        router.push(`/profile/${userId}`);
    };
    
    const handleReportVouch = (vouch: any) => {
        setVouchListModalData(null); // Close the list modal first
        setReportVouchModalData({ vouchToReport: vouch });
    };

    return (
        <>
            <AnimatePresence>
                {copiedLinkNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-primary-dark text-white text-sm py-2 px-4 rounded-full shadow-lg z-50"
                    >
                        {copiedLinkNotification}
                    </motion.div>
                )}
            </AnimatePresence>
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={closeConfirmModal}
                onConfirm={onConfirmDeletion}
                title={confirmModalTitle}
                message={confirmModalMessage}
            />
            <FeedbackForm
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                currentUserEmail={currentUser?.email}
            />
            <ForgotPasswordModal
                isOpen={isForgotPasswordModalOpen}
                onClose={() => setIsForgotPasswordModalOpen(false)}
                onSendResetEmail={authActions.sendPasswordResetEmail}
            />
            {vouchModalData && (
                <VouchModal
                    isOpen={!!vouchModalData}
                    onClose={() => setVouchModalData(null)}
                    userToVouch={vouchModalData.userToVouch}
                    currentUser={currentUser!}
                />
            )}
            {vouchListModalData && (
                <VouchesListModal
                    isOpen={!!vouchListModalData}
                    onClose={() => setVouchListModalData(null)}
                    userToList={vouchListModalData.userToList}
                    navigateToPublicProfile={handleNavigateToPublicProfile}
                    onReportVouch={handleReportVouch}
                    currentUser={currentUser}
                />
            )}
            {reportVouchModalData && (
                <ReportVouchModal
                    isOpen={!!reportVouchModalData}
                    onClose={() => setReportVouchModalData(null)}
                    vouchToReport={reportVouchModalData.vouchToReport}
                />
            )}
            <LocationModal
                isOpen={isLocationModalOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSelectProvince={(province) => { /* State is managed in HomePageClient now */ }}
                currentProvince={""} // This will need to be wired up differently
            />
        </>
    );
};
