
import React, { useState } from 'react';
import type { EnrichedHelperProfile, User } from '../types/types.ts';
import { Province, UserRole } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isDateInPast, calculateDaysRemaining } from '../utils/dateUtils.ts';
import { useLocation, useNavigate } from 'react-router-dom';

interface HelperCardProps {
  profile: EnrichedHelperProfile;
  currentUser: User | null;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onToggleInterest: () => void;
  isInterested: boolean;
}

const StarIcon = ({ filled = false, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-5 h-5 ${className}`}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

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
      <span key="verified" className="helper-card-trust-badge" style={{backgroundColor: 'var(--success-green)', color: 'color-mix(in srgb, var(--success-green) 40%, black)'}}>✅ ยืนยันตัวตน</span>
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


export const HelperCard: React.FC<HelperCardProps> = React.memo(({
    profile,
    currentUser,
    getAuthorDisplayName,
    onToggleInterest,
    isInterested,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [localIsInterested, setLocalIsInterested] = useState(isInterested);
  const [localInterestedCount, setLocalInterestedCount] = useState(profile.interestedCount || 0);

  const userForBadges = profile.userId === currentUser?.id ? currentUser : undefined;
  const authorActualDisplayName = getAuthorDisplayName(profile.userId, profile.authorDisplayName);
  const canEdit = currentUser?.id === profile.userId || currentUser?.role === UserRole.Admin;

  const postedAtDate = profile.postedAt ? (profile.postedAt instanceof Date ? profile.postedAt : new Date(profile.postedAt as string)) : null;
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateDisplay(postedAtDate) : "N/A";

  const profileIsTrulyExpired = profile.isExpired || (profile.expiresAt ? isDateInPast(profile.expiresAt) : false);

  const detailsNeedsTruncation = profile.details.length > 120;
  const displayDetails = showFullDetails || !detailsNeedsTruncation || (currentUser && !profileIsTrulyExpired) ? profile.details : `${profile.details.substring(0, 120)}...`;

  const toggleShowFullDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser && (detailsNeedsTruncation || profileIsTrulyExpired)) {
      navigate('/login', { state: { from: location.pathname, focusOnPostId: profile.id, type: 'helper' } });
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
      <div
        className="app-card"
      >
        {profile.isPinned && (
          <div className="card-pin-icon" title="ปักหมุดโดยแอดมิน">
            📌
          </div>
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
                onClick={() => navigate(`/profile/${profile.userId}/${profile.id}`)}
                onError={(e) => (e.currentTarget.style.display = 'none')}
                loading="lazy"
                decoding="async"
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
                className="helper-card-name text-sm"
                onClick={() => navigate(`/profile/${profile.userId}/${profile.id}`)}
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
            <TrustBadgesCompact profile={profile} user={userForBadges} />
          </div>
        </div>

        <div className="card-content-wrapper">
          <div className="helper-card-info-grid">
              <div className="helper-card-info-item" title="Available Area">
                  <span className="info-icon" role="img" aria-label="Work area">🌐</span>
                  <span className="truncate">{profile.area}</span>
              </div>
              <div className="helper-card-info-item" title="Availability">
                  <span className="info-icon" role="img" aria-label="Availability">⏰</span>
                  <span className="truncate">{getAvailabilityText()}</span>
              </div>
          </div>

          <div className="helper-card-details-box">
              <h5 className="helper-card-details-title text-sm">
                รายละเอียด
              </h5>
              <ul>
                <li className={`text-xs ${detailsNeedsTruncation && !showFullDetails && !(currentUser && !profileIsTrulyExpired) ? "details-line-clamp" : ""}`}>
                  {displayDetails}
                </li>
              </ul>
              {detailsNeedsTruncation && !(currentUser && !profileIsTrulyExpired) && (
                  <button
                    type="button"
                    onClick={toggleShowFullDetails}
                    className="text-xs text-primary-dark hover:underline mt-1 font-medium"
                    aria-expanded={showFullDetails}
                  >
                    {showFullDetails ? "แสดงน้อยลง" : "ดูเพิ่มเติม"}
                  </button>
              )}
          </div>
        </div>

        <div className="helper-card-footer">
          <div className="flex items-center gap-1 text-sm">
            {currentUser?.id !== profile.userId && (
              <Button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!currentUser) {
                      navigate('/login', { state: { from: location.pathname, intent: 'interest', postId: profile.id } });
                      return;
                  }
                  setLocalIsInterested(!localIsInterested);
                  setLocalInterestedCount(prev => localIsInterested ? prev - 1 : prev + 1);
                  onToggleInterest();
                }}
                variant="icon"
                size="sm"
                title={localIsInterested ? "เลิกสนใจ" : "สนใจ"}
                disabled={profile.isUnavailable || profileIsTrulyExpired}
                className={`${localIsInterested ? 'text-amber-400 hover:text-amber-500' : 'text-neutral-medium hover:text-amber-400'}`}
              >
                <StarIcon filled={localIsInterested} />
              </Button>
            )}
            <div className="helper-card-posted-time">
              <span title="จำนวนผู้สนใจ">{localInterestedCount}</span>
              <span className="text-neutral-medium mx-1.5">|</span>
              <span>{formattedPostedAt}</span>
            </div>
          </div>
          <div className="helper-card-action-buttons">
            {canEdit ? (
                <Button
                    onClick={() => navigate(`/helper/edit/${profile.id}`, { state: { from: location.pathname, item: profile } })}
                    variant="outline"
                    colorScheme="neutral"
                    size="sm"
                >
                    ✏️ แก้ไข
                </Button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
});
