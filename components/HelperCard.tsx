

import React, { useState } from 'react';
import type { EnrichedHelperProfile, User } from '../types.ts';
import { View, Province, ACTIVITY_BADGE_DETAILS } from '../types.ts';
import { Modal } from './Modal.tsx';
import { Button } from './Button.tsx'; // Import Button
import { isDateInPast, calculateDaysRemaining } from '../App.tsx';
import { UserLevelBadge } from './UserLevelBadge.tsx';
import { motion, Transition } from 'framer-motion';

interface HelperCardProps {
  profile: EnrichedHelperProfile;
  onNavigateToPublicProfile: (profileInfo: { userId: string; helperProfileId?: string }) => void;
  navigateTo: (view: View, payload?: any) => void;
  onLogHelperContact: (helperProfileId: string) => void;
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
  onBumpProfile: (profileId: string) => void;
  onEditProfileFromFindView?: (profileId: string) => void; 
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onToggleInterest: (targetId: string, targetType: 'job' | 'helperProfile', targetOwnerId: string) => void; // New prop
  isInterested: boolean; // New prop
}

const FallbackAvatarDisplay: React.FC<{ name?: string, size?: string, className?: string }> = ({ name, size = "w-[80px] h-[80px]", className = "" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral-light flex items-center justify-center text-3xl font-sans text-primary-dark ${className}`}>
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
  if (!user && !profile.adminVerifiedExperience && !(profile.interestedCount && profile.interestedCount > 0)) return null;

  const badges = [];
  if (profile.adminVerifiedExperience) {
    badges.push(
      <span key="verified" className="helper-card-trust-badge">ยืนยันตัวตน</span>
    );
  }
  if (user?.profileComplete) {
     badges.push(
      <span key="complete" className="helper-card-trust-badge" style={{backgroundColor: 'var(--success-green)', color: 'color-mix(in srgb, var(--success-green) 40%, black)'}}>โปรไฟล์ครบ</span>
    );
  }
  if ((profile.interestedCount || 0) > 0) {
     badges.push(
       <span key="interested" className="helper-card-trust-badge" style={{backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)'}}>
        คนสนใจ {profile.interestedCount}
      </span>
    );
  }
   if (user?.activityBadge?.isActive) {
     badges.push(
       <span key="activity" className="helper-card-trust-badge" style={{backgroundColor: 'var(--primary-light)', color: 'var(--primary-dark)'}}>ขยันใช้เว็บ</span>
    );
  }
  if (profile.isSuspicious) {
     badges.push(
      <span key="suspicious" className="helper-card-trust-badge" style={{backgroundColor: 'var(--error-red)', color: 'color-mix(in srgb, var(--error-red) 40%, black)'}}>ระวัง</span>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div className="helper-card-trust-badges">
      {badges}
    </div>
  );
};


export const HelperCard: React.FC<HelperCardProps> = ({
    profile,
    onNavigateToPublicProfile,
    navigateTo,
    onLogHelperContact,
    currentUser,
    requestLoginForAction,
    onBumpProfile,
    onEditProfileFromFindView,
    getAuthorDisplayName,
    onToggleInterest,
    isInterested,
}) => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const userForBadges = profile.userId === currentUser?.id ? currentUser : undefined;
  const authorActualDisplayName = getAuthorDisplayName(profile.userId, profile.authorDisplayName);


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

  const handleInterestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
        requestLoginForAction(View.FindHelpers, { intent: 'interest', postId: profile.id });
        return;
    }
    onToggleInterest(profile.id, 'helperProfile', profile.userId);
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
    e.stopPropagation();
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
    if(profile.availability && availabilityParts.length === 0) availabilityParts.push(profile.availability);

    let combined = availabilityParts.join(', ');
    if (combined.length > 50) combined = combined.substring(0, 47) + "...";
    return combined || "ตามตกลง";
  };

  return (
    <>
      <motion.div
        className="helper-card-redesigned font-sans h-full"
        whileHover={{
          y: -5,
          transition: { duration: 0.2, ease: "easeOut" },
        }}
        initial={{ scale: 0.97, filter: 'brightness(0.95)' }}
        whileInView={{ scale: 1, filter: 'brightness(1)' }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.2 }}
      >
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
          <div className="helper-card-header-avatar-wrapper">
            {profile.userPhoto ? (
              <img
                src={profile.userPhoto}
                alt={authorActualDisplayName}
                className="helper-card-avatar"
                onClick={() => onNavigateToPublicProfile({ userId: profile.userId, helperProfileId: profile.id })}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <FallbackAvatarDisplay name={authorActualDisplayName} className="helper-card-avatar" />
            )}
            {profile.userPhoto && (
                <img src="" alt="" style={{display: 'none'}} onError={() => {
                    const avatarImg = document.querySelector(`.helper-card-avatar[src="${profile.userPhoto}"]`);
                    if (avatarImg && !avatarImg.nextElementSibling?.classList.contains('fallback-avatar-rendered')) {
                        const fallbackNode = document.createElement('div');
                        fallbackNode.className = 'helper-card-avatar fallback-avatar-rendered';
                        const initial = authorActualDisplayName ? authorActualDisplayName.charAt(0).toUpperCase() : '👤';
                        fallbackNode.innerHTML = `<div class="w-full h-full rounded-full bg-neutral-light flex items-center justify-center text-3xl font-sans text-primary-dark">${initial}</div>`;
                        avatarImg.parentNode?.insertBefore(fallbackNode, avatarImg.nextSibling);
                    }
                }} />
            )}
          </div>

          <div className="helper-card-header-content">
            <h4 className="helper-card-main-title" title={profile.profileTitle}>{profile.profileTitle}</h4>
            <div className="helper-card-name-container">
              <h3 
                className="helper-card-name text-sm" // Applied text-sm
                onClick={() => onNavigateToPublicProfile({ userId: profile.userId, helperProfileId: profile.id })}
              >
                {authorActualDisplayName}
                <span className="name-arrow">→</span>
              </h3>
            </div>
            <p className="helper-card-header-location">
              <span className="location-pin-emoji" role="img" aria-label="Location pin">📍</span>
              {profile.province || Province.ChiangMai}
            </p>
            {(profile.category || profile.subCategory) && (
              <div
                className="helper-card-header-categories-combined"
                title={profile.category && profile.subCategory ? `${profile.category} - ${profile.subCategory}` : profile.category || profile.subCategory}
              >
                {profile.category}
                {profile.category && profile.subCategory && <span className="category-separator">›</span>}
                {profile.subCategory}
              </div>
            )}
            <TrustBadgesCompact profile={profile} user={userForBadges || currentUser} />
          </div>
        </div>

        <div className="helper-card-info-grid">
          <div className="helper-card-info-item">
            <span className="info-icon" role="img" aria-label="Work area">🌐</span> {profile.area.length > 40 ? profile.area.substring(0,37) + "..." : profile.area}
          </div>
          <div className="helper-card-info-item">
            <span className="info-icon" role="img" aria-label="Availability">⏰</span> {getAvailabilityText()}
          </div>
        </div>

        <div className="helper-card-details-box">
          <h5 className="helper-card-details-title text-sm"> {/* Applied text-sm */}
            รายละเอียด
          </h5>
          <ul>
            <li className={`text-xs ${detailsNeedsTruncation && !showFullDetails && !(currentUser && !profileIsTrulyExpired) ? "details-line-clamp" : ""}`}> {/* Applied text-xs */}
              {displayDetails}
            </li>
          </ul>
          {detailsNeedsTruncation && !(currentUser && !profileIsTrulyExpired) && (
             <button
                onClick={toggleShowFullDetails}
                className="text-xs text-primary-dark hover:underline mt-1 font-medium"
                aria-expanded={showFullDetails}
              >
                {showFullDetails ? "แสดงน้อยลง" : "ดูเพิ่มเติม"}
              </button>
          )}
        </div>

        <div className="helper-card-footer mt-auto">
          <div className="helper-card-posted-time">
            {formattedPostedAt}
          </div>
          <div className="helper-card-action-buttons">
            {currentUser?.id !== profile.userId && (
                <Button
                    onClick={handleInterestClick}
                    variant={isInterested ? "primary" : "outline"}
                    colorScheme="primary"
                    size="sm"
                    disabled={profile.isUnavailable || profileIsTrulyExpired}
                    className="!px-2.5"
                >
                    {isInterested ? '⭐ สนใจแล้ว' : '⭐ สนใจ'}
                </Button>
            )}

            {onEditProfileFromFindView && currentUser?.id === profile.userId ? (
                 <Button
                    onClick={() => onEditProfileFromFindView(profile.id)}
                    variant="outline"
                    colorScheme="neutral"
                    size="sm"
                    disabled={profileIsTrulyExpired}
                >
                    ✏️ แก้ไข
                </Button>
            ) : (currentUser?.id === profile.userId) ? (
                 <Button
                    onClick={() => onBumpProfile(profile.id)}
                    variant="outline"
                    colorScheme="secondary"
                    size="sm"
                    disabled={!canBump}
                    title={canBump ? "Bump โปรไฟล์ของคุณขึ้นไปบนสุด" : `คุณสามารถ Bump โปรไฟล์นี้ได้อีก ${bumpDaysRemaining} วัน`}
                >
                    🚀 Bump {canBump ? '' : `(${bumpDaysRemaining}d)`}
                </Button>
            ) : (
                <Button
                  onClick={handleContact}
                  variant="primary"
                  size="sm"
                  disabled={profile.isUnavailable || profileIsTrulyExpired}
                >
                  {profile.isUnavailable ? '🚫 ไม่ว่าง' : profileIsTrulyExpired ? '⛔ หมดอายุ' : 'ติดต่อ'}
                </Button>
            )}
          </div>
        </div>
      </motion.div>

      {currentUser && !profileIsTrulyExpired && (
        <>
          <Modal isOpen={isWarningModalOpen} onClose={closeWarningModal} title="⚠️ โปรดระวังมิจฉาชีพ">
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-md my-2 text-neutral-dark font-serif">
              <p className="mb-2">โปรดใช้ความระมัดระวัง <strong className="font-bold text-red-700">ห้ามโอนเงินก่อนเริ่มงาน</strong> และควรนัดเจอในที่ปลอดภัย</p>
              <p>
                หาจ๊อบจ้าเป็นเพียงพื้นที่ให้คนเจอกัน โปรดใช้วิจารณญาณในการติดต่อ ฉบับเต็มโปรดอ่านที่หน้า{" "}
                <button
                  onClick={() => { closeWarningModal(); navigateTo(View.Safety); }}
                  className="font-serif font-normal underline text-neutral-dark hover:text-secondary"
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
            <div className="text-neutral-dark font-serif p-4 rounded-md">
              <p className="mb-4">กรุณาติดต่อผู้ช่วยโดยตรงตามข้อมูลด้านล่างเพื่อนัดหมาย หรือสอบถามรายละเอียดเพิ่มเติม</p>
              <div className="bg-neutral-light p-4 rounded-md border border-neutral-DEFAULT whitespace-pre-wrap font-sans">
                <p>{profile.contact}</p>
              </div>
              <Button onClick={closeContactModal} variant="primary" className="w-full mt-6">
                ปิดหน้าต่างนี้
              </Button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
};