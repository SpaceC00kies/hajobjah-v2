import React from 'react';
import type { EnrichedHelperProfile, User } from '../types/types.ts';
import { UserRole } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isDateInPast, formatDateForCard } from '../utils/dateUtils.ts';
import { useLocation, useNavigate } from 'react-router-dom';
import { MiniAudioPlayer } from './MiniAudioPlayer.tsx';


interface HelperCardProps {
  profile: EnrichedHelperProfile;
  currentUser: User | null;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onToggleInterest: () => void;
  isInterested: boolean;
  isAuthorVerified?: boolean;
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

const TrustBadgesCompact: React.FC<{ profile: EnrichedHelperProfile, user: User | undefined, isVerified?: boolean }> = ({ profile, user, isVerified }) => {
  if (!user && !isVerified && !(profile.interestedCount && profile.interestedCount > 0)) return null;

  const badges = [];
  if (isVerified) {
    badges.push(
      <span key="verified" className="verified-badge">
        <span>ยืนยันตัวตน</span>
      </span>
    );
  }
  if (user?.profileComplete) {
    badges.push(
      <span key="complete" className="helper-card-trust-badge" style={{ backgroundColor: 'var(--success)', color: 'white' }}>โปรไฟล์ครบ</span>
    );
  }
  if (user?.activityBadge?.isActive) {
    badges.push(
      <span key="activity" className="helper-card-trust-badge" style={{ backgroundColor: 'var(--info)', color: 'white' }}>ขยันใช้เว็บ</span>
    );
  }
  if (profile.isSuspicious) {
    badges.push(
      <span key="suspicious" className="helper-card-trust-badge" style={{ backgroundColor: 'var(--error)', color: 'white' }}>ระวัง</span>
    );
  }

  if (badges.length === 0) return null;

  return (
    <>
      {badges}
    </>
  );
};


export const HelperCard: React.FC<HelperCardProps> = React.memo(({
  profile,
  currentUser,
  getAuthorDisplayName,
  onToggleInterest,
  isInterested,
  isAuthorVerified,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [localIsInterested, setLocalIsInterested] = React.useState(isInterested);
  const [localInterestedCount, setLocalInterestedCount] = React.useState(profile.interestedCount || 0);

  const userForBadges = profile.userId === currentUser?.id ? currentUser : undefined;
  const authorActualDisplayName = getAuthorDisplayName(profile.userId, profile.authorDisplayName);
  const canEdit = currentUser?.id === profile.userId || currentUser?.role === UserRole.Admin;

  const formatDateOnlyDisplay = (dateInput?: string | Date | null): string => {
    if (!dateInput) return 'N/A';
    let dateObject: Date;
    if (dateInput instanceof Date) { dateObject = dateInput; }
    else if (typeof dateInput === 'string') { dateObject = new Date(dateInput); }
    else if (typeof dateInput === 'object' && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') { dateObject = (dateInput as any).toDate(); }
    else return "Invalid date";
    if (isNaN(dateObject.getTime())) return "Processing...";
    return dateObject.toLocaleDateString('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const postedAtDate = profile.postedAt ? (profile.postedAt instanceof Date ? profile.postedAt : new Date(profile.postedAt as string)) : null;
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateOnlyDisplay(postedAtDate) : "N/A";

  const profileIsTrulyExpired = profile.isExpired || (profile.expiresAt ? isDateInPast(profile.expiresAt) : false);

  const detailsNeedsTruncation = profile.details.length > 120;

  const handleReadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login', { state: { from: location.pathname, focusOnPostId: profile.id, type: 'helper' } });
    } else {
      navigate(`/profile/${profile.userId}/${profile.id}`);
    }
  };

  const formatDateForJobCard = (dateInput?: string | Date | null): string => {
    if (!dateInput) return '';
    let dateObject: Date;
    if (dateInput instanceof Date) {
      dateObject = dateInput;
    } else if (typeof dateInput === 'string') {
      // Handle YYYY-MM-DD which JS parses as UTC midnight.
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
          const parts = dateInput.split('-').map(p => parseInt(p, 10));
          dateObject = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
          dateObject = new Date(dateInput);
      }
    } else if (typeof dateInput === 'object' && dateInput && 'toDate' in dateInput && typeof (dateInput as any).toDate === 'function') {
      dateObject = (dateInput as any).toDate();
    } else {
      return "Invalid date";
    }

    if (isNaN(dateObject.getTime())) return "Processing...";
    return dateObject.toLocaleDateString('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getAvailabilityDateText = () => {
    if (profile.availabilityDateFrom) {
      let dateStr = formatDateForJobCard(profile.availabilityDateFrom);
      if (profile.availabilityDateTo) {
        dateStr += ` - ${formatDateForJobCard(profile.availabilityDateTo)}`;
      }
      return dateStr;
    }
    // Fallback for old data
    if (profile.availability) {
      return profile.availability;
    }
    return "ตามตกลง";
  };

  const getAvailabilityTimeText = () => {
    if (profile.availabilityTimeDetails) {
      // Return time details as-is (should be in "start - end" format from form)
      return profile.availabilityTimeDetails;
    }
    return null;
  };

  const locationText = profile.district ? `${profile.district}, ${profile.province}` : `${profile.province}`;

  return (
    <>
      <div
        className={`app-card ${profile.isPinned ? 'app-card--pinned' : ''}`}
        title={profile.isPinned ? 'ปักหมุดโดยแอดมิน' : ''}
      >
        <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1">
          <div className="helper-card-trust-badges">
            <TrustBadgesCompact profile={profile} user={userForBadges} isVerified={isAuthorVerified} />
          </div>
        </div>

        <div className="absolute top-2 right-2 z-10">
          {profile.serviceVoiceIntroUrl && <MiniAudioPlayer audioUrl={profile.serviceVoiceIntroUrl} icon="🎙️" />}
        </div>

        {profile.isUnavailable && !profileIsTrulyExpired && (
          <div className="helper-card-status-banner status-banner-unavailable">🚫 ไม่ว่างแล้ว</div>
        )}
        {profileIsTrulyExpired && (
          <div className="helper-card-status-banner status-banner-expired">⛔ หมดอายุแล้ว</div>
        )}
        {profile.isSuspicious && !profile.isPinned && (
          <div className="helper-card-status-banner status-banner-suspicious">🔺 โปรไฟล์นี้อาจถูกระงับ</div>
        )}

        <div className="card-header helper-card-header">
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
              <img src="" alt="" style={{ display: 'none' }} onError={() => {
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
            <h4 className="helper-card-main-title" title={profile.profileTitle} style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-semibold)', lineHeight: 'var(--leading-snug)', marginBottom: 'var(--space-1)', color: 'var(--text-primary)' }}>{profile.profileTitle}</h4>
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
              {locationText}
            </p>
            {(profile.category || profile.subCategory) && (
              <div
                className="helper-card-header-categories-combined"
                title={profile.category && profile.subCategory ? `${profile.category} - ${profile.subCategory}` : profile.category || profile.subCategory}
                style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)' }}
              >
                {profile.category}
                {profile.category && profile.subCategory && <span className="category-separator">›</span>}
                {profile.subCategory && profile.subCategory.split(' (')[0].trim()}
              </div>
            )}
          </div>
        </div>

        <div className="card-content">
          <div className="helper-card-info-grid" style={{ gap: 'var(--space-1)', marginBottom: 'var(--space-2)' }}>
            <div className="helper-card-info-item" title="Availability Dates">
              <span className="info-icon" role="img" aria-label="Calendar">🗓️</span>
              <span className="truncate">{getAvailabilityDateText()}</span>
            </div>
            {getAvailabilityTimeText() && (
              <div className="helper-card-info-item" title="Available Time">
                <span className="info-icon" role="img" aria-label="Clock">⏰</span>
                <span className="truncate">{getAvailabilityTimeText()}</span>
              </div>
            )}
          </div>

          <div className="helper-card-details-box">
            <h5 className="helper-card-details-title text-sm">
              รายละเอียด
            </h5>
            <ul>
              <li className={`text-xs ${detailsNeedsTruncation ? "details-line-clamp" : ""}`}>
                {profile.details}
              </li>
            </ul>
            {detailsNeedsTruncation && (
              <button
                type="button"
                onClick={handleReadMore}
                className="text-xs text-primary-dark hover:underline mt-1 font-medium text-left"
              >
                ดูเพิ่มเติม →
              </button>
            )}

            {localInterestedCount > 0 && (
              <p className="text-xs text-neutral-dark mt-auto pt-3">
                <span className="font-semibold">คนสนใจ:</span> {localInterestedCount.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="card-footer helper-card-footer">
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
