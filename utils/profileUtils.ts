

import type { User } from '../types/types.ts';
import { GenderOption, HelperEducationLevelOption } from '../types/types.ts';

export interface ChecklistItem {
  label: string;
  completed: boolean;
  anchorId: string;
}

export const calculateProfileCompleteness = (user: User): { score: number; checklist: ChecklistItem[] } => {
  const checks: ChecklistItem[] = [
    {
      label: 'เพิ่มรูปโปรไฟล์',
      completed: !!user.photo,
      anchorId: 'profile-photo-section'
    },
    {
      label: 'กรอกข้อมูลส่วนตัวพื้นฐาน',
      completed: 
        !!user.gender && user.gender !== GenderOption.NotSpecified &&
        !!user.birthdate &&
        !!user.educationLevel && user.educationLevel !== HelperEducationLevelOption.NotStated,
      anchorId: 'personal-info-section'
    },
    {
      label: 'กรอกข้อมูลติดต่อเพิ่มเติม (LINE หรือ Facebook)',
      completed: !!(user.lineId?.trim() || user.facebook?.trim()),
      anchorId: 'contact-info-section'
    },
    {
      label: 'บอกเล่าเกี่ยวกับตัวเอง',
      completed: !!user.introSentence?.trim(),
      anchorId: 'intro-section'
    },
    {
      label: 'เพิ่มข้อมูลความชอบส่วนตัว',
      completed: !!(user.favoriteMusic?.trim() || user.favoriteBook?.trim() || user.favoriteMovie?.trim() || user.hobbies?.trim() || user.favoriteFood?.trim() || user.dislikedThing?.trim()),
      anchorId: 'personality-section'
    },
    {
      label: 'กรอกที่อยู่',
      completed: !!user.address?.trim(),
      anchorId: 'address-section'
    }
  ];

  const completedCount = checks.filter(c => c.completed).length;
  const score = Math.round((completedCount / checks.length) * 100);

  return { score, checklist: checks };
};