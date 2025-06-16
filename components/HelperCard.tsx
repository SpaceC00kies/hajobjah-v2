
import React, { useState } from 'react';
import type { EnrichedHelperProfile, User } from '../types';
import { View, Province, ACTIVITY_BADGE_DETAILS } from '../types';
import { Modal } from './Modal';
import { Button } from './Button'; 
import { isDateInPast, calculateDaysRemaining } from '../App';
import { UserLevelBadge } from './UserLevelBadge'; 

interface HelperCardProps {
  profile: EnrichedHelperProfile;
  onNavigateToPublicProfile: (userId: string) => void;
  navigateTo: (view: View, payload?: any) => void;
  onLogHelperContact: (helperProfileId: string) => void;
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
  onBumpProfile: (profileId: string) => void;
}

const FallbackAvatarDisplay: React.FC<{ name?: string, className?: string }> = ({ name, className = "" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  // Size is now controlled by the .helper-card-avatar class
  return (
    <div className={`rounded-full bg-neutral dark:bg-dark-inputBg flex items-center justify-center text-3xl font-sans text-white dark:text-dark-text ${className}`}>
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

const TrustBadgesCompact: React.FC<{ profile: EnrichedHelperProfile, user: User | undefined | null }> = ({ profile, user }) => {
  if (!user && !profile.adminVerifiedExperience && (profile.interestedCount || 0) === 0 && !profile.isSuspicious) return null;
  
  // Determine if user-specific badges should be shown (e.g., profile complete, activity badge)
  const showUserSpecificBadges = !!user;

  return (
    <div className="helper-card-trust-badges">
      {profile.adminVerifiedExperience && (
        <span className="helper-card-trust-badge bg-yellow-200 text-yellow-800 dark:bg-yellow-600/30 dark:text-yellow-200">⭐ ผ่านงาน</span>
      )}
      {showUserSpecificBadges && user?.profileComplete && (
        <span className="helper-card-trust-badge bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-200">🟢 โปรไฟล์ครบ</span>
      )}
      {(profile.interestedCount || 0) > 0 && (
         <span className="helper-card-trust-badge bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-200">
          👀 สนใจ {profile.interestedCount}
        </span>
      )}
       {showUserSpecificBadges && user?.activityBadge?.isActive && (
         <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm"/>
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
  
  const userForBadges = users.find(u => u.id === profile.userId); // Get user from global list for badges

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
  // Show full details if user is logged in OR if not truncated OR if editing.
  // For public view, if truncated, it will show "..." and a login prompt.
  const shouldShowFullDetails = showFullDetails || !detailsNeedsTruncation || (currentUser && !profileIsTrulyExpired);
  const displayDetails = shouldShowFullDetails ? profile.details : `${profile.details.substring(0, 120)}...`;


  const toggleShowFullDetails = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!currentUser && detailsNeedsTruncation && !profileIsTrulyExpired) { // Only request login if details are truncated and user is not logged in
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
    if(profile.availability && availabilityParts.length === 0) availabilityParts.push(profile.availability);
    
    let combined = availabilityParts.join(', ');
    if (combined.length > 50) combined = combined.substring(0, 47) + "...";
    return combined || "ตามตกลง";
  };

  const categoryDisplayString = profile.category + (profile.subCategory ? ` - ${profile.subCategory}` : '');

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
          <div className="helper-card-identity-block">
            {profile.userPhoto ? (
              <img
                src={profile.userPhoto}
                alt={profile.authorDisplayName}
                className="helper-card-avatar"
                onClick={() => onNavigateToPublicProfile(profile.userId)}
                onError={(e) => {
                    // Simple fallback: hide broken image, browser will show alt text or nothing
                    e.currentTarget.style.display = 'none';
                    // Create and append a fallback element if it doesn't exist
                    if (!e.currentTarget.nextElementSibling?.classList.contains('js-fallback-avatar')) {
                        const fallbackDiv = document.createElement('div');
                        const initial = profile.authorDisplayName ? profile.authorDisplayName.charAt(0).toUpperCase() : '👤';
                        fallbackDiv.className = 'helper-card-avatar js-fallback-avatar flex items-center justify-center text-3xl font-sans text-white dark:text-dark-text bg-neutral dark:bg-dark-inputBg';
                        fallbackDiv.textContent = initial;
                        e.currentTarget.parentNode?.insertBefore(fallbackDiv, e.currentTarget.nextSibling);
                    }
                }}
              />
            ) : (
              <FallbackAvatarDisplay name={profile.authorDisplayName} className="helper-card-avatar js-fallback-avatar" />
            )}
            <div className="helper-card-name-location-group">
              <h3 className="helper-card-name" onClick={() => onNavigateToPublicProfile(profile.userId)}>
                {profile.authorDisplayName}
                <span className="name-arrow" aria-hidden="true">→</span>
              </h3>
              <p className="helper-card-header-location">
                <span className="location-pin-emoji" role="img" aria-label="Location pin">📍</span>
                {profile.province || Province.ChiangMai}
              </p>
            </div>
          </div>

          {categoryDisplayString && (
            <div className="helper-card-header-category" title={categoryDisplayString}>
              {categoryDisplayString}
            </div>
          )}

          <h4 className="helper-card-main-title" title={profile.profileTitle}>{profile.profileTitle}</h4>
          <TrustBadgesCompact profile={profile} user={userForBadges} />
        </div>
        
        <div className="helper-card-info-grid">
          <div className="helper-card-info-item">
            <span className="info-icon" role="img" aria-label="Work area">🌐</span> {profile.area.length > 30 ? profile.area.substring(0,27) + "..." : profile.area}
          </div>
          <div className="helper-card-info-item">
            <span className="info-icon" role="img" aria-label="Availability">⏰</span> {getAvailabilityText()}
          </div>
        </div>

        <div className="helper-card-details-box">
          <h5 className="helper-card-details-title">
            เกี่ยวกับฉัน / รายละเอียดงาน
          </h5>
          <ul>
            <li className={!shouldShowFullDetails ? "details-line-clamp" : ""}>
              {displayDetails}
            </li>
          </ul>
          {detailsNeedsTruncation && (
             <button
                onClick={toggleShowFullDetails}
                className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline mt-1 font-medium"
                aria-expanded={showFullDetails}
              >
                {showFullDetails ? "แสดงน้อยลง" : (!currentUser ? "เข้าสู่ระบบเพื่อดูเพิ่มเติม" : "ดูเพิ่มเติม")}
              </button>
          )}
        </div>
        
        <div className="helper-card-footer mt-auto">
          <div className="helper-card-posted-time">
            {formattedPostedAt}
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
