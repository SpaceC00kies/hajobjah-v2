// components/PublicProfilePageClient.tsx
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import type { User, HelperProfile } from '../types/types.ts'; 
import { VOUCH_TYPE_LABELS, VouchType, ACTIVITY_BADGE_DETAILS } from '../types/types.ts'; 
import { Button } from './Button.tsx';
import { UserLevelBadge } from './UserLevelBadge.tsx';
import { useAuth } from '@/context/AuthContext.tsx';
import { useData } from '@/context/DataContext.tsx';

interface PublicProfilePageClientProps {
  user: User; 
  helperProfile?: HelperProfile; 
}

const FallbackAvatarPublic: React.FC<{ name?: string, size?: string }> = ({ name, size = "w-24 h-24" }) => {
    const initial = name ? name.charAt(0).toUpperCase() : '👤';
    return (
        <div className={`${size} rounded-full bg-neutral-light flex items-center justify-center text-5xl font-sans text-primary-dark shadow-md`}>
            {initial}
        </div>
    );
};

export const PublicProfilePageClient: React.FC<PublicProfilePageClientProps> = ({ user, helperProfile }) => {
    const router = useRouter();
    const { currentUser } = useAuth();
    const { setVouchModalData, setVouchListModalData } = useData();
    
    const onBack = () => router.back();
    const onVouchForUser = (userToVouch: User) => setVouchModalData({ userToVouch });
    const onShowVouches = (userToList: User) => setVouchListModalData({ userToList });

    const vouches = user.vouchInfo || { total: 0, worked_together: 0, colleague: 0, community: 0, personal: 0 };
    const vouchEntries = Object.entries(vouches).filter(([key]) => key !== 'total' && (vouches as any)[key] > 0);

    return (
        <div className="container mx-auto p-4 sm:p-6 max-w-3xl my-8">
            <Button onClick={onBack} variant="outline" colorScheme="neutral" size="sm" className="mb-4">
                &larr; กลับ
            </Button>
            <div className="bg-white shadow-xl rounded-xl p-6 sm:p-8 md:p-10 border border-neutral-DEFAULT">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
                    {user.photo ? (
                        <img src={user.photo} alt={user.publicDisplayName} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-lg border-4 border-white" />
                    ) : (
                        <FallbackAvatarPublic name={user.publicDisplayName} size="w-24 h-24 sm:w-32 sm:h-32" />
                    )}
                    <div className="flex-1">
                        <h2 className="text-2xl sm:text-3xl font-sans font-bold text-neutral-dark flex items-center justify-center sm:justify-start">
                            {user.publicDisplayName}
                        </h2>
                        <p className="text-sm text-neutral-medium font-sans">@{user.username}</p>
                        <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                             {user.userLevel && <UserLevelBadge level={user.userLevel} size="md" />}
                             {user.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="md" />}
                        </div>
                    </div>
                </div>

                {user.introSentence && (
                    <div className="mt-6 p-4 bg-primary-light/40 rounded-lg text-center">
                        <p className="font-serif text-lg italic text-primary-dark">"{user.introSentence}"</p>
                    </div>
                )}
                
                {helperProfile && (
                     <div className="mt-6 pt-6 border-t border-neutral-DEFAULT">
                        <h3 className="text-xl font-sans font-semibold text-neutral-dark mb-3">โปรไฟล์ผู้ช่วย: {helperProfile.profileTitle}</h3>
                        <div className="space-y-2 font-serif text-sm text-neutral-dark">
                            <p><strong className="font-sans">หมวดหมู่:</strong> {helperProfile.category} {helperProfile.subCategory && `> ${helperProfile.subCategory}`}</p>
                            <p><strong className="font-sans">พื้นที่:</strong> {helperProfile.area}, {helperProfile.province}</p>
                            <p className="whitespace-pre-wrap"><strong className="font-sans">รายละเอียด:</strong> {helperProfile.details}</p>
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-neutral-DEFAULT">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <h3 className="text-xl font-sans font-semibold text-neutral-dark">⭐ การรับรอง ({vouches.total})</h3>
                        <div className="flex gap-2">
                            <Button onClick={() => onShowVouches(user)} variant="outline" colorScheme="neutral" size="sm">ดูทั้งหมด</Button>
                            {currentUser && currentUser.id !== user.id && (
                                <Button onClick={() => onVouchForUser(user)} variant="primary" size="sm">👍 รับรอง</Button>
                            )}
                        </div>
                    </div>
                     <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        {vouchEntries.length > 0 ? vouchEntries.map(([key, value]) => (
                            <div key={key} className="bg-neutral-light/50 p-2 rounded-md">
                                <p className="text-lg font-sans font-bold text-primary-dark">{value as number}</p>
                                <p className="text-xs font-sans text-neutral-medium">{VOUCH_TYPE_LABELS[key as VouchType]}</p>
                            </div>
                        )) : (
                            <p className="col-span-full text-center text-sm font-serif text-neutral-medium py-4">ยังไม่มีการรับรอง</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
