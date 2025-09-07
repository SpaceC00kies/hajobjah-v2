
import React, { useState, useEffect } from 'react';
import type { Job, User, PaymentType } from '../types/types.ts';
import { JobDesiredEducationLevelOption, PaymentType as PaymentTypeEnum } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isDateInPast } from '../utils/dateUtils.ts';
import { useLocation, useNavigate } from 'react-router-dom';
import { VoiceApplicationModal } from './VoiceApplicationModal.tsx';

interface JobCardProps {
  job: Job;
  currentUser: User | null;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onToggleInterest: () => void;
  isInterested: boolean;
  authorPhotoUrl?: string | null;
  isAuthorVerified?: boolean;
}

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


const JobCardAuthorFallbackAvatar: React.FC<{ name?: string }> = ({ name }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className="job-card-author-avatar bg-primary-light flex items-center justify-center text-xl font-sans font-semibold text-primary-dark">
      {initial}
    </div>
  );
};

const StarIcon: React.FC<{ filled?: boolean, className?: string }> = ({ filled = false, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-5 h-5 ${className}`}
    data-filled={filled}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const formatInterestCount = (count: number): string => {
    if (count < 1000) return String(count);
    const thousands = count / 1000;
    return `${parseFloat(thousands.toFixed(1))}k`;
};


export const JobCard: React.FC<JobCardProps> = React.memo(({ job, currentUser, getAuthorDisplayName, onToggleInterest, isInterested, authorPhotoUrl, isAuthorVerified }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  
  const [localIsInterested, setLocalIsInterested] = useState(isInterested);
  const [localInterestedCount, setLocalInterestedCount] = useState(job.interestedCount || 0);

  useEffect(() => {
    setLocalIsInterested(isInterested);
  }, [isInterested]);

  useEffect(() => {
    setLocalInterestedCount(job.interestedCount || 0);
  }, [job.interestedCount]);

  const handleToggleInterest = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
        navigate('/login', { state: { from: location.pathname, intent: 'interest', postId: job.id } });
        return;
    }
    setLocalIsInterested(!localIsInterested);
    setLocalInterestedCount(prev => localIsInterested ? prev - 1 : prev + 1);
    onToggleInterest();
  };
  
  const authorActualDisplayName = getAuthorDisplayName(job.userId, job.authorDisplayName);

  const postedAtDate = job.postedAt ? (job.postedAt instanceof Date ? job.postedAt : new Date(job.postedAt as string)) : null;
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateOnlyDisplay(postedAtDate) : "N/A";
  
  const jobIsTrulyExpired = job.isExpired || (job.expiresAt ? isDateInPast(job.expiresAt) : false);

  const detailsNeedsTruncation = job.description.length > 120;

  const handleReadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${job.userId}/job/${job.id}`);
  };
  
  const renderInfoItem = (icon: string, text: string | number | undefined | null, label: string, title?: string) => {
    if (text === undefined || text === null || (typeof text === 'string' && !text.trim())) return null;
    return (
      <div className="job-card-info-item" title={title || label}>
        <span className="info-icon" role="img" aria-label={label}>{icon}</span>
        <span className="truncate">{text}</span>
      </div>
    );
  };
  
  const formattedDate = (): string | null => {
    if (job.dateNeededFrom) {
        let dateStr = formatDateForJobCard(job.dateNeededFrom);
        if (job.dateNeededTo && job.dateNeededTo !== job.dateNeededFrom) {
            dateStr += ` - ${formatDateForJobCard(job.dateNeededTo)}`;
        }
        return dateStr;
    }
    return null;
  };
  
  const formattedTime = (): string | null => {
    if (job.timeNeededStart) {
        let timeStr = job.timeNeededStart;
        if (job.timeNeededEnd) {
            timeStr += ` - ${job.timeNeededEnd}`;
        }
        return timeStr;
    }
    return null;
  };
  
  const formattedPayment = () => {
      if (job.paymentType) {
          if (job.paymentType === PaymentTypeEnum.Negotiable || !job.paymentAmount) {
              return 'ตามตกลง';
          }
           if (job.paymentType === PaymentTypeEnum.Monthly && job.paymentAmount === 70000 && !job.paymentAmountMax) {
              return '฿70,000+ /เดือน';
          }
          const base = `฿${job.paymentAmount.toLocaleString()}`;
          const range = job.paymentAmountMax ? ` - ฿${job.paymentAmountMax.toLocaleString()}` : '';
          const unit = job.paymentType.replace('ราย', '/');
          return `${base}${range} ${unit}`;
      }
      return job.payment;
  };

  const canApplyWithVoice = currentUser && currentUser.id !== job.userId && !job.isHired && !jobIsTrulyExpired;
  const hasInterestSection = currentUser?.id !== job.userId;
  const locationText = job.district ? `${job.district}, ${job.province}` : `${job.location}, ${job.province}`;

  return (
    <>
      <div
        className={`app-card ${job.isPinned ? 'app-card--pinned' : ''}`}
        title={job.isPinned ? 'ปักหมุดโดยแอดมิน' : ''}
      >
        {canApplyWithVoice && (
            <div className="absolute top-2 right-2 z-10">
                <Button 
                    onClick={() => setIsVoiceModalOpen(true)} 
                    variant="outline"
                    size="sm"
                    className="!bg-white !border border-secondary !rounded-full !w-8 !h-8 !p-0 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                    style={{ transitionDuration: 'var(--transition-base)' }}
                    aria-label="สมัครงานด้วยเสียง"
                >
                   🎙️
               </Button>
            </div>
        )}
        {job.isHired && !jobIsTrulyExpired && (
          <div className="job-card-status-banner status-banner-hired">✅ มีคนทำแล้ว</div>
        )}
        {jobIsTrulyExpired && (
          <div className="job-card-status-banner status-banner-expired">⛔ หมดอายุแล้ว</div>
        )}
        {job.isSuspicious && !job.isPinned && (
          <div className="job-card-status-banner status-banner-suspicious">🔺 งานนี้อาจถูกระงับ</div>
        )}

        <div className="card-header">
           <div className="job-card-header-content">
                <h4 className="job-card-main-title pr-8" title={job.title} style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-semibold)', lineHeight: 'var(--leading-snug)', marginBottom: 'var(--space-1)', color: 'var(--text-primary)' }}>
                    {job.title}
                </h4>
                {(job.category || job.subCategory) && (
                  <div
                    className="job-card-header-categories-combined"
                    title={job.category && job.subCategory ? `${job.category} - ${job.subCategory}` : job.category || job.subCategory}
                    style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)', color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)' }}
                  >
                    {job.category}
                    {job.category && job.subCategory && <span className="category-separator">›</span>}
                    {job.subCategory && job.subCategory.split(' (')[0].trim()}
                  </div>
                )}
                <div className="job-card-info-grid" style={{ gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
                    {renderInfoItem("📍", locationText, "Location")}
                    {renderInfoItem("💰", formattedPayment(), "Payment")}
                    {formattedDate() && renderInfoItem("🗓️", formattedDate(), "Date")}
                    {formattedTime() && renderInfoItem("⏰", formattedTime(), "Time")}
                    {!formattedDate() && !formattedTime() && job.dateTime && renderInfoItem("⏰", job.dateTime, "Date & Time")}
                </div>
           </div>
        </div>
        
        <div className="card-content">
            <div className="job-card-details-box">
              <h5 className="job-card-details-title text-sm">
                รายละเอียดงาน
              </h5>
              {job.district && job.location && (
                  <p className="text-xs mt-1">
                      <span className="font-semibold">ชื่อสถานที่:</span> {job.location}
                  </p>
              )}
              <ul className="mt-1">
                <li className="text-xs details-line-clamp">
                  {job.description}
                </li>
              </ul>
              
              {(job.desiredAgeStart || job.desiredAgeEnd || job.preferredGender || job.desiredEducationLevel) && (
                <div className="mt-2">
                  <h6 className="text-xs font-semibold mt-2 mb-1">
                    คุณสมบัติ:
                  </h6>
                  <div className="text-xs text-neutral-medium">
                    {[
                      job.desiredAgeStart && `อายุ ${job.desiredAgeStart}${job.desiredAgeEnd ? `-${job.desiredAgeEnd}` : '+'} ปี`,
                      job.preferredGender && job.preferredGender,
                      job.desiredEducationLevel && job.desiredEducationLevel !== 'ไม่จำกัด' && job.desiredEducationLevel
                    ].filter(Boolean).join(' • ')}
                  </div>
                </div>
              )}

              {(detailsNeedsTruncation || job.desiredAgeStart || job.desiredAgeEnd || job.preferredGender || job.desiredEducationLevel) && (
                <button
                    type="button"
                    onClick={handleReadMore}
                    className="text-xs mt-2 font-medium text-left"
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


        <div className="card-footer job-card-author-section">
          {authorPhotoUrl ? (
            <img 
              src={authorPhotoUrl} 
              alt={authorActualDisplayName}
              className="job-card-author-avatar"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <JobCardAuthorFallbackAvatar name={authorActualDisplayName} />
          )}

          <div className="job-card-author-info">
            <span 
              className="job-card-author-name text-sm" 
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${job.userId}/job/${job.id}`)}}
            >
              {authorActualDisplayName}
            </span>

            <p className="job-card-posted-time">{formattedPostedAt}</p>
          </div>
          
          <div className="job-card-action-buttons">
            {hasInterestSection && (
                <Button
                    onClick={handleToggleInterest}
                    variant="icon"
                    size="sm"
                    title={localIsInterested ? "เลิกสนใจ" : "สนใจ"}
                    disabled={job.isHired || jobIsTrulyExpired}
                    className="job-card-interest-button"
                    data-filled={localIsInterested}
                >
                    <StarIcon filled={localIsInterested} />
                </Button>
            )}
            {currentUser?.id === job.userId && (
             <Button
                onClick={() => navigate(`/job/edit/${job.id}`, { state: { from: location.pathname, item: job } })}
                variant="outline"
                colorScheme="neutral"
                size="sm"
                className="job-card-edit-button"
                disabled={jobIsTrulyExpired}
            >
                ✏️ แก้ไข
            </Button>
            )}
            {isAuthorVerified && (
              <span className="verified-badge">
                <span>ยืนยันตัวตน</span>
              </span>
            )}
          </div>
        </div>
      </div>
      {canApplyWithVoice && (
          <VoiceApplicationModal 
              isOpen={isVoiceModalOpen} 
              onClose={() => setIsVoiceModalOpen(false)} 
              job={job}
          />
      )}
    </>
  );
});