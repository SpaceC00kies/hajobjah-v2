
import React, { useState } from 'react';
import type { EnrichedHelperProfile, User } from '../types';
import { View, Province, ACTIVITY_BADGE_DETAILS } from '../types';
import { Modal } from './Modal';
import { Button } from './Button'; // Added import
import { isDateInPast, calculateDaysRemaining } from '../App';
import { UserLevelBadge } from './UserLevelBadge'; // Re-added for activity badge

interface HelperCardProps {
  profile: EnrichedHelperProfile;
  onNavigateToPublicProfile: (userId: string) => void;
  navigateTo: (view: View, payload?: any) => void;
  onLogHelperContact: (helperProfileId: string) => void;
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
  onBumpProfile: (profileId: string) => void;
}

const FallbackAvatarDisplay: React.FC<{ name?: string, size?: string, className?: string }> = ({ name, size = "w-[70px] h-[70px]", className = "" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral dark:bg-dark-inputBg flex items-center justify-center text-3xl font-sans text-white dark:text-dark-text ${className}`}>
      {initial}
    </div>
  );
};

const formatDateDisplay = (dateInput?: string | Date | null): string | null => {
  if (dateInput === null || dateInput === undefined) return null;
  let dateObject: Date;
  if (dateInput instanceof Date) dateObject = dateInput;
  else if (typeof dateInput === 'string') dateObject = new Date(dateInput);
  else if (typeof dateInput === 'object' && dateInput && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') dateObject = (dateInput as any).toDate();
  else return "Invalid date";
  if (isNaN(dateObject.getTime())) return null;
  return dateObject.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

const TrustBadgesCompact: React.FC<{ profile: EnrichedHelperProfile, user: User | undefined }> = ({ profile, user }) => {
  if (!user) return null;
  return (
    <div className="helper-card-trust-badges">
      {profile.adminVerifiedExperience && (
        <span className="helper-card-trust-badge bg-yellow-200 text-yellow-800 dark:bg-yellow-600/30 dark:text-yellow-200">⭐ ผ่านงาน</span>
      )}
      {user.profileComplete && (
        <span className="helper-card-trust-badge bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-200">🟢 โปรไฟล์ครบ</span>
      )}
      {(profile.interestedCount || 0) > 0 && (
         <span className="helper-card-trust-badge bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-200">
          👀 สนใจ {profile.interestedCount}
        </span>
      )}
       {user.activityBadge?.isActive && (
         <span className="helper-card-trust-badge bg-orange-100 text-orange-700 dark:bg-orange-600/30 dark:text-orange-200">🔥 ขยันใช้เว็บ</span>
      )}
      {profile.isSuspicious && (
        <span className="helper-card-trust-badge bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-200">🔺 ระวัง</span>
      )}
    </div>
  );
};


export const HelperCard: React.FC<HelperCardProps> = ({ profile, onNavigateToPublicProfile, navigateTo, onLogHelperContact, currentUser, requestLoginForAction, onBumpProfile }) => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  const userForBadges = profile.userId === currentUser?.id ? currentUser : undefined; // Simplified for badges, needs full user data if not current user

  const handleContact = () => {
    if (!currentUser) {
      requestLoginForAction(View.FindHelpers, { intent: 'contactHelper', postId: profile.id });
      return;
    }
    setIsWarningModalOpen(true);
  };

  const closeContactModal = () => setIsContactModalOpen(false);
  const closeWarningModal = () => setIsWarningModalOpen(false);

  const handleProceedToContact = () => {
    onLogHelperContact(profile.id);
    setIsWarningModalOpen(false);
    setIsContactModalOpen(true);
  };

  const postedAtDate = profile.postedAt ? (profile.postedAt instanceof Date ? profile.postedAt : new Date(profile.postedAt as string)) : null;
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateDisplay(postedAtDate) : "N/A";

  const profileIsTrulyExpired = profile.isExpired || (profile.expiresAt ? isDateInPast(profile.expiresAt) : false);
  const BUMP_COOLDOWN_DAYS_CARD = 30;
  const lastBumpDate = currentUser?.postingLimits?.lastBumpDates?.[profile.id] || profile.lastBumpedAt;
  const bumpDaysRemaining = lastBumpDate ? calculateDaysRemaining(new Date(new Date(lastBumpDate as string).getTime() + BUMP_COOLDOWN_DAYS_CARD * 24 * 60 * 60 * 1000)) : 0;
  const canBump = bumpDaysRemaining === 0 && !profileIsTrulyExpired && !profile.isUnavailable;

  const detailsNeedsTruncation = profile.details.length > 120;
  const displayDetails = showFullDetails || !detailsNeedsTruncation || (currentUser && !profileIsTrulyExpired) ? profile.details : `${profile.details.substring(0, 120)}...`;

  const toggleShowFullDetails = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click if "read more" is clicked
    if (!currentUser && (detailsNeedsTruncation || profileIsTrulyExpired)) {
      requestLoginForAction(View.FindHelpers, { focusOnPostId: profile.id, type: 'helper' });
    } else {
      setShowFullDetails(!showFullDetails);
    }
  };
  
  const getAvailabilityText = () => {
    const availabilityParts = [];
    if (profile.availabilityDateFrom && profile.availabilityDateTo) {
        availabilityParts.push(`${formatDateDisplay(profile.availabilityDateFrom)} - ${formatDateDisplay(profile.availabilityDateTo)}`);
    } else if (profile.availabilityDateFrom) {
        availabilityParts.push(`ตั้งแต่ ${formatDateDisplay(profile.availabilityDateFrom)}`);
    } else if (profile.availabilityDateTo) {
        availabilityParts.push(`ถึง ${formatDateDisplay(profile.availabilityDateTo)}`);
    }
    if(profile.availabilityTimeDetails) availabilityParts.push(profile.availabilityTimeDetails);
    if(profile.availability && availabilityParts.length === 0) availabilityParts.push(profile.availability); // Fallback to old availability
    
    let combined = availabilityParts.join(', ');
    if (combined.length > 50) combined = combined.substring(0, 47) + "...";
    return combined || "ตามตกลง";
  };

  return (
    <>
      <div className="helper-card-redesigned font-sans h-full">
        {profile.isPinned && (
          <div className="helper-card-status-banner status-banner-pinned">📌 ปักหมุดโดยแอดมิน</div>
        )}
        {profile.isUnavailable && !profileIsTrulyExpired && (
          <div className="helper-card-status-banner status-banner-unavailable">🚫 ไม่ว่างแล้ว</div>
        )}
        {profileIsTrulyExpired && (
          <div className="helper-card-status-banner status-banner-expired">⛔ หมดอายุแล้ว</div>
        )}
        {profile.isSuspicious && !profile.isPinned && (
          <div className="helper-card-status-banner status-banner-suspicious">🔺 โปรไฟล์นี้อาจถูกระงับ</div>
        )}

        <div className="helper-card-header">
          <img
            src={profile.userPhoto || ''}
            alt={profile.authorDisplayName}
            className="helper-card-avatar"
            onClick={() => onNavigateToPublicProfile(profile.userId)}
            onError={(e) => (e.currentTarget.style.display = 'none')} // Hide img if error
          />
          {!profile.userPhoto && <FallbackAvatarDisplay name={profile.authorDisplayName} className="helper-card-avatar" />}

          <h3 className="helper-card-name" onClick={() => onNavigateToPublicProfile(profile.userId)}>
            {profile.authorDisplayName}
            <span className="name-arrow">→</span>
          </h3>
          <p className="helper-card-header-location">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.145l.005-.002.007-.003.017-.006a6.093 6.093 0 00.271-.137l.002-.001.018-.008.004-.002a6.535 6.535 0 00.257-.141l.007-.004.002-.001.015-.007a6.833 6.833 0 00.247-.143l.002-.001a7.261 7.261 0 00.42-.263l.003-.002.003-.002a7.26 7.26 0 00.222-.138l.003-.002.002-.001.005-.003.002-.001a7.52 7.52 0 00.204-.131l.003-.002.002-.001.002-.001a8.056 8.056 0 00.352-.256l.003-.002.002-.001.003-.002a8.058 8.058 0 00.191-.137l.002-.001.002-.001.002-.001.002-.001.002-.001.002-.001a8.806 8.806 0 00.16-.116l.002-.001.002-.001a9.116 9.116 0 00.151-.111l.002-.001a9.84 9.84 0 00.284-.223l.002-.002.002-.001.003-.002a11.53 11.53 0 00.38-.322l.002-.002.002-.002.002-.002a12.068 12.068 0 00.33-.314l.002-.002.002-.002C10 2.5 5.5 7.5 5.5 11.438 5.5 15.094 7.434 18 10 18s4.5-2.906 4.5-6.562c0-2.332-1.556-4.643-2.25-5.654A.75.75 0 0012 6.06v-.003Z" clipRule="evenodd" />
              <path d="M10 12.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z" />
            </svg>
            {profile.province || Province.ChiangMai}
          </p>
          <h4 className="helper-card-main-title" title={profile.profileTitle}>{profile.profileTitle}</h4>
          {profile.category && <p className="helper-card-subtitle">{profile.category}</p>}
          <TrustBadgesCompact profile={profile} user={userForBadges || currentUser /* fallback to current user if specific user not found for badges */} />
        </div>

        { (profile.subCategory || profile.category) &&
          <div className="helper-card-categories">
            {profile.category && <span className="helper-card-category-pill">{profile.category}</span>}
            {profile.subCategory && <span className="helper-card-category-pill">{profile.subCategory}</span>}
          </div>
        }
        
        <div className="helper-card-info-grid">
          <div className="helper-card-info-item">
            <span className="info-icon">🏠</span> จังหวัด: {profile.province || Province.ChiangMai}
          </div>
          <div className="helper-card-info-item">
            <span className="info-icon">🌐</span> พื้นที่: {profile.area.length > 25 ? profile.area.substring(0,22) + "..." : profile.area}
          </div>
          <div className="helper-card-info-item">
            <span className="info-icon">⏰</span> ความพร้อม: {getAvailabilityText()}
          </div>
          <div className="helper-card-info-item">
            <span className="info-icon">👥</span> สนใจ: {profile.interestedCount || 0} คน
          </div>
        </div>

        <div className="helper-card-details-box">
          <h5 className="helper-card-details-title">
            <span className="details-icon">📝</span>เกี่ยวกับฉัน / รายละเอียดงาน
          </h5>
          <ul>
            <li className={detailsNeedsTruncation && !showFullDetails && !(currentUser && !profileIsTrulyExpired) ? "details-line-clamp" : ""}>
              {displayDetails}
            </li>
          </ul>
          {detailsNeedsTruncation && !(currentUser && !profileIsTrulyExpired) && (
             <button
                onClick={toggleShowFullDetails}
                className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline mt-1 font-medium"
                aria-expanded={showFullDetails}
              >
                {showFullDetails ? "แสดงน้อยลง" : "ดูเพิ่มเติม"}
              </button>
          )}
        </div>
        
        <div className="helper-card-footer mt-auto"> {/* Ensure footer is at bottom if card has fixed height */}
          <div className="helper-card-posted-time">
            <span className="time-icon">🕒</span> โพสต์: {formattedPostedAt}
          </div>
          <div className="helper-card-action-buttons">
            {currentUser?.id === profile.userId && !profile.isUnavailable && !profileIsTrulyExpired && (
              <button
                onClick={() => onBumpProfile(profile.id)}
                className="helper-card-button helper-card-button-secondary"
                disabled={!canBump}
                title={canBump ? "Bump โปรไฟล์ของคุณขึ้นไปบนสุด" : `คุณสามารถ Bump โปรไฟล์นี้ได้อีก ${bumpDaysRemaining} วัน`}
              >
                🚀 Bump {canBump ? '' : `(${bumpDaysRemaining}d)`}
              </button>
            )}
            <button
              onClick={handleContact}
              className="helper-card-button helper-card-button-primary"
              disabled={profile.isUnavailable || profileIsTrulyExpired || currentUser?.id === profile.userId}
            >
              {profile.isUnavailable ? '🚫 ไม่ว่าง' : profileIsTrulyExpired ? '⛔ หมดอายุ' : (currentUser?.id === profile.userId ? '👤 โปรไฟล์คุณ' : 'ติดต่อ')}
            </button>
          </div>
        </div>
      </div>

      {currentUser && !profileIsTrulyExpired && (
        <>
          <Modal isOpen={isWarningModalOpen} onClose={closeWarningModal} title="⚠️ โปรดระวังมิจฉาชีพ">
            <div className="bg-amber-50 dark:bg-amber-700/20 border border-amber-300 dark:border-amber-600/40 p-4 rounded-md my-2 text-neutral-dark dark:text-dark-textMuted font-serif">
              <p className="mb-2">โปรดใช้ความระมัดระวัง <strong className="font-bold text-red-700 dark:text-red-400">ห้ามโอนเงินก่อนเจอตัว</strong> และควรนัดเจอในที่ปลอดภัย</p>
              <p>
                หาจ๊อบจ้าเป็นเพียงพื้นที่ให้คนเจอกัน โปรดใช้วิจารณญาณในการติดต่อ ฉบับเต็มโปรดอ่านที่หน้า{" "}
                <button
                  onClick={() => { closeWarningModal(); navigateTo(View.Safety); }}
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
