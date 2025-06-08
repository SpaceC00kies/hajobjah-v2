
import React, { useState } from 'react';
import type { Job, User } from '../types';
import { View, JobCategory, JOB_CATEGORY_STYLES } from '../types';
import { Button } from './Button';
import { Modal } from './Modal';
import { isDateInPast } from '../App'; // Import isDateInPast

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
  
  // Determine if the job is expired
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

  const contactText = job.contact;
  const useBoxStyleForContact = typeof contactText === 'string' &&
                                (contactText.includes('เบอร์โทร:') || contactText.includes('LINE ID:') || contactText.includes('Facebook:'));

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
         {job.isHired && !jobIsTrulyExpired && ( // Show hired only if not also expired
           <div className="mb-3 p-2 bg-green-100 dark:bg-green-700/30 border border-green-300 dark:border-green-500/50 rounded-md text-center">
            <p className="text-sm font-sans font-medium text-green-700 dark:text-green-300">
              ✅ งานนี้มีคนทำแล้ว
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
          <p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📍 สถานที่:</strong> {job.location}</p>
          {dateNeededDisplay && (<p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">🗓️ วันที่ต้องการ:</strong> {dateNeededDisplay}</p>)}
          {timeNeededDisplay && (<p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">⏰ เวลา:</strong> {timeNeededDisplay}</p>)}
          {job.dateTime && (!dateNeededDisplay || !timeNeededDisplay) && (<p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📅 วันที่/เวลา (เพิ่มเติม):</strong> {job.dateTime}</p>)}
          <p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">💰 ค่าจ้าง:</strong> {job.payment}</p>

          {currentUser && !jobIsTrulyExpired && (
            useBoxStyleForContact ? (
              <div className="mt-2">
                <strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📞 ช่องทางติดต่อ:</strong>
                <div className="mt-1 text-sm font-serif bg-neutral-light dark:bg-dark-inputBg dark:text-dark-text p-3 rounded-md whitespace-pre-wrap border border-neutral-DEFAULT/50 dark:border-dark-border/50">
                  {contactText}
                </div>
              </div>
            ) : (
              <p className="font-serif"><strong className="font-sans font-medium text-neutral-dark dark:text-dark-text">📞 ติดต่อ:</strong> {contactText}</p>
            )
          )}

          {(ageRangeText || job.preferredGender || job.desiredEducationLevel) && (
            <div className="pt-2 mt-2 border-t border-neutral-DEFAULT/50 dark:border