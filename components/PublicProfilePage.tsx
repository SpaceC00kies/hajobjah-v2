
import React, { useState, useEffect, useRef } from 'react';
import type { User, HelperProfile, VouchInfo, Job, Vouch } from '../types/types.ts';
import { HelperEducationLevelOption, GenderOption, VouchType } from '../types/types.ts';
import { Button } from './Button.tsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUsers } from '../hooks/useUsers.ts';
import { useHelpers } from '../hooks/useHelpers.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useUser } from '../hooks/useUser.ts';
import { useJobs } from '../hooks/useJobs.ts';
import { VouchModal } from './VouchModal.tsx';
import { VouchesListModal } from './VouchesListModal.tsx';
import { ReportVouchModal } from './ReportVouchModal.tsx';
import { AudioPlayer } from './AudioPlayer.tsx';

// Compact Audio Player Component
const CompactAudioPlayer: React.FC<{ audioUrl: string }> = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnd = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnd);
    return () => audio.removeEventListener('ended', handleEnd);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        onClick={togglePlayPause}
        className="w-10 h-10 rounded-full bg-primary-blue text-white flex items-center justify-center hover:bg-primary-medium transition-colors focus:outline-none"
        aria-label={isPlaying ? "หยุดเล่น" : "เล่นเสียง"}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 5h2v10H6V5zm6 0h2v10h-2V5z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 5.5v9l7-4.5-7-4.5z" />
          </svg>
        )}
      </button>
      <span className="text-sm text-neutral-medium font-sans">คลิกเพื่อฟัง</span>
    </div>
  );
};


interface PublicProfilePageProps {
  onBack: () => void;
  userId: string;
  helperProfileId?: string;
  jobId?: string;
}

const FallbackAvatarPublic: React.FC<{ name?: string, size?: string }> = ({ name, size = "w-40 h-40" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral flex items-center justify-center text-6xl font-sans text-white shadow-lg mx-auto`}>
      {initial}
    </div>
  );
};

const calculateAgePublic = (birthdateString?: string): number | null => {
  if (!birthdateString) return null;
  const birthDate = new Date(birthdateString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  if (birthDate > today) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const TrustBadgesPublicProfile: React.FC<{ user: User, helperProfile?: HelperProfile }> = ({ user, helperProfile }) => {
  const badges = [];
  if (user.adminVerified) {
    badges.push(
      <span key="verified" className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">ยืนยันตัวตน</span>
    );
  }
  if (user.profileComplete) {
    badges.push(
      <span key="complete" className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">โปรไฟล์ครบถ้วน</span>
    );
  }
  if (helperProfile?.isSuspicious) {
    badges.push(
      <span key="suspicious" className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">🔺 ระวังผู้ใช้นี้</span>
    );
  }

  if (badges.length === 0) return null;

  return (
    <>
      {badges}
    </>
  );
};

const VouchDisplay: React.FC<{ vouchInfo?: VouchInfo, onShowVouches: () => void }> = ({ vouchInfo, onShowVouches }) => {
  if (!vouchInfo || vouchInfo.total === 0) {
    return (
      <div className="text-center text-sm font-serif text-neutral-medium p-3 bg-neutral-light/40 rounded-lg">
        ยังไม่มีใครรับรองผู้ใช้นี้
      </div>
    );
  }

  const vouchItems = [
    { type: VouchType.WorkedTogether, label: 'ร่วมงานด้วย', count: vouchInfo.worked_together || 0 },
    { type: VouchType.Colleague, label: 'เพื่อนร่วมงาน', count: vouchInfo.colleague || 0 },
    { type: VouchType.Community, label: 'คนในพื้นที่', count: vouchInfo.community || 0 },
    { type: VouchType.Personal, label: 'คนรู้จัก', count: vouchInfo.personal || 0 },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {vouchItems.map(item => (
          <div key={item.type} className="text-sm">
            <span className="font-sans font-medium text-neutral-dark">{item.label}: </span>
            <span className="font-sans font-semibold text-secondary-hover">{item.count} คน</span>
          </div>
        ))}
      </div>
      <div className="text-center pt-2">
        <button onClick={onShowVouches} className="text-xs font-sans text-neutral-medium hover:text-secondary hover:underline">
          ดูการรับรอง ({vouchInfo.total})
        </button>
      </div>
    </div>
  );
};


export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ onBack, userId, helperProfileId, jobId }) => {
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const { allHelperProfilesForAdmin } = useHelpers();
  const { allJobsForAdmin } = useJobs();
  const navigate = useNavigate();
  const location = useLocation();
  const { vouchForUser } = useUser();

  const [vouchListModalUser, setVouchListModalUser] = useState<User | null>(null);
  const [vouchModalUser, setVouchModalUser] = useState<User | null>(null);
  const [reportVouchModalData, setReportVouchModalData] = useState<{ vouchToReport: Vouch; mode: 'report' | 'withdraw' } | null>(null);

  // Collapsible sections state - start all collapsed
  const [collapsedSections, setCollapsedSections] = useState({
    personalInfo: true,
    aboutMe: true,
    interests: true,
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const user = users.find(u => u.id === userId);
  const helperProfile = helperProfileId ? allHelperProfilesForAdmin.find(p => p.id === helperProfileId) : undefined;
  const jobDetails = jobId ? allJobsForAdmin.find(j => j.id === jobId) : undefined;

  if (!user) {
    return <div>User not found.</div>;
  }

  const age = calculateAgePublic(user.birthdate);

  const renderInfoItem = (label: string, value?: string | number | null, highlight: boolean = false, isMultiline: boolean = false, fullWidth: boolean = false, isLink: boolean = false) => {
    if ((value === undefined || value === null || (typeof value === 'string' && !value.trim())) && value !== 0) return null;
    let valueClass = 'text-neutral-medium';
    if (highlight) valueClass = 'text-lg text-secondary-hover font-semibold';
    return (
      <div className={`mb-3 ${fullWidth ? 'md:col-span-2' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-1">
          <span className="font-sans font-medium text-neutral-dark flex-shrink-0">{label}:</span>
          {isMultiline ? (
            <div className={`font-serif whitespace-pre-wrap ${valueClass} flex-1`}>{value}</div>
          ) : isLink && typeof value === 'string' ? (
            <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className={`font-serif ${valueClass} hover:underline text-blue-600 flex-1`}>{value}</a>
          ) : (
            <span className={`font-serif ${valueClass} flex-1`}>{value}</span>
          )}
        </div>
      </div>
    );
  };

  const personalityItems = [{ label: "🎧 เพลงที่ชอบ", value: user.favoriteMusic }, { label: "📚 หนังสือที่ชอบ", value: user.favoriteBook }, { label: "🎬 หนังที่ชอบ", value: user.favoriteMovie }, { label: "🧶 งานอดิเรก", value: user.hobbies, isMultiline: true }, { label: "🍜 อาหารที่ชอบ", value: user.favoriteFood }, { label: "🚫 สิ่งที่ไม่ชอบที่สุด", value: user.dislikedThing },].filter(item => item.value && item.value.trim() !== '');
  const hasBusinessInfo = user.isBusinessProfile && (user.businessName || user.businessType || user.aboutBusiness || user.businessAddress || user.businessWebsite || user.businessSocialProfileLink);

  // Collapsible Section Component
  const CollapsibleSection: React.FC<{
    title: string;
    isCollapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }> = ({ title, isCollapsed, onToggle, children }) => (
    <section className="border-t border-neutral-light pt-4 mb-6">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left mb-3 hover:bg-neutral-light/50 transition-colors rounded-md p-2 -ml-2"
      >
        <h2 className="text-xl font-semibold text-primary-dark">{title}</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 transform transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-90'
            }`}
          style={{ color: 'var(--primary-blue)' }}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
        }`}>
        {children}
      </div>
    </section>
  );


  return (
    <>
      <main className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <article className="app-card p-4 sm:p-6 lg:p-8">
          <header className="text-center mb-6">
            {user.photo ? (
              <img
                src={user.photo}
                alt={`รูปโปรไฟล์ของ ${user.publicDisplayName}`}
                className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover shadow-lg mx-auto mb-4"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <FallbackAvatarPublic name={user.publicDisplayName} size="w-32 h-32 sm:w-40 sm:h-40" />
            )}
            <div className="flex flex-col items-center justify-center gap-2 mt-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-primary-blue m-0 text-center">
                {user.publicDisplayName}
              </h1>
              <div className="flex gap-2 flex-wrap justify-center">
                <TrustBadgesPublicProfile user={user} helperProfile={helperProfile} />
              </div>
            </div>

            {/* Main profile voice - moved here below name */}
            {user.voiceIntroUrl && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 text-primary-dark">เสียงแนะนำตัว</h3>
                <CompactAudioPlayer audioUrl={user.voiceIntroUrl} />
              </div>
            )}
          </header>

          {/* Context-dependent first info section */}
          {jobDetails && (
            <section className="border-t border-neutral-light pt-4 mb-6">
              <h2 className="text-xl font-semibold mb-3 text-primary-dark">รายละเอียดงาน "{jobDetails.title}"</h2>
              {jobDetails.description && jobDetails.description.trim() !== '' &&
                <p className="font-serif text-neutral-medium whitespace-pre-wrap p-3 bg-neutral-light rounded-md">{jobDetails.description}</p>
              }
            </section>
          )}

          {helperProfile && !jobDetails && (
            <section className="border-t border-neutral-light pt-4 mb-6">
              <h2 className="text-xl font-semibold mb-3 text-primary-dark">เกี่ยวกับบริการ "{helperProfile.profileTitle}"</h2>
              {helperProfile.details && helperProfile.details.trim() !== '' &&
                <p className="font-serif text-neutral-medium whitespace-pre-wrap p-3 bg-neutral-light rounded-md mb-4">{helperProfile.details}</p>
              }
              {/* Service-specific voice - moved here below service details */}
              {helperProfile.serviceVoiceIntroUrl && (
                <div>
                  <h4 className="text-lg font-semibold mb-3 text-primary-dark">🎙️ เสียงแนะนำสำหรับบริการนี้</h4>
                  <CompactAudioPlayer audioUrl={helperProfile.serviceVoiceIntroUrl} />
                </div>
              )}
            </section>
          )}

          <section className="border-t border-neutral-light pt-4 mb-6">
            <h2 className="text-xl font-semibold mb-3 text-primary-dark">รับรองจากชุมชน</h2>
            <VouchDisplay vouchInfo={user.vouchInfo} onShowVouches={() => setVouchListModalUser(user)} />
            {currentUser && currentUser.id !== user.id && (
              <div className="text-center mt-4">
                <Button onClick={() => setVouchModalUser(user)} variant="outline" colorScheme="primary" size="sm">👍 รับรองคุณ {user.publicDisplayName}</Button>
              </div>
            )}
          </section>



          {!user.isBusinessProfile && (
            <CollapsibleSection
              title="ข้อมูลส่วนตัว"
              isCollapsed={collapsedSections.personalInfo}
              onToggle={() => toggleSection('personalInfo')}
            >
              <div className="space-y-3 bg-neutral-light/30 p-4 rounded-lg">
                {/* Compact personal info with combined name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {user.nickname && (
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-medium text-neutral-dark text-sm">ชื่อเล่น:</span>
                      <span className="font-serif text-neutral-medium">{user.nickname}</span>
                    </div>
                  )}
                  {(user.firstName || user.lastName) && (
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-medium text-neutral-dark text-sm">ชื่อ-นามสกุล:</span>
                      <span className="font-serif text-neutral-medium">
                        {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'ไม่ระบุ'}
                      </span>
                    </div>
                  )}
                  {age && (
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-medium text-neutral-dark text-sm">อายุ:</span>
                      <span className="font-serif text-neutral-medium">{age} ปี</span>
                    </div>
                  )}
                  {user.gender && user.gender !== GenderOption.NotSpecified && (
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-medium text-neutral-dark text-sm">เพศ:</span>
                      <span className="font-serif text-neutral-medium">{user.gender}</span>
                    </div>
                  )}
                  {user.educationLevel && user.educationLevel !== HelperEducationLevelOption.NotStated && (
                    <div className="flex items-center gap-2">
                      <span className="font-sans font-medium text-neutral-dark text-sm">การศึกษา:</span>
                      <span className="font-serif text-neutral-medium">{user.educationLevel}</span>
                    </div>
                  )}
                </div>
                {user.address && user.address.trim() !== '' && (
                  <div className="pt-2 border-t border-neutral-light/50">
                    <div className="flex flex-col gap-1">
                      <span className="font-sans font-medium text-neutral-dark text-sm">ที่อยู่:</span>
                      <span className="font-serif text-neutral-medium text-sm leading-relaxed">{user.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {!user.isBusinessProfile && user.introSentence && user.introSentence.trim() !== '' && (
            <CollapsibleSection
              title="เกี่ยวกับฉัน"
              isCollapsed={collapsedSections.aboutMe}
              onToggle={() => toggleSection('aboutMe')}
            >
              <p className="font-serif text-neutral-medium whitespace-pre-wrap p-3 bg-neutral-light rounded-md">{user.introSentence}</p>
            </CollapsibleSection>
          )}

          {hasBusinessInfo && (
            <section className="border-t border-neutral-light pt-4 mb-6">
              <h2 className="text-xl font-semibold mb-3 text-primary-dark">รายละเอียดธุรกิจ</h2>
              <div className="space-y-2 bg-neutral-light/30 p-4 rounded-lg border border-neutral-DEFAULT/50">
                {renderInfoItem("ชื่อธุรกิจ/ร้านค้า", user.businessName)}
                {renderInfoItem("ประเภทธุรกิจ", user.businessType)}
                {renderInfoItem("เกี่ยวกับธุรกิจ", user.aboutBusiness, false, true)}
                {renderInfoItem("ที่ตั้งธุรกิจ", user.businessAddress, false, true)}
                {renderInfoItem("เว็บไซต์", user.businessWebsite, false, false, false, true)}
                {renderInfoItem("โซเชียลโปรไฟล์ธุรกิจ", user.businessSocialProfileLink, false, false, false, true)}
              </div>
            </section>
          )}

          {!user.isBusinessProfile && personalityItems.length > 0 && (
            <CollapsibleSection
              title="สิ่งที่สนใจ"
              isCollapsed={collapsedSections.interests}
              onToggle={() => toggleSection('interests')}
            >
              <div className="space-y-2 bg-neutral-light/50 p-4 rounded-lg">
                {personalityItems.map(item => renderInfoItem(item.label, item.value, false, true))}
              </div>
            </CollapsibleSection>
          )}

          {currentUser ? (
            <>
              <section className="border-t border-neutral-light pt-4 mb-6">
                <h2 className="text-xl font-semibold mb-3 text-primary-dark">ข้อมูลติดต่อ</h2>
                <ul className="space-y-3 font-serif text-base text-neutral-dark">
                  {user.mobile && (
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-neutral-medium flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
                        <path d="M224.2 89C216.3 70.1 195.7 60.1 176.1 65.4L170.6 66.9C106 84.5 50.8 147.1 66.9 223.3C104 398.3 241.7 536 416.7 573.1C493 589.3 555.5 534 573.1 469.4L574.6 463.9C580 444.2 569.9 423.6 551.1 415.8L453.8 375.3C437.3 368.4 418.2 373.2 406.8 387.1L368.2 434.3C297.9 399.4 241.3 341 208.8 269.3L253 233.3C266.9 222 271.6 202.9 264.8 186.3L224.2 89z" />
                      </svg>
                      <span><span className="font-sans font-medium">เบอร์โทร:</span> {user.mobile}</span>
                    </li>
                  )}
                  {user.lineId && (
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-neutral-medium flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
                        <path d="M375 260.8L375 342.1C375 344.2 373.4 345.8 371.3 345.8L358.3 345.8C357 345.8 355.9 345.1 355.3 344.3L318 294L318 342.2C318 344.3 316.4 345.9 314.3 345.9L301.3 345.9C299.2 345.9 297.6 344.3 297.6 342.2L297.6 260.9C297.6 258.8 299.2 257.2 301.3 257.2L314.2 257.2C315.3 257.2 316.6 257.8 317.2 258.8L354.5 309.1L354.5 260.9C354.5 258.8 356.1 257.2 358.2 257.2L371.2 257.2C373.3 257.1 375 258.8 375 260.7L375 260.8zM281.3 257.1L268.3 257.1C266.2 257.1 264.6 258.7 264.6 260.8L264.6 342.1C264.6 344.2 266.2 345.8 268.3 345.8L281.3 345.8C283.4 345.8 285 344.2 285 342.1L285 260.8C285 258.9 283.4 257.1 281.3 257.1zM249.9 325.2L214.3 325.2L214.3 260.8C214.3 258.7 212.7 257.1 210.6 257.1L197.6 257.1C195.5 257.1 193.9 258.7 193.9 260.8L193.9 342.1C193.9 343.1 194.2 343.9 194.9 344.6C195.6 345.2 196.4 345.6 197.4 345.6L249.6 345.6C251.7 345.6 253.3 344 253.3 341.9L253.3 328.9C253.3 327 251.7 325.2 249.8 325.2L249.9 325.2zM443.6 257.1L391.3 257.1C389.4 257.1 387.6 258.7 387.6 260.8L387.6 342.1C387.6 344 389.2 345.8 391.3 345.8L443.5 345.8C445.6 345.8 447.2 344.2 447.2 342.1L447.2 329C447.2 326.9 445.6 325.3 443.5 325.3L408 325.3L408 311.7L443.5 311.7C445.6 311.7 447.2 310.1 447.2 308L447.2 294.9C447.2 292.8 445.6 291.2 443.5 291.2L408 291.2L408 277.5L443.5 277.5C445.6 277.5 447.2 275.9 447.2 273.8L447.2 260.8C447.1 258.9 445.5 257.1 443.5 257.1L443.6 257.1zM576 157.4L576 483.4C575.9 534.6 533.9 576.1 482.6 576L156.6 576C105.4 575.9 63.9 533.8 64 482.6L64 156.6C64.1 105.4 106.2 63.9 157.4 64L483.4 64C534.6 64.1 576.1 106.1 576 157.4zM505.6 297.5C505.6 214.1 421.9 146.2 319.2 146.2C216.5 146.2 132.8 214.1 132.8 297.5C132.8 372.2 199.1 434.9 288.7 446.8C310.5 451.5 308 459.5 303.1 488.9C302.3 493.6 299.3 507.3 319.2 499C339.1 490.7 426.5 435.8 465.7 390.8C492.7 361.1 505.6 331 505.6 297.7L505.6 297.5z" />
                      </svg>
                      <span><span className="font-sans font-medium">LINE ID:</span> {user.lineId}</span>
                    </li>
                  )}
                  {user.facebook && (
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-neutral-medium flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
                        <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L258.2 544L258.2 398.2L205.4 398.2L205.4 320L258.2 320L258.2 286.3C258.2 199.2 297.6 158.8 383.2 158.8C399.4 158.8 427.4 162 438.9 165.2L438.9 236C432.9 235.4 422.4 235 409.3 235C367.3 235 351.1 250.9 351.1 292.2L351.1 320L434.7 320L420.3 398.2L351 398.2L351 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96z" />
                      </svg>
                      <span><span className="font-sans font-medium">Facebook:</span> <a href={user.facebook.startsWith('http') ? user.facebook : `https://${user.facebook}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{user.facebook}</a></span>
                    </li>
                  )}
                  {(user as any).instagram && (
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-neutral-medium flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
                        <path d="M290.4 275.7C274 286 264.5 304.5 265.5 323.8C266.6 343.2 278.2 360.4 295.6 368.9C313.1 377.3 333.8 375.5 349.6 364.3C366 354 375.5 335.5 374.5 316.2C373.4 296.8 361.8 279.6 344.4 271.1C326.9 262.7 306.2 264.5 290.4 275.7zM432.7 207.3C427.5 202.1 421.2 198 414.3 195.3C396.2 188.2 356.7 188.5 331.2 188.8C327.1 188.8 323.3 188.9 320 188.9C316.7 188.9 312.8 188.9 308.6 188.8C283.1 188.5 243.8 188.1 225.7 195.3C218.8 198 212.6 202.1 207.3 207.3C202 212.5 198 218.8 195.3 225.7C188.2 243.8 188.6 283.4 188.8 308.9C188.8 313 188.9 316.8 188.9 320C188.9 323.2 188.9 327 188.8 331.1C188.6 356.6 188.2 396.2 195.3 414.3C198 421.2 202.1 427.4 207.3 432.7C212.5 438 218.8 442 225.7 444.7C243.8 451.8 283.3 451.5 308.8 451.2C312.9 451.2 316.7 451.1 320 451.1C323.3 451.1 327.2 451.1 331.4 451.2C356.9 451.5 396.2 451.9 414.3 444.7C421.2 442 427.4 437.9 432.7 432.7C438 427.5 442 421.2 444.7 414.3C451.9 396.3 451.5 356.9 451.2 331.3C451.2 327.1 451.1 323.2 451.1 319.9C451.1 316.6 451.1 312.8 451.2 308.5C451.5 283 451.9 243.6 444.7 225.5C442 218.6 437.9 212.4 432.7 207.1L432.7 207.3zM365.6 251.8C383.7 263.9 396.2 282.7 400.5 304C404.8 325.3 400.3 347.5 388.2 365.6C382.2 374.6 374.5 382.2 365.6 388.2C356.7 394.2 346.6 398.3 336 400.4C314.7 404.6 292.5 400.2 274.4 388.1C256.3 376 243.8 357.2 239.5 335.9C235.2 314.6 239.7 292.4 251.7 274.3C263.7 256.2 282.6 243.7 303.9 239.4C325.2 235.1 347.4 239.6 365.5 251.6L365.6 251.6zM394.8 250.5C391.7 248.4 389.2 245.4 387.7 241.9C386.2 238.4 385.9 234.6 386.6 230.8C387.3 227 389.2 223.7 391.8 221C394.4 218.3 397.9 216.5 401.6 215.8C405.3 215.1 409.2 215.4 412.7 216.9C416.2 218.4 419.2 220.8 421.3 223.9C423.4 227 424.5 230.7 424.5 234.5C424.5 237 424 239.5 423.1 241.8C422.2 244.1 420.7 246.2 419 248C417.3 249.8 415.1 251.2 412.8 252.2C410.5 253.2 408 253.7 405.5 253.7C401.7 253.7 398 252.6 394.9 250.5L394.8 250.5zM544 160C544 124.7 515.3 96 480 96L160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160zM453 453C434.3 471.7 411.6 477.6 386 478.9C359.6 480.4 280.4 480.4 254 478.9C228.4 477.6 205.7 471.7 187 453C168.3 434.3 162.4 411.6 161.2 386C159.7 359.6 159.7 280.4 161.2 254C162.5 228.4 168.3 205.7 187 187C205.7 168.3 228.5 162.4 254 161.2C280.4 159.7 359.6 159.7 386 161.2C411.6 162.5 434.3 168.3 453 187C471.7 205.7 477.6 228.4 478.8 254C480.3 280.3 480.3 359.4 478.8 385.9C477.5 411.5 471.7 434.2 453 452.9L453 453z" />
                      </svg>
                      <span><span className="font-sans font-medium">Instagram:</span> <a href={((user as any).instagram as string).startsWith('http') ? (user as any).instagram : `https://instagram.com/${(user as any).instagram}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{(user as any).instagram}</a></span>
                    </li>
                  )}
                  {(user as any).tiktok && (
                    <li className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-neutral-medium flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" fill="currentColor">
                        <path d="M544.5 273.9C500.5 274 457.5 260.3 421.7 234.7L421.7 413.4C421.7 446.5 411.6 478.8 392.7 506C373.8 533.2 347.1 554 316.1 565.6C285.1 577.2 251.3 579.1 219.2 570.9C187.1 562.7 158.3 545 136.5 520.1C114.7 495.2 101.2 464.1 97.5 431.2C93.8 398.3 100.4 365.1 116.1 336C131.8 306.9 156.1 283.3 185.7 268.3C215.3 253.3 248.6 247.8 281.4 252.3L281.4 342.2C266.4 337.5 250.3 337.6 235.4 342.6C220.5 347.6 207.5 357.2 198.4 369.9C189.3 382.6 184.4 398 184.5 413.8C184.6 429.6 189.7 444.8 199 457.5C208.3 470.2 221.4 479.6 236.4 484.4C251.4 489.2 267.5 489.2 282.4 484.3C297.3 479.4 310.4 469.9 319.6 457.2C328.8 444.5 333.8 429.1 333.8 413.4L333.8 64L421.8 64C421.7 71.4 422.4 78.9 423.7 86.2C426.8 102.5 433.1 118.1 442.4 131.9C451.7 145.7 463.7 157.5 477.6 166.5C497.5 179.6 520.8 186.6 544.6 186.6L544.6 274z" />
                      </svg>
                      <span><span className="font-sans font-medium">TikTok:</span> <a href={((user as any).tiktok as string).startsWith('http') ? (user as any).tiktok : `https://tiktok.com/@${(user as any).tiktok}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{(user as any).tiktok}</a></span>
                    </li>
                  )}
                </ul>
              </section>


            </>
          ) : (
            <section className="border-t border-neutral-light pt-4 mb-6 text-center">
              <Button onClick={() => navigate('/login', { state: { from: location.pathname } })} variant="primary" size="lg">
                เข้าสู่ระบบเพื่อดูข้อมูลติดต่อ
              </Button>
            </section>
          )}

          <footer className="text-center mt-8">
            <Button onClick={onBack} variant="outline" colorScheme="secondary" size="md">กลับไปหน้ารายการ</Button>
          </footer>
        </article>
      </main>
      {vouchModalUser && currentUser && <VouchModal isOpen={!!vouchModalUser} onClose={() => setVouchModalUser(null)} userToVouch={vouchModalUser} currentUser={currentUser} />}
      {vouchListModalUser && <VouchesListModal isOpen={!!vouchListModalUser} onClose={() => setVouchListModalUser(null)} userToList={vouchListModalUser} navigateToPublicProfile={(uid) => navigate(`/profile/${uid}`)} onReportVouch={(vouch, mode) => { setVouchListModalUser(null); setReportVouchModalData({ vouchToReport: vouch, mode }); }} currentUser={currentUser} />}
      {reportVouchModalData && <ReportVouchModal isOpen={!!reportVouchModalData} onClose={() => setReportVouchModalData(null)} vouchToReport={reportVouchModalData.vouchToReport} mode={reportVouchModalData.mode} />}
    </>
  );
};
