
import React, { useState } from 'react';
import type { Job, User } from '../types';
import { View, JobCategory, JOB_CATEGORY_STYLES, JOB_CATEGORY_EMOJIS_MAP, JobDesiredEducationLevelOption, Province } from '../types';
import { Button } from './Button'; // Import Button
import { Modal } from './Modal';
import { isDateInPast } from '../App';
import { motion, type Transition } from 'framer-motion';

interface JobCardProps {
  job: Job;
  navigateTo: (view: View, payload?: any) => void; // Updated to accept payload
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
  onEditJobFromFindView?: (jobId: string) => void; 
}

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
    return null;
  }
};

export const JobCard: React.FC<JobCardProps> = ({ job, navigateTo, currentUser, requestLoginForAction, onEditJobFromFindView }) => {
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const handleInterest = () => {
    if (!currentUser) {
      requestLoginForAction(View.FindJobs, { intent: 'contactJob', postId: job.id });
      return;
    }
    setIsWarningModalOpen(true);
  };

  const closeInterestModal = () => setIsInterestModalOpen(false);
  const closeWarningModal = () => setIsWarningModalOpen(false);

  const handleProceedToContact = () => {
    setIsWarningModalOpen(false);
    setIsInterestModalOpen(true);
  };

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

  const formatAgeRange = () => {
    const { desiredAgeStart, desiredAgeEnd } = job;
    if (desiredAgeStart && desiredAgeEnd) {
      return desiredAgeStart === desiredAgeEnd ? `${desiredAgeStart} ปี` : `${desiredAgeStart} - ${desiredAgeEnd} ปี`;
    }
    if (desiredAgeStart) return `ตั้งแต่ ${desiredAgeStart} ปี`;
    if (desiredAgeEnd) return `ถึง ${desiredAgeEnd} ปี`;
    return null;
  };

  const ageRangeText = formatAgeRange();
  const dateNeededFromText = formatDateDisplay(job.dateNeededFrom);
  const dateNeededToText = formatDateDisplay(job.dateNeededTo);
  let dateNeededDisplay = '';
  if (dateNeededFromText && dateNeededToText) dateNeededDisplay = `${dateNeededFromText} - ${dateNeededToText}`;
  else if (dateNeededFromText) dateNeededDisplay = `ตั้งแต่ ${dateNeededFromText}`;
  else if (dateNeededToText) dateNeededDisplay = `ถึง ${dateNeededToText}`;
  else if (job.dateTime) dateNeededDisplay = job.dateTime; 

  let timeNeededDisplay = '';
  if (job.timeNeededStart && job.timeNeededEnd) timeNeededDisplay = `${job.timeNeededStart} - ${job.timeNeededEnd} น.`;
  else if (job.timeNeededStart) timeNeededDisplay = `${job.timeNeededStart} น.`;


  const categoryEmoji = JOB_CATEGORY_EMOJIS_MAP[job.category] || '💼';


  return (
    <>
      <motion.div
        className="job-card-redesigned font-sans h-full"
        whileHover={{
          y: -5,
          boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          rotate: 0.3,
          transition: { duration: 0.2, ease: "easeOut" } as Transition
        }}
        initial={{ scale: 0.97, filter: 'brightness(0.95)' }}
        whileInView={{ scale: 1, filter: 'brightness(1)' }}
        transition={{ duration: 0.4, ease: "easeOut" } as Transition}
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
          <div className="job-card-status-banner status-banner-suspicious">⚠️ งานนี้อาจถูกระงับ</div>
        )}

        <div className="job-card-header">
          <h4 className="job-card-main-title" title={job.title}>
            {categoryEmoji} {job.title}
          </h4>
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
            <div className="job-card-author-name-container mt-1">
                <h3 
                    className="job-card-author-name text-sm" 
                    onClick={() => navigateTo(View.PublicProfile, job.userId)}
                    title={`ดูโปรไฟล์ของ ${job.authorDisplayName}`}
                    aria-label={`ดูโปรไฟล์ของ ${job.authorDisplayName}`}
                >
                    {job.authorDisplayName}
                    <span className="name-arrow ml-1">→</span>
                </h3>
            </div>
            <p className="text-xs text-neutral-medium flex items-center gap-1 mt-1"> {/* Mimics helper-card-header-location */}
              <span role="img" aria-label="Province pin">📍</span>
              {job.province || Province.ChiangMai}
            </p>
        </div>

        <div className="job-card-info-grid">
          <div className="job-card-info-item">
            <span className="info-icon" role="img" aria-label="Location map">🗺️</span> {job.location}
          </div>
          {(dateNeededDisplay || timeNeededDisplay) && (
            <div className="job-card-info-item">
                <span className="info-icon" role="img" aria-label="Date/Time">📅</span>
                {dateNeededDisplay} {timeNeededDisplay && `(${timeNeededDisplay})`}
            </div>
          )}
          <div className="job-card-info-item">
            <span className="info-icon" role="img" aria-label="Payment">💰</span> {job.payment}
          </div>
        </div>

        <div className="job-card-details-box">
          <h5 className="job-card-details-title text-sm"> {/* Applied text-sm */}
            รายละเอียดงาน
          </h5>
          <ul>
            <li className={`text-xs ${detailsNeedsTruncation && !showFullDetails && !(currentUser && !jobIsTrulyExpired) ? "details-line-clamp" : ""}`}> {/* Applied text-xs */}
              {displayDetails}
            </li>
          </ul>
          {detailsNeedsTruncation && !(currentUser && !jobIsTrulyExpired) && (
             <button
                onClick={toggleShowFullDetails}
                className="text-xs text-blue-600 hover:underline mt-1 font-medium"
                aria-expanded={showFullDetails}
              >
                {showFullDetails ? "แสดงน้อยลง" : "ดูเพิ่มเติม"}
              </button>
          )}

          {(ageRangeText || job.preferredGender || (job.desiredEducationLevel && job.desiredEducationLevel !== JobDesiredEducationLevelOption.Any)) && (
            <div className="mt-3 pt-3 border-t border-neutral-DEFAULT/30">
              <h6 className="text-sm font-semibold text-neutral-dark mb-1">
                คุณสมบัติผู้ช่วยที่ต้องการ:
              </h6>
              <ul className="qualifications-list text-xs text-neutral-medium"> {/* Applied text-xs */}
                {ageRangeText && <li>{ageRangeText}</li>}
                {job.preferredGender && <li>เพศ: {job.preferredGender}</li>}
                {job.desiredEducationLevel && job.desiredEducationLevel !== JobDesiredEducationLevelOption.Any && (
                  <li>การศึกษา: {job.desiredEducationLevel}</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="job-card-footer mt-auto">
          <div className="job-card-posted-time">
            {formattedPostedAt}
          </div>
          <div className="job-card-action-buttons">
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
                onClick={currentUser ? handleInterest : () => requestLoginForAction(View.FindJobs, { intent: 'contactJob', postId: job.id })}
                variant="primary"
                size="sm"
                disabled={job.isHired || jobIsTrulyExpired}
              >
                {job.isHired ? '✅ มีคนทำแล้ว' : jobIsTrulyExpired ? '⛔ หมดอายุ' : (currentUser ? 'ติดต่อ' : 'เข้าสู่ระบบ')}
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

          <Modal isOpen={isInterestModalOpen} onClose={closeInterestModal} title="ขอบคุณที่สนใจงานนี้">
            <div className="text-neutral-dark font-serif p-4 rounded-md">
              <p className="mb-4">กรุณาติดต่อผู้ประกาศโดยตรงตามข้อมูลด้านล่างเพื่อนัดหมาย หรือสอบถามรายละเอียดเพิ่มเติม</p>
              <div className="bg-neutral-light p-4 rounded-md border border-neutral-DEFAULT whitespace-pre-wrap font-sans">
                <p>{job.contact}</p>
              </div>
              <Button onClick={closeInterestModal} variant="primary" className="w-full mt-6">
                ปิดหน้าต่างนี้
              </Button>
            </div>
          </Modal>
        </>
      )}
    </>
  );
};
