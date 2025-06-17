
import React from 'react';
import type { User, HelperProfile } from '../types'; 
import { HelperEducationLevelOption, GenderOption, ACTIVITY_BADGE_DETAILS } from '../types'; // Added ACTIVITY_BADGE_DETAILS
import { Button } from './Button';
import { UserLevelBadge } from './UserLevelBadge'; 

interface PublicProfilePageProps {
  user: User; 
  helperProfile?: HelperProfile; 
  onBack: () => void; 
  currentUser: User | null; 
}

const FallbackAvatarPublic: React.FC<{ name?: string, size?: string }> = ({ name, size = "w-40 h-40" }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '👤';
  return (
    <div className={`${size} rounded-full bg-neutral dark:bg-dark-inputBg flex items-center justify-center text-6xl font-sans text-white dark:text-dark-text shadow-lg mx-auto`}>
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
  return (
    <div className="flex gap-1 flex-wrap my-3 justify-center font-sans">
      {helperProfile?.adminVerifiedExperience && (
        <span className="bg-yellow-200 text-yellow-800 dark:bg-yellow-600/30 dark:text-yellow-200 text-sm px-2.5 py-1 rounded-full font-medium">⭐ ผ่านงานมาก่อน</span>
      )}
      {user.profileComplete && (
        <span className="bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-200 text-sm px-2.5 py-1 rounded-full font-medium">🟢 โปรไฟล์ครบถ้วน</span>
      )}
      {helperProfile?.isSuspicious && ( 
        <span className="bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-200 text-sm px-2.5 py-1 rounded-full font-medium">🔺 ระวังผู้ใช้นี้</span>
      )}
      {user.activityBadge?.isActive && (
        <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="md" />
      )}
    </div>
  );
};

export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ user, helperProfile, onBack, currentUser }) => {
  const age = calculateAgePublic(user.birthdate);

  const renderInfoItem = (label: string, value?: string | number | null, highlight: boolean = false, isMultiline: boolean = false, fullWidth: boolean = false) => {
    if ((value === undefined || value === null || (typeof value === 'string' && !value.trim())) && value !== 0) return null;
    
    let valueClass = 'text-neutral-medium dark:text-dark-textMuted';
    if (highlight) {
      valueClass = 'text-lg text-secondary-hover dark:text-dark-secondary-hover font-semibold';
    }

    return (
      <div className={`mb-3 ${fullWidth ? 'md:col-span-2' : ''}`}>
        <span className="font-sans font-medium text-neutral-dark dark:text-dark-text">{label}: </span>
        {isMultiline ? (
            <div className={`font-serif whitespace-pre-wrap ${valueClass} mt-1`}>
             {value}
            </div>
        ) : (
            <span className={`font-serif ${valueClass}`}>
            {value}
            </span>
        )}
      </div>
    );
  };
  
  const personalityItems = [
    { label: "🎧 เพลงที่ชอบ", value: user.favoriteMusic },
    { label: "📚 หนังสือที่ชอบ", value: user.favoriteBook },
    { label: "🎬 หนังที่ชอบ", value: user.favoriteMovie },
    { label: "🧶 งานอดิเรก", value: user.hobbies, isMultiline: true }, // isMultiline here is for default value, will be overridden for rendering
    { label: "🍜 อาหารที่ชอบ", value: user.favoriteFood },
    { label: "🚫 สิ่งที่ไม่ชอบที่สุด", value: user.dislikedThing },
    // "เกี่ยวกับฉันสั้นๆ" is now handled separately
  ].filter(item => item.value && item.value.trim() !== '');


  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-2xl my-8">
      <div className="bg-white dark:bg-dark-cardBg shadow-xl rounded-xl p-6 md:p-10 border border-neutral-DEFAULT dark:border-dark-border">
        
        <div className="text-center mb-6">
          {user.photo ? (
            <img src={user.photo} alt={user.publicDisplayName} className="w-40 h-40 rounded-full object-cover shadow-lg mx-auto mb-4" />
          ) : (
            <FallbackAvatarPublic name={user.publicDisplayName} />
          )}
          <h2 className="text-3xl font-sans font-bold text-secondary-hover dark:text-dark-secondary-hover mt-4">
            {user.publicDisplayName}
          </h2>
          {user.userLevel && <UserLevelBadge level={user.userLevel} size="md" />}
          <TrustBadgesPublicProfile user={user} helperProfile={helperProfile} />
           {user.activityBadge?.isActive && (
            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-700/20 border border-orange-200 dark:border-orange-500/40 rounded-md text-xs font-sans">
                <p className="font-medium text-orange-600 dark:text-orange-300">สิทธิพิเศษสำหรับผู้ใช้ "🔥 ขยันใช้เว็บ":</p>
                <ul className="list-disc list-inside text-left ml-4 text-orange-500 dark:text-orange-400">
                    <li>โพสต์กระทู้ได้ 4 ครั้ง/วัน (ปกติ 3)</li>
                    <li>มีโปรไฟล์ผู้ช่วยได้ 2 โปรไฟล์พร้อมกัน (ปกติ 1)</li>
                </ul>
            </div>
          )}
        </div>

        <div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30 dark:border-dark-border/30">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark dark:text-dark-text mb-3">ข้อมูลส่วนตัว:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0"> 
                {renderInfoItem("ชื่อเล่น", user.nickname)}
                {renderInfoItem("ชื่อจริง", user.firstName)}
                {renderInfoItem("นามสกุล", user.lastName)}
                {renderInfoItem("อายุ", age ? `${age} ปี` : (user.birthdate ? 'ข้อมูลวันเกิดไม่ถูกต้อง' : null))}
                {renderInfoItem("เพศ", user.gender !== GenderOption.NotSpecified ? user.gender : null)}
                {renderInfoItem("ระดับการศึกษา", user.educationLevel !== HelperEducationLevelOption.NotStated ? user.educationLevel : null)}
                {renderInfoItem("ที่อยู่", user.address, false, true, true)}
            </div>
        </div>
        
        {helperProfile && helperProfile.details && helperProfile.details.trim() !== '' && (
          <div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30 dark:border-dark-border/30">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark dark:text-dark-text mb-2">รายละเอียดทักษะ/ประสบการณ์ที่เกี่ยวข้อง:</h3>
            <p className="font-serif text-neutral-medium dark:text-dark-textMuted whitespace-pre-wrap p-3 bg-neutral-light dark:bg-dark-inputBg/50 rounded-md">
              {helperProfile.details}
            </p>
          </div>
        )}

        {user.introSentence && user.introSentence.trim() !== '' && (
          <div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30 dark:border-dark-border/30">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark dark:text-dark-text mb-2">💬 เกี่ยวกับฉัน</h3>
            <p className="font-serif text-neutral-medium dark:text-dark-textMuted whitespace-pre-wrap p-3 bg-neutral-light dark:bg-dark-inputBg/50 rounded-md">
              {user.introSentence}
            </p>
          </div>
        )}
        
        {personalityItems.length > 0 && (
          <div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30 dark:border-dark-border/30">
            <h3 className="text-xl font-sans font-semibold text-neutral-dark dark:text-dark-text mb-3">ข้อมูลเพิ่มเติม:</h3>
            <div className="space-y-1 bg-neutral-light/50 dark:bg-dark-inputBg/30 p-4 rounded-lg">
                {/* Always render these items with isMultiline true for consistent "label on top" layout */}
                {personalityItems.map(item => renderInfoItem(item.label, item.value, false, true))}
            </div>
          </div>
        )}

        {/* Contact information section removed as per request */}

        <div className="mt-8 text-center">
          <Button onClick={onBack} variant="outline" colorScheme="secondary" size="md">
            กลับไปหน้ารายการ
          </Button>
        </div>
      </div>
    </div>
  );
};
