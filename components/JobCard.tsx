
import React, { useState } from 'react';
import type { Job, User } from '../types';
import { View, JobCategory, JOB_CATEGORY_STYLES, JobDesiredEducationLevelOption, Province } from '../types'; // Added Province and JobDesiredEducationLevelOption
import { Button } from './Button';
import { Modal } from './Modal';
import { isDateInPast } from '../App';

interface JobCardProps {
  job: Job;
  navigateTo: (view: View) => void;
  currentUser: User | null;
  requestLoginForAction: (view: View, payload?: any) => void;
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
    // Handle Firestore Timestamp if applicable, or other object types
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

export const JobCard: React.FC<JobCardProps> = ({ job, navigateTo, currentUser, requestLoginForAction }) => {
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  const handleInterest = () => {
    setIsWarningModalOpen(true);
  };

  const closeInterestModal = () => {
    setIsInterestModalOpen(false);
  };

  const closeWarningModal = () => {
    setIsWarningModalOpen(false);
  };

  const handleProceedToContact = () => {
    setIsWarningModalOpen(false);
    setIsInterestModalOpen(true);
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

  const postedAtDate = job.postedAt ? (job.postedAt instanceof Date ? job.postedAt : new Date(job.postedAt as string)) : null;
  const formattedPostedAt = postedAtDate && !isNaN(postedAtDate.getTime()) ? formatDateDisplay(postedAtDate) : "Processing date...";
  
  const jobIsTrulyExpired = job.isExpired || (job.expiresAt ? isDateInPast(job.expiresAt) : false);


  let dateNeededDisplay = '';
  if (dateNeededFromText && dateNeededToText) {
    dateNeededDisplay = `${dateNeededFromText} - ${dateNeededToText}`;
  } else if (dateNeededFromText) {
    dateNeededDisplay = dateNeededFromText;
  }

  let timeNeededDisplay = '';
  if (job.timeNeededStart && job.timeNeededEnd) {
    timeNeededDisplay = `${job.timeNeededStart} - ${job.timeNeededEnd} น.`;
  } else if (job.timeNeededStart) {
    timeNeededDisplay = `${job.timeNeededStart} น.`;
  }

  const descriptionPreview = job.description.substring(0, 150);
  const categoryStyle = job.category ? JOB_CATEGORY_STYLES[job.category] : JOB_CATEGORY_STYLES[JobCategory.ShortTermMisc];

  return (
    <>
      <div className="bg-white dark:bg-dark-cardBg shadow-lg rounded-xl p-6 mb-6 border border-neutral-DEFAULT dark:border-dark-border hover:shadow-xl transition-shadow duration-300 flex flex-col h-full">
        {job.isPinned && (
           <div className="mb-3 p-2 bg-yellow-100 dark:bg-dark-secondary-DEFAULT/30 border border-yellow-300 dark:border-dark-secondary-DEFAULT/50 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-yellow-700 dark:text-dark-secondary-hover">
              📌 ปักหมุดโดยแอดมิน
            </p>
          </div>
        )}
         {job.isHired && !jobIsTrulyExpired && (
           <div className="mb-3 p-2 bg-green-100 dark:bg-green-700/30 border border-green-300 dark:border-green-500/50 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-green-700 dark:text-green-300">
              ✅ มีคนทำแล้ว
            </p>
          </div>
        )}
        {jobIsTrulyExpired && (
          <div className="mb-3 p-2 bg-red-200 dark:bg-red-700/40 border border-red-400 dark:border-red-600/60 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-red-800 dark:text-red-200">
              ⛔ หมดอายุแล้ว
            </p>
          </div>
        )}
        {job.isSuspicious && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-700/30 border border-red-300 dark:border-red-500/50 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-red-700 dark:text-red-300">
              ⚠️ โพสต์นี้น่าสงสัย โปรดใช้ความระมัดระวังเป็นพิเศษ
            </p>
          </div>
        )}
        <h3 className="text-2xl font-sans font-semibold text-primary dark:text-dark-primary-DEFAULT mb-1">{job.title}</h3>

        <div className="mb-1">
          <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full inline-block ${categoryStyle.bg} ${categoryStyle.text} ${categoryStyle.border ? `border ${categoryStyle.border}`: ''}`}>
            {job.category}
          </span>
        </div>
        {job.subCategory && (
          <p className="text-xs font-serif text-neutral-medium dark:text-dark-textMuted mb-3 ml-1">
            └ {job.subCategory}
          </p>
        )}

        <div className="space-y-2 text-neutral-dark dark:text-dark-textMuted mb-4 flex-grow font-normal">
          <p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📍 สถานที่:</strong> {job.location} ({job.province || Province.ChiangMai})</p>
          {dateNeededDisplay && (<p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">🗓️ วันที่ต้องการ:</strong> {dateNeededDisplay}</p>)}
          {timeNeededDisplay && (<p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">⏰ เวลา:</strong> {timeNeededDisplay}</p>)}
          {job.dateTime && (!dateNeededDisplay || !timeNeededDisplay) && (<p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📅 วันที่/เวลา (เพิ่มเติม):</strong> {job.dateTime}</p>)}
          <p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">💰 ค่าจ้าง:</strong> {job.payment}</p>

          {/* Contact information direct display removed as per request */}

          {(ageRangeText || job.preferredGender || job.desiredEducationLevel) && (
            <div className="pt-2 mt-2 border-t border-neutral-DEFAULT/50 dark:border-dark-border/50">
              <h4 className="text-sm font-sans font-medium text-neutral-dark dark:text-dark-text mt-2 mb-1">
                คุณสมบัติผู้ช่วยที่ต้องการ:
              </h4>
              <ul className="list-disc list-inside text-xs font-serif text-neutral-medium dark:text-dark-textMuted space-y-0.5 pl-4">
                {ageRangeText && <li>ช่วงอายุ: {ageRangeText}</li>}
                {job.preferredGender && <li>เพศ: {job.preferredGender}</li>}
                {job.desiredEducationLevel && job.desiredEducationLevel !== JobDesiredEducationLevelOption.Any && (
                  <li>ระดับการศึกษา: {job.desiredEducationLevel}</li>
                )}
              </ul>
            </div>
          )}
          
          <div className="mt-3">
            <strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📝 รายละเอียดงาน:</strong>
            <div className="mt-1 text-sm font-serif bg-neutral-light dark:bg-dark-inputBg dark:text-dark-text p-3 rounded-md whitespace-pre-wrap h-24 overflow-y-auto font-normal border border-neutral-DEFAULT/50 dark:border-dark-border/50">
              {(!currentUser || jobIsTrulyExpired) && job.description.length > 150 ? (
                <>
                  {descriptionPreview}...
                  <button
                    onClick={() => requestLoginForAction(View.FindJobs, { focusOnPostId: job.id, type: 'job' })}
                    className="text-primary dark:text-dark-primary-DEFAULT text-sm underline ml-1 font-sans"
                    aria-label="เข้าสู่ระบบเพื่อดูรายละเอียดงานเพิ่มเติม"
                  >
                    เข้าสู่ระบบเพื่อดูเพิ่มเติม
                  </button>
                </>
              ) : (
                job.description || 'ไม่มีรายละเอียดเพิ่มเติม'
              )}
            </div>
          </div>
        </div>
        
        {formattedPostedAt && (
          <p className="text-xs font-sans sm:text-sm text-neutral-medium dark:text-dark-textMuted mt-1 pt-2 border-t border-neutral-DEFAULT/30 dark:border-dark-border/20">
            🕒 โพสต์เมื่อ: {formattedPostedAt}
          </p>
        )}

        <div className="mt-auto mt-3"> {/* Added mt-3 for spacing */}
          <Button
            onClick={currentUser ? handleInterest : () => requestLoginForAction(View.FindJobs, { intent: 'contactJob', postId: job.id })}
            variant="primary"
            size="md"
            className="w-full"
            disabled={job.isHired || jobIsTrulyExpired}
            aria-label={job.isHired ? "งานนี้มีคนทำแล้ว" : jobIsTrulyExpired ? "งานหมดอายุแล้ว" : (currentUser ? "ติดต่องานนี้" : "เข้าสู่ระบบเพื่อติดต่อ")}
          >
            {job.isHired ? '✅ งานนี้มีคนทำแล้ว' : jobIsTrulyExpired ? '⛔ งานหมดอายุแล้ว' : (currentUser ? '📨 แสดงความสนใจ/ติดต่อ' : 'เข้าสู่ระบบเพื่อติดต่อ')}
          </Button>
        </div>
      </div>

      {currentUser && !jobIsTrulyExpired && (
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
                  className="font-serif font-normal underline text-neutral-dark dark:text-dark-textMuted hover:text-primary dark:hover:text-dark-primary-DEFAULT"
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
            <div className="text-neutral-dark dark:text-dark-textMuted font-serif p-4 rounded-md">
              <p className="mb-4">กรุณาติดต่อผู้ประกาศโดยตรงตามข้อมูลด้านล่างเพื่อนัดหมาย หรือสอบถามรายละเอียดเพิ่มเติม</p>
              <div className="bg-neutral-light dark:bg-dark-inputBg p-4 rounded-md border border-neutral-DEFAULT dark:border-dark-border whitespace-pre-wrap font-sans">
                <p>{job.contact}</p>
              </div>
              <p className="text-xs text-neutral-medium dark:text-dark-textMuted mt-4 text-center">
                (การคลิก "ดำเนินการต่อ" ในหน้าก่อนหน้านี้ ไม่ได้เป็นการส่งข้อมูลส่วนตัวใดๆ ของคุณให้ผู้ประกาศ)
              </p>
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
