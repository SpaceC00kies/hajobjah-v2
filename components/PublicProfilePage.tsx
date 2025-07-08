

import React from 'react';
import type { User, HelperProfile, VouchInfo } from '../types.ts'; 
import { HelperEducationLevelOption, GenderOption, ACTIVITY_BADGE_DETAILS, VOUCH_TYPE_LABELS, VouchType } from '../types.ts'; 
import { Button } from './Button.tsx';
import { UserLevelBadge } from './UserLevelBadge.tsx'; 

interface PublicProfilePageProps {
  user: User; 
  helperProfile?: HelperProfile; 
  onBack: () => void; 
  currentUser: User | null; 
  onVouchForUser: (userToVouch: User) => void; 
  onShowVouches: (userToList: User) => void; 
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
  return (
    <div className="flex gap-1 flex-wrap my-3 justify-center font-sans">
      {helperProfile?.adminVerifiedExperience && (
        <span className="bg-yellow-200 text-yellow-800 text-sm px-2.5 py-1 rounded-full font-medium">⭐ ผ่านงานมาก่อน</span>
      )}
      {user.profileComplete && (
        <span className="bg-green-100 text-green-700 text-sm px-2.5 py-1 rounded-full font-medium">🟢 โปรไฟล์ครบถ้วน</span>
      )}
      {helperProfile?.isSuspicious && ( 
        <span className="bg-red-100 text-red-700 text-sm px-2.5 py-1 rounded-full font-medium">🔺 ระวังผู้ใช้นี้</span>
      )}
      {user.activityBadge?.isActive && (
        <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="md" />
      )}
    </div>
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
    { type: VouchType.WorkedTogether, label: '🤝 ร่วมงานด้วย', count: vouchInfo.worked_together || 0 },
    { type: VouchType.Colleague, label: '🏢 เพื่อนร่วมงาน', count: vouchInfo.colleague || 0 },
    { type: VouchType.Community, label: '🏘️ คนในพื้นที่', count: vouchInfo.community || 0 },
    { type: VouchType.Personal, label: '😊 คนรู้จัก', count: vouchInfo.personal || 0 },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {vouchItems.map(item => (
          <div key={item.type} className="flex items-center text-sm">
            <span className="font-sans font-medium text-neutral-dark">{item.label}:</span>
            <span className="ml-2 font-sans font-semibold text-secondary-hover">{item.count} คน</span>
          </div>
        ))}
      </div>
      <div className="text-center pt-2">
        <button onClick={onShowVouches} className="text-xs font-sans text-neutral-medium hover:text-secondary hover:underline">
          ดูรายละเอียดการรับรองทั้งหมด ({vouchInfo.total})
        </button>
      </div>
    </div>
  );
};


export const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ user, helperProfile, onBack, currentUser, onVouchForUser, onShowVouches }) => {
  const age = calculateAgePublic(user.birthdate);

  const renderInfoItem = (label: string, value?: string | number | null, highlight: boolean = false, isMultiline: boolean = false, fullWidth: boolean = false, isLink: boolean = false) => {
    if ((value === undefined || value === null || (typeof value === 'string' && !value.trim())) && value !== 0) return null;
    let valueClass = 'text-neutral-medium';
    if (highlight) valueClass = 'text-lg text-secondary-hover font-semibold';
    return (
      <div className={`mb-3 ${fullWidth ? 'md:col-span-2' : ''}`}>
        <span className="font-sans font-medium text-neutral-dark">{label}: </span>
        {isMultiline ? (<div className={`font-serif whitespace-pre-wrap ${valueClass} mt-1`}>{value}</div>)
        : isLink && typeof value === 'string' ? (<a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className={`font-serif ${valueClass} hover:underline text-blue-600`}>{value}</a>)
        : (<span className={`font-serif ${valueClass}`}>{value}</span>)}
      </div>
    );
  };
  
  const personalityItems = [ { label: "🎧 เพลงที่ชอบ", value: user.favoriteMusic }, { label: "📚 หนังสือที่ชอบ", value: user.favoriteBook }, { label: "🎬 หนังที่ชอบ", value: user.favoriteMovie }, { label: "🧶 งานอดิเรก", value: user.hobbies, isMultiline: true }, { label: "🍜 อาหารที่ชอบ", value: user.favoriteFood }, { label: "🚫 สิ่งที่ไม่ชอบที่สุด", value: user.dislikedThing }, ].filter(item => item.value && item.value.trim() !== '');
  const hasBusinessInfo = user.businessName || user.businessType || user.aboutBusiness || user.businessAddress || user.businessWebsite || user.businessSocialProfileLink;

  return (
    <div className="container mx-auto p-4 sm:p-8 max-w-2xl my-8">
      <div className="bg-white shadow-xl rounded-xl p-6 md:p-10 border border-neutral-DEFAULT">
        <div className="text-center mb-6">
          {user.photo ? (<img src={user.photo} alt={user.publicDisplayName} className="w-40 h-40 rounded-full object-cover shadow-lg mx-auto mb-4" />) : (<FallbackAvatarPublic name={user.publicDisplayName} />)}
          <h2 className="text-3xl font-sans font-bold text-secondary-hover mt-4">{user.publicDisplayName}</h2>
          {user.userLevel && <UserLevelBadge level={user.userLevel} size="md" />}
          <TrustBadgesPublicProfile user={user} helperProfile={helperProfile} />
           {user.activityBadge?.isActive && (<div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md text-xs font-sans"><p className="font-medium text-orange-600">สิทธิพิเศษสำหรับผู้ใช้ "🔥 ขยันใช้เว็บ":</p><ul className="list-disc list-inside text-left ml-4 text-orange-500"><li>โพสต์กระทู้ได้ 4 ครั้ง/วัน (ปกติ 3)</li><li>มีโปรไฟล์ผู้ช่วยได้ 2 โปรไฟล์พร้อมกัน (ปกติ 1)</li></ul></div>)}
        </div>
        <div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30"><h3 className="text-xl font-sans font-semibold text-neutral-dark mb-3">⭐ การรับรองจากชุมชน</h3><VouchDisplay vouchInfo={user.vouchInfo} onShowVouches={() => onShowVouches(user)} />{currentUser && currentUser.id !== user.id && (<div className="text-center mt-4"><Button onClick={() => onVouchForUser(user)} variant="outline" colorScheme="primary" size="sm">👍 รับรองคุณ {user.publicDisplayName}</Button></div>)}</div>
        {!user.isBusinessProfile && (<div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30"><h3 className="text-xl font-sans font-semibold text-neutral-dark mb-3">ข้อมูลส่วนตัว:</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">{renderInfoItem("ชื่อเล่น", user.nickname)}{renderInfoItem("ชื่อจริง", user.firstName)}{renderInfoItem("นามสกุล", user.lastName)}{renderInfoItem("อายุ", age ? `${age} ปี` : (user.birthdate ? 'ข้อมูลวันเกิดไม่ถูกต้อง' : null))}{renderInfoItem("เพศ", user.gender !== GenderOption.NotSpecified ? user.gender : null)}{renderInfoItem("ระดับการศึกษา", user.educationLevel !== HelperEducationLevelOption.NotStated ? user.educationLevel : null)}{renderInfoItem("ที่อยู่", user.address, false, true, true)}</div></div>)}
        {helperProfile && helperProfile.details && helperProfile.details.trim() !== '' && (<div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30"><h3 className="text-xl font-sans font-semibold text-neutral-dark mb-2">รายละเอียดทักษะ/ประสบการณ์ที่เกี่ยวข้อง:</h3><p className="font-serif text-neutral-medium whitespace-pre-wrap p-3 bg-neutral-light rounded-md">{helperProfile.details}</p></div>)}
        {!user.isBusinessProfile && user.introSentence && user.introSentence.trim() !== '' && (<div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30"><h3 className="text-xl font-sans font-semibold text-neutral-dark mb-2">💬 เกี่ยวกับฉัน</h3><p className="font-serif text-neutral-medium whitespace-pre-wrap p-3 bg-neutral-light rounded-md">{user.introSentence}</p></div>)}
        {hasBusinessInfo && (<div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30"><h3 className="text-xl font-sans font-semibold text-neutral-dark mb-3">🏢 ข้อมูลธุรกิจ:</h3><div className="space-y-1 bg-neutral-light/30 p-4 rounded-lg border border-neutral-DEFAULT/50">{renderInfoItem("ชื่อธุรกิจ/ร้านค้า", user.businessName)}{renderInfoItem("ประเภทธุรกิจ", user.businessType)}{renderInfoItem("เกี่ยวกับธุรกิจ", user.aboutBusiness, false, true)}{renderInfoItem("ที่ตั้งธุรกิจ", user.businessAddress, false, true)}{renderInfoItem("เว็บไซต์", user.businessWebsite, false, false, false, true)}{renderInfoItem("โซเชียลโปรไฟล์ธุรกิจ", user.businessSocialProfileLink, false, false, false, true)}</div></div>)}
        {!user.isBusinessProfile && personalityItems.length > 0 && (<div className="mb-6 pt-4 border-t border-neutral-DEFAULT/30"><h3 className="text-xl font-sans font-semibold text-neutral-dark mb-3">ข้อมูลเพิ่มเติม:</h3><div className="space-y-1 bg-neutral-light/50 p-4 rounded-lg">{personalityItems.map(item => renderInfoItem(item.label, item.value, false, true))}</div></div>)}
        <div className="mt-8 text-center"><Button onClick={onBack} variant="outline" colorScheme="secondary" size="md">กลับไปหน้ารายการ</Button></div>
      </div>
    </div>
  );
};
