


import React, { useState } from 'react';
import type { Job, User } from '../types/types';
import { View, JobCategory, JOB_CATEGORY_EMOJIS_MAP, JobDesiredEducationLevelOption, Province } from '../types/types';
import { Button } from './Button.tsx'; // Import Button
import { Modal } from './Modal.tsx';
import { isDateInPast } from '../utils/dateUtils.ts';
import { motion } from 'framer-motion';

interface JobCardProps {
  job: Job; // Already includes posterIsAdminVerified?
  navigateTo: (view: View, payload?: any) => void; // Updated to accept payload
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
  onEditJobFromFindView?: (jobId: string) => void; 
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
  onToggleInterest: (targetId: string, targetType: 'job' | 'helperProfile', targetOwnerId: string) => void; // New prop
  isInterested: boolean; // New prop
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

export const JobCard: React.FC<JobCardProps> = ({ job, navigateTo, currentUser, requestLoginForAction, onEditJobFromFindView, getAuthorDisplayName, onToggleInterest, isInterested }) => {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  
  const authorActualDisplayName = getAuthorDisplayName(job.userId, job.authorDisplayName);


  const handleContact = () => {
    if (!currentUser) {
      requestLoginForAction(View.FindJobs, { intent: 'contactJob', postId: job.id });
      return;
    }
    setIsWarningModalOpen(true);
  };
  const closeContactModal = () => setIsContactModalOpen(false);
  const closeWarningModal = () => setIsWarningModalOpen(false);

  const handleProceedToContact = () => {
    setIsWarningModalOpen(false);
    setIsContactModalOpen(true);
  };
  
  const handleInterestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
        requestLoginForAction(View.FindJobs, { intent: 'interest', postId: job.id });
        return;
    }
    onToggleInterest(job.id, 'job', job.userId);
  };

  const categoryEmoji = JOB_CATEGORY_EMOJIS_MAP[job.category] || '💼';

  const postedAtDate = job.postedAt ? (job.postedAt instanceof Date ? job.postedAt : new Date(job.postedAt as string)) : null;
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateDisplay(postedAtDate) : "N/A";
  
  const jobIsTrulyExpired = job.isExpired || (job.expiresAt ? isDateInPast(job.expiresAt) : false);

  const detailsNeedsTruncation = job.description.length > 120;
  const displayDetails = showFullDetails || !detailsNeedsTruncation || (currentUser && !jobIsTrulyExpired) ? job.description : `${job.description.substring(0, 120)}...`;

  const toggleShowFullDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser && (detailsNeedsTruncation || jobIsTrulyExpired)) {
      requestLoginForAction(View.FindJobs, { focusOnPostId: job.id, type: 'job' });
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


  return (
    <>
      <motion.div
        className="job-card-redesigned font-sans h-full"
        whileHover={{
          y: -5,
          transition: { duration: 0.2, ease: "easeOut" as const },
        }}
        initial={{ scale: 0.97, filter: 'brightness(0.95)' }}
        whileInView={{ scale: 1, filter: 'brightness(1)' }}
        transition={{ duration: 0.4, ease: "easeOut" as const }}
        viewport={{ once: true, amount: 0.2 }}
      >
        {job.isPinned && (
          <div className="job-card-status-banner status-banner-pinned">📌 ปักหมุดโดยแอดมิน</div>
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
           <div className="flex items-start justify-between">
            <div>
                <div 
                    className="job-card-main-title"
                    title={job.title}
                    dangerouslySetInnerHTML={{ __html: `${categoryEmoji} ${job.title}` }}
                />
                <div className="job-card-author-name-container">
                    <h3 
                        className="job-card-author-name text-sm" 
                        onClick={() => navigateTo(View.PublicProfile, {userId: job.userId})}
                    >
                        {authorActualDisplayName}
                        <span className="name-arrow">→</span>
                    </h3>
                    {job.posterIsAdminVerified && (
                        <span className="ml-1.5 bg-secondary text-neutral-dark text-xs px-1.5 py-0.5 rounded-full font-medium">
                            ⭐ ยืนยันตัวตน
                        </span>
                    )}
                </div>
            </div>
            {/* Avatar removed */}
           </div>

          {(job.category || job.subCategory) && (
            <div
              className="job-card-header-categories-combined"
              title={job.category && job.subCategory ? `${job.category} - ${job.subCategory}` : job.category || job.subCategory}
            >
              {job.category}
              {job.category && job.subCategory && <span className="category-separator">›</span>}
              {job.subCategory}
            </div>
          )}
        </div>
        
        <div className="job-card-info-grid">
            {renderInfoItem("📍", job.location, "Location", `${job.location}, ${job.province}`)}
            {renderInfoItem("💰", job.payment, "Payment")}
            {job.dateTime && renderInfoItem("⏰", job.dateTime, "Date & Time")}
            {job.dateNeededFrom && renderInfoItem("🗓️", `เริ่ม ${formatDateDisplay(job.dateNeededFrom)}${job.dateNeededTo ? ` - ${formatDateDisplay(job.dateNeededTo)}` : ''}`, "Dates Needed")}
            {job.timeNeededStart && renderInfoItem("⏱️", `ช่วง ${job.timeNeededStart}${job.timeNeededEnd ? ` - ${job.timeNeededEnd}` : ''}`, "Time Needed")}
        </div>


        <div className="job-card-details-box">
          <h5 className="job-card-details-title text-sm">
            รายละเอียดงาน
          </h5>
          {/* The description text will sit directly below "รายละเอียดงาน" due to margin-bottom: 0px on title */}
          <ul className="mt-1"> {/* Added small margin-top to ul if direct adjacency feels too tight for the paragraph of text */}
            <li className={`text-xs ${detailsNeedsTruncation && !showFullDetails && !(currentUser && !jobIsTrulyExpired) ? "details-line-clamp" : ""}`}>
              {displayDetails}
            </li>
          </ul>
          {detailsNeedsTruncation && !(currentUser && !jobIsTrulyExpired) && (
            <button
                onClick={toggleShowFullDetails}
                className="text-xs text-primary-dark hover:underline mt-1 font-medium"
                aria-expanded={showFullDetails}
              >
                {showFullDetails ? "แสดงน้อยลง" : "ดูเพิ่มเติม"}
              </button>
          )}
          
          {(job.desiredAgeStart || job.desiredAgeEnd || job.preferredGender || job.desiredEducationLevel) && (
            <>
                {/* Changed mb-0.5 to mb-0 for closer spacing to list */}
                <h6 className="text-xs font-semibold text-neutral-dark mt-3 mb-0">คุณสมบัติที่ต้องการ (ถ้ามี):</h6>
                <ul className="qualifications-list text-xs">
                    {job.desiredAgeStart && <li>อายุ: {job.desiredAgeStart}{job.desiredAgeEnd ? ` - ${job.desiredAgeEnd}` : '+'} ปี</li>}
                    {job.preferredGender && <li>เพศ: {job.preferredGender}</li>}
                    {job.desiredEducationLevel && job.desiredEducationLevel !== JobDesiredEducationLevelOption.Any && <li>การศึกษา: {job.desiredEducationLevel}</li>}
                </ul>
            </>
          )}
        </div>


        <div className="job-card-footer mt-auto">
          <div className="job-card-posted-time">
            <span title="จำนวนผู้สนใจ">⭐ {job.interestedCount || 0}</span>
            <span className="ml-2">| {formattedPostedAt}</span>
          </div>
          <div className="job-card-action-buttons">
            {currentUser?.id !== job.userId && (
                <Button
                    onClick={handleInterestClick}
                    variant={isInterested ? "primary" : "outline"}
                    colorScheme="primary"
                    size="sm"
                    disabled={job.isHired || jobIsTrulyExpired}
                    className="!px-2.5"
                >
                    {isInterested ? '⭐ สนใจแล้ว' : '⭐ สนใจ'}
                </Button>
            )}
            {onEditJobFromFindView && currentUser?.id === job.userId ? (
             <Button
                onClick={() => onEditJobFromFindView(job.id)}
                variant="outline"
                colorScheme="neutral"
                size="sm"
                disabled={jobIsTrulyExpired}
            >
                ✏️ แก้ไข
            </Button>
            ) : (
                <Button
                onClick={handleContact}
                variant="primary"
                size="sm"
                disabled={job.isHired || jobIsTrulyExpired || currentUser?.id === job.userId}
                >
                {job.isHired ? '✅ มีคนทำแล้ว' : jobIsTrulyExpired ? '⛔ หมดอายุ' : (currentUser?.id === job.userId ? '👤 งานของคุณ' : 'ติดต่อ')}
                </Button>
            )}
          </div>
        </div>
      </motion.div>

      {currentUser && !jobIsTrulyExpired && (
        <>
          <Modal isOpen={isWarningModalOpen} onClose={closeWarningModal} title="⚠️ โปรดระวังมิจฉาชีพ">
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-md my-2 text-neutral-dark font-serif">
                <p className="mb-2">โปรดใช้ความระมัดระวัง <strong className="font-bold text-red-700">ห้ามโอนเงินก่อนเริ่มงาน</strong> และควรนัดเจอในที่ปลอดภัย</p>
                <p>
                  หาจ๊อบจ้าเป็นเพียงพื้นที่ให้คนเจอกัน โปรดใช้วิจารณญาณในการติดต่อ ฉบับเต็มโปรดอ่านที่หน้า{" "}
                  <button
                    onClick={() => { closeWarningModal(); navigateTo(View.Safety); }}
                    className="font-serif font-normal underline text-neutral-dark hover:text-primary"
                  >
                    "โปรดอ่านเพื่อความปลอดภัย"
                  </button>
                </p>
            </div>
            <Button onClick={handleProceedToContact} variant="accent" className="w-full mt-4">
              เข้าใจแล้ว ดำเนินการต่อ
            </Button>
          </Modal>

          <Modal isOpen={isContactModalOpen} onClose={closeContactModal} title="ขอบคุณที่สนใจงาน">
            <div className="text-neutral-dark font-serif p-4 rounded-md">
                <p className="mb-4">กรุณาติดต่อผู้ประกาศโดยตรงตามข้อมูลด้านล่าง เพื่อนัดหมาย หรือสอบถามรายละเอียดเพิ่มเติม</p>
                <div className="bg-neutral-light p-4 rounded-md border border-neutral-DEFAULT whitespace-pre-wrap font-sans">
                  <p>{job.contact}</p>
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

declare module '../types/types' {
    interface Job {
        userPhoto?: string; // Add this to Job type if it's not already there from some enrichment process
    }
}