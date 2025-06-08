
import React, { useState } from 'react';
import type { EnrichedHelperProfile, User } from '../types';
import { GenderOption, HelperEducationLevelOption, View, JobCategory, JOB_CATEGORY_STYLES } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { isDateInPast, calculateDaysRemaining } from '../App'; // Import utilities

interface HelperCardProps {
  profile: EnrichedHelperProfile;
  onNavigateToPublicProfile: (userId: string) => void;
  navigateTo: (view: View) => void;
  onLogHelperContact: (helperProfileId: string) => void;
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
  onBumpProfile: (profileId: string) => void; 
}

const FallbackAvatarDisplay: React.FC<{ name?: string, size?: string, className?: string }> = ({ name, size = "w-16 h-16", className = "" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral dark:bg-dark-inputBg flex items-center justify-center text-2xl font-sans text-white dark:text-dark-text ${className}`}>
      {initial}
    </div>
  );
};

const calculateAge = (birthdateString?: string): number | null => {
  if (!birthdateString) return null;
  const birthDate = new Date(birthdateString);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  if (birthDate > today) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const formatDateDisplay = (dateInput?: string | Date | null): string | null => {
  if (dateInput === null || dateInput === undefined) {
    return null;
  }

  let dateObject: Date;
  if (dateInput instanceof Date) {
    dateObject = dateInput;
  } else if (typeof dateInput === 'string') {
    dateObject = new Date(dateInput);
  } else {
    if (typeof dateInput === 'object' && dateInput && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') {
      dateObject = (dateInput as any).toDate();
    } else {
      console.warn("formatDateDisplay received unexpected dateInput type:", dateInput);
      return "Invalid date input";
    }
  }

  if (isNaN(dateObject.getTime())) {
    return null;
  }

  try {
    return dateObject.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return null;
  }
};

const TrustBadgesDisplay: React.FC<{ profile: EnrichedHelperProfile }> = ({ profile }) => {
  return (
    <div className="flex gap-1 flex-wrap my-2 font-sans justify-start">
      {profile.verifiedExperienceBadge && (
        <span className="bg-yellow-200 text-yellow-800 dark:bg-yellow-600/30 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full font-medium">⭐ ผ่านงานมาก่อน</span>
      )}
      {profile.profileCompleteBadge && (
        <span className="bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-200 text-xs px-2 py-0.5 rounded-full font-medium">🟢 โปรไฟล์ครบถ้วน</span>
      )}
      {(profile.interestedCount || 0) > 0 && (
         <span className="bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-200 text-xs px-2 py-0.5 rounded-full font-medium">
          👀 มีผู้สนใจแล้ว {profile.interestedCount} ครั้ง
        </span>
      )}
      {profile.warningBadge && (
        <span className="bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-200 text-xs px-2 py-0.5 rounded-full font-medium">🔺 ระวังผู้ใช้นี้</span>
      )}
    </div>
  );
};


export const HelperCard: React.FC<HelperCardProps> = ({ profile, onNavigateToPublicProfile, navigateTo, onLogHelperContact, currentUser, requestLoginForAction, onBumpProfile }) => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  const handleContact = () => {
    setIsWarningModalOpen(true);
  };

  const closeContactModal = () => {
    setIsContactModalOpen(false);
  };

  const closeWarningModal = () => {
    setIsWarningModalOpen(false);
  };

  const handleProceedToContact = () => {
    onLogHelperContact(profile.id);
    setIsWarningModalOpen(false);
    setIsContactModalOpen(true);
  };

  const age = calculateAge(profile.birthdate);
  const availabilityDateFromText = formatDateDisplay(profile.availabilityDateFrom);
  const availabilityDateToText = formatDateDisplay(profile.availabilityDateTo);

  const postedAtDate = profile.postedAt ? (profile.postedAt instanceof Date ? profile.postedAt : new Date(profile.postedAt as string)) : null;
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateDisplay(postedAtDate) : "Processing date...";

  const profileIsTrulyExpired = profile.isExpired || (profile.expiresAt ? isDateInPast(profile.expiresAt) : false);
  const BUMP_COOLDOWN_DAYS_CARD = 30;
  const lastBumpDate = currentUser?.postingLimits?.lastBumpDates?.[profile.id] || profile.lastBumpedAt;
  const bumpDaysRemaining = lastBumpDate ? calculateDaysRemaining(new Date(new Date(lastBumpDate as string).getTime() + BUMP_COOLDOWN_DAYS_CARD * 24 * 60 * 60 * 1000)) : 0;
  const canBump = bumpDaysRemaining === 0 && !profileIsTrulyExpired && !profile.isUnavailable;


  let availabilityDateDisplay = '';
  if (availabilityDateFromText && availabilityDateToText) {
    availabilityDateDisplay = `${availabilityDateFromText} - ${availabilityDateToText}`;
  } else if (availabilityDateFromText) {
    availabilityDateDisplay = `ตั้งแต่ ${availabilityDateFromText}`;
  } else if (availabilityDateToText) {
    availabilityDateDisplay = `ถึง ${availabilityDateToText}`;
  }

  const shortAddress = profile.userAddress ? profile.userAddress.split(',')[0] : null;
  const detailsPreview = profile.details.substring(0, 150);
  const categoryStyle = profile.category ? JOB_CATEGORY_STYLES[profile.category] : JOB_CATEGORY_STYLES[JobCategory.ShortTermMisc];


  return (
    <>
      <div className="bg-white dark:bg-dark-cardBg shadow-lg rounded-xl p-6 mb-6 border border-neutral-DEFAULT dark:border-dark-border hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
        {profile.isPinned && (
           <div className="mb-3 p-2 bg-yellow-100 dark:bg-dark-secondary-DEFAULT/30 border border-yellow-300 dark:border-dark-secondary-DEFAULT/50 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-yellow-700 dark:text-dark-secondary-hover">
              📌 ปักหมุดโดยแอดมิน
            </p>
          </div>
        )}
         {profile.isUnavailable && !profileIsTrulyExpired && (
           <div className="mb-3 p-2 bg-red-100 dark:bg-red-700/30 border border-red-300 dark:border-red-500/50 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-red-700 dark:text-red-300">
              🚫 ผู้ช่วยคนนี้ไม่ว่างแล้ว
            </p>
          </div>
        )}
         {profileIsTrulyExpired && (
          <div className="mb-3 p-2 bg-red-200 dark:bg-red-700/40 border border-red-400 dark:border-red-600/60 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-red-800 dark:text-red-200">
              ⛔ หมดอายุแล้ว
            </p>
          </div>
        )}
        {profile.isSuspicious && !profile.warningBadge && ( 
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-700/30 border border-red-300 dark:border-red-500/50 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-red-700 dark:text-red-300">
              ⚠️ โปรไฟล์นี้น่าสงสัย โปรดใช้ความระมัดระวังเป็นพิเศษ
            </p>
          </div>
        )}

        <div className="flex items-start mb-1">
          {profile.userPhoto ? (
            <img src={profile.userPhoto} alt={profile.authorDisplayName} className="w-16 h-16 rounded-full object-cover mr-4 shadow" />
          ) : (
            <FallbackAvatarDisplay name={profile.authorDisplayName} className="mr-4 shadow" />
          )}
          <div className="flex-1">
            <h3 className="text-2xl font-sans font-semibold text-secondary-hover dark:text-dark-secondary-hover">{profile.profileTitle}</h3>
            <p className="text-sm font-sans text-neutral-medium dark:text-dark-textMuted">โดย: {profile.authorDisplayName}</p>
          </div>
        </div>

        <div className="my-1">
          <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full inline-block ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border ? `border ${categoryStyle.border}`: ''}`}>
            {profile.category}
          </span>
        </div>
        {profile.subCategory && (
          <p className="text-xs font-serif text-neutral-medium dark:text-dark-textMuted mb-2 ml-1">
            └ {profile.subCategory}
          </p>
        )}

        <TrustBadgesDisplay profile={profile} />

        <div className="space-y-1.5 text-neutral-dark dark:text-dark-textMuted mb-4 flex-grow font-normal">
          {profile.gender && profile.gender !== GenderOption.NotSpecified && (
            <p className="font-serif flex items-center"><span className="mr-2 text-lg">👤</span><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text mr-1">เพศ:</strong> {profile.gender}</p>
          )}
          {age !== null && (
            <p className="font-serif flex items-center"><span className="mr-2 text-lg">🎂</span><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text mr-1">อายุ:</strong> {age} ปี</p>
          )}
          {profile.educationLevel && profile.educationLevel !== HelperEducationLevelOption.NotStated && (
            <p className="font-serif flex items-center"><span className="mr-2 text-lg">🎓</span><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text mr-1">ระดับการศึกษา:</strong> {profile.educationLevel}</p>
          )}
          <p className="font-serif flex items-center"><span className="mr-2 text-lg">📍</span><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text mr-1">พื้นที่สะดวก:</strong> {profile.area}{shortAddress && `, ${shortAddress}`}</p>

          {availabilityDateDisplay && (
             <p className="font-serif flex items-center"><span className="mr-2 text-lg">🗓️</span><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text mr-1">ช่วงวันที่สะดวก:</strong> {availabilityDateDisplay}</p>
          )}
          {profile.availabilityTimeDetails && (
             <p className="font-serif flex items-center"><span className="mr-2 text-lg">⏰</span><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text mr-1">เวลาที่สะดวก (เพิ่มเติม):</strong> {profile.availabilityTimeDetails}</p>
          )}
          {profile.availability && (!availabilityDateDisplay || !profile.availabilityTimeDetails) && (
            <p className="font-serif flex items-center"><span className="mr-2 text-lg">🕒</span><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text mr-1">วันเวลาที่ว่าง (หมายเหตุ):</strong> {profile.availability}</p>
          )}


           <div className="mt-2 pt-2 border-t border-neutral-DEFAULT/20 dark:border-dark-border/20">
            <strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📝 เกี่ยวกับฉัน:</strong>
            <div className="mt-1 text-sm font-serif bg-neutral-light dark:bg-dark-inputBg dark:text-dark-text p-3 rounded-md whitespace-pre-wrap h-32 overflow-y-auto font-normal border border-neutral-DEFAULT/50 dark:border-dark-border/50">
                {(!currentUser || profileIsTrulyExpired) && profile.details.length > 150 ? (
                    <>
                    {detailsPreview}...
                    <button
                        onClick={() => requestLoginForAction(View.FindHelpers, { focusOnPostId: profile.id, type: 'helper' })}
                        className="text-secondary dark:text-dark-secondary-DEFAULT text-sm underline ml-1 font-sans"
                        aria-label="เข้าสู่ระบบเพื่อดูรายละเอียดผู้ช่วยเพิ่มเติม"
                    >
                        เข้าสู่ระบบเพื่อดูเพิ่มเติม
                    </button>
                    </>
                ) : (
                    profile.details || 'ไม่มีรายละเอียดเพิ่มเติม'
                )}
            </div>
          </div>

          {formattedPostedAt && (
            <p className="text-xs font-sans sm:text-sm text-neutral-medium dark:text-dark-textMuted mt-1 pt-2 border-t border-neutral-DEFAULT/30 dark:border-dark-border/20">
              🕒 โพสต์เมื่อ: {formattedPostedAt}
            </p>
          )}
        </div>
        
        <div className="mt-auto flex flex-col sm:flex-row gap-3">
            <Button
                onClick={() => onNavigateToPublicProfile(profile.userId)}
                variant="outline"
                colorScheme="secondary"
                size="md"
                className="w-full sm:w-1/2"
                disabled={profile.isUnavailable || profileIsTrulyExpired}
                aria-label={`ดูโปรไฟล์เต็มของ ${profile.authorDisplayName}`}
            >
                โปรไฟล์
            </Button>
             <Button
                onClick={currentUser ? handleContact : () => requestLoginForAction(View.FindHelpers, { intent: 'contactHelper', postId: profile.id })}
                variant="secondary"
                size="md"
                className="w-full sm:flex-grow"
                disabled={profile.isUnavailable || profileIsTrulyExpired}
            >
                {profile.isUnavailable ? '🚫 ผู้ช่วยนี้ไม่ว่าง' : profileIsTrulyExpired ? '⛔ หมดอายุแล้ว' : (currentUser ? '📨 ติดต่อผู้ช่วย' : 'เข้าสู่ระบบเพื่อติดต่อ')}
            </Button>
        </div>
        {currentUser?.id === profile.userId && !profile.isUnavailable && !profileIsTrulyExpired && (
            <Button
                onClick={() => onBumpProfile(profile.id)}
                variant="outline"
                colorScheme="primary"
                size="sm"
                className="w-full mt-3"
                disabled={!canBump}
                title={canBump ? "Bump โปรไฟล์ของคุณขึ้นไปบนสุด" : `คุณสามารถ Bump โปรไฟล์นี้ได้อีก ${bumpDaysRemaining} วัน`}
            >
                🚀 Bump โปรไฟล์ {canBump ? '(พร้อมใช้งาน)' : `(รออีก ${bumpDaysRemaining} วัน)`}
            </Button>
        )}
      </div>

      {currentUser && !profileIsTrulyExpired && (
        <>
            <Modal isOpen={isWarningModalOpen} onClose={closeWarningModal} title="⚠️ โปรดระวังมิจฉาชีพ">
            <div className="bg-amber-50 dark:bg-amber-700/20 border border-amber-300 dark:border-amber-600/40 p-4 rounded-md my-2 text-neutral-dark dark:text-dark-textMuted font-serif">
                <p className="mb-2">โปรดใช้ความระมัดระวัง <strong className="font-bold text-red-700 dark:text-red-400">ห้ามโอนเงินก่อนเจอตัว</strong> และควรนัดเจอในที่ปลอดภัย</p>
                <p>
                หาจ๊อบจ้าเป็นเพียงพื้นที่ให้คนเจอกัน โปรดใช้วิจารณญาณในการติดต่อ ฉบับเต็มโปรดอ่านที่หน้า{" "}
                <button
                    onClick={() => {
                    closeWarningModal();
                    navigateTo(View.Safety);
                    }}
                    className="font-serif font-normal underline text-neutral-dark dark:text-dark-textMuted hover:text-secondary dark:hover:text-dark-secondary-DEFAULT"
                >
                    "โปรดอ่านเพื่อความปลอดภัย"
                </button>
                </p>
            </div>
            <Button onClick={handleProceedToContact} variant="accent" className="w-full mt-4">
                เข้าใจแล้ว ดำเนินการต่อ
            </Button>
            </Modal>

            <Modal isOpen={isContactModalOpen} onClose={closeContactModal} title="ขอบคุณที่สนใจติดต่อผู้ช่วย">
            <div className="text-neutral-dark dark:text-dark-textMuted font-serif p-4 rounded-md">
                <p className="mb-4">กรุณาติดต่อผู้ช่วยโดยตรงตามข้อมูลด้านล่างเพื่อนัดหมาย หรือสอบถามรายละเอียดเพิ่มเติม</p>
                <div className="bg-neutral-light dark:bg-dark-inputBg p-4 rounded-md border border-neutral-DEFAULT dark:border-dark-border whitespace-pre-wrap font-sans">
                <p>{profile.contact}</p>
                </div>
                 <p className="text-xs text-neutral-medium dark:text-dark-textMuted mt-4 text-center">
                    (การคลิก "ดำเนินการต่อ" ในหน้าก่อนหน้านี้ ได้บันทึกการติดต่อของคุณแล้ว เพื่อให้ผู้ช่วยทราบว่ามีคนสนใจ)
                </p>
                <Button onClick={closeContactModal} variant="secondary" className="w-full mt-6">
                ปิดหน้าต่างนี้
                </Button>
            </div>
            </Modal>
        </>
      )}
    </>
  );
};
