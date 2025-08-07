

import React, { useState, useEffect } from 'react';
import type { Job, User } from '../types/types.ts';
import { JobDesiredEducationLevelOption } from '../types/types.ts';
import { Button } from './Button.tsx';
import { isDateInPast } from '../utils/dateUtils.ts';
import { useLocation, useNavigate } from 'react-router-dom';

interface JobCardProps {
  job: Job;
  currentUser: User | null;
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onToggleInterest: () => void;
  isInterested: boolean;
  authorPhotoUrl?: string | null;
}

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

const JobCardAuthorFallbackAvatar: React.FC<{ name?: string }> = ({ name }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className="job-card-author-avatar bg-primary-light flex items-center justify-center text-xl font-sans font-semibold text-primary-dark">
      {initial}
    </div>
  );
};

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


export const JobCard: React.FC<JobCardProps> = React.memo(({ job, currentUser, getAuthorDisplayName, onToggleInterest, isInterested, authorPhotoUrl }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showFullDetails, setShowFullDetails] = useState(false);
  
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
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateDisplay(postedAtDate) : "N/A";
  
  const jobIsTrulyExpired = job.isExpired || (job.expiresAt ? isDateInPast(job.expiresAt) : false);

  const detailsNeedsTruncation = job.description.length > 120;
  const displayDetails = showFullDetails || !detailsNeedsTruncation || (currentUser && !jobIsTrulyExpired) ? job.description : `${job.description.substring(0, 120)}...`;

  const toggleShowFullDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser && (detailsNeedsTruncation || jobIsTrulyExpired)) {
        navigate('/login', { state: { from: location.pathname, focusOnPostId: job.id, type: 'job' } });
    } else {
      setShowFullDetails(!showFullDetails);
    }
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
  
  const formattedDateTime = () => {
    const parts = [];
    if(job.dateNeededFrom) {
        let dateStr = `เริ่ม ${formatDateDisplay(job.dateNeededFrom)}`;
        if (job.dateNeededTo) {
            dateStr += ` - ${formatDateDisplay(job.dateNeededTo)}`;
        }
        parts.push(dateStr);
    }
    if (job.timeNeededStart) {
        let timeStr = `ช่วง ${job.timeNeededStart}`;
        if (job.timeNeededEnd) {
            timeStr += ` - ${job.timeNeededEnd}`;
        }
        parts.push(timeStr);
    }
    if(job.dateTime && parts.length === 0) {
        parts.push(job.dateTime);
    }
    return parts.join(', ') || null;
  };

  return (
    <>
      <div className="app-card">
        {job.isPinned && (
          <div className="card-pin-icon" title="ปักหมุดโดยแอดมิน">
            📌
          </div>
        )}
        
        {/* NEW: Star icon moved to top right */}
        {currentUser?.id !== job.userId && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 text-primary-dark bg-white/70 backdrop-blur-sm rounded-full pl-1">
                <Button
                    onClick={handleToggleInterest}
                    variant="icon"
                    size="sm"
                    title={localIsInterested ? "เลิกสนใจ" : "สนใจ"}
                    disabled={job.isHired || jobIsTrulyExpired}
                    className={`${localIsInterested ? 'text-amber-400 hover:text-amber-500' : 'text-primary-dark hover:text-amber-400'} !p-1.5`}
                >
                    <StarIcon filled={localIsInterested} />
                </Button>
                <span className="font-sans font-semibold text-sm pr-2.5 -ml-1">{localInterestedCount}</span>
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

        <div className="job-card-header">
           <div className="job-card-header-content">
                <h4 className="job-card-main-title" title={job.title}>
                    {job.title}
                </h4>
                {(job.category || job.subCategory) && (
                  <div
                    className="job-card-header-categories-combined !text-xs !mb-2"
                    title={job.category && job.subCategory ? `${job.category} - ${job.subCategory}` : job.category || job.subCategory}
                  >
                    {job.category}
                    {job.category && job.subCategory && <span className="category-separator">›</span>}
                    {job.subCategory}
                  </div>
                )}
                <div className="job-card-info-grid">
                    {renderInfoItem("📍", `${job.location}, ${job.province}`, "Location")}
                    {renderInfoItem("💰", job.payment, "Payment")}
                    {formattedDateTime() && renderInfoItem("⏰", formattedDateTime(), "Date & Time")}
                </div>
           </div>
        </div>
        
        <div className="card-content-wrapper">
            <div className="job-card-details-box">
              <h5 className="job-card-details-title text-sm">
                รายละเอียดงาน
              </h5>
              <ul className="mt-1">
                <li className={`text-xs ${detailsNeedsTruncation && !showFullDetails && !(currentUser && !jobIsTrulyExpired) ? "details-line-clamp" : ""}`}>
                  {displayDetails}
                </li>
              </ul>
              {detailsNeedsTruncation && !(currentUser && !jobIsTrulyExpired) && (
                <button
                    type="button"
                    onClick={toggleShowFullDetails}
                    className="text-xs text-primary-dark hover:underline mt-1 font-medium"
                    aria-expanded={showFullDetails}
                  >
                    {showFullDetails ? "แสดงน้อยลง" : "ดูเพิ่มเติม"}
                  </button>
              )}
              
              {(job.desiredAgeStart || job.desiredAgeEnd || job.preferredGender || (job.desiredEducationLevel && job.desiredEducationLevel !== JobDesiredEducationLevelOption.Any)) && (
                <>
                    <h6 className="text-xs font-semibold text-neutral-dark mt-3 mb-0">คุณสมบัติเพิ่มเติม:</h6>
                    <ul className="qualifications-list text-xs">
                        {job.desiredAgeStart && <li>อายุ: {job.desiredAgeStart}{job.desiredAgeEnd ? ` - ${job.desiredAgeEnd}` : '+'} ปี</li>}
                        {job.preferredGender && <li>เพศ: {job.preferredGender}</li>}
                        {job.desiredEducationLevel && job.desiredEducationLevel !== JobDesiredEducationLevelOption.Any && <li>การศึกษา: {job.desiredEducationLevel}</li>}
                    </ul>
                </>
              )}
            </div>
        </div>


        <div className="job-card-author-section mt-auto">
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
             <div className="job-card-author-name-container">
                  <span 
                      className="job-card-author-name text-sm" 
                      onClick={(e) => { e.stopPropagation(); navigate(`/profile/${job.userId}`)}}
                  >
                      {authorActualDisplayName}
                      <span className="name-arrow">→</span>
                  </span>
                  {job.adminVerified && (
                    <span className="verified-badge">
                        <span>✅</span>
                        <span>ยืนยันตัวตน</span>
                    </span>
                  )}
              </div>
              <p className="job-card-posted-time">{formattedPostedAt}</p>
          </div>

          <div className="job-card-action-buttons">
            {currentUser?.id === job.userId ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
});
