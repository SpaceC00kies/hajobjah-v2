

import type { User, WebboardPost, WebboardComment, UserLevel } from '../types/types.ts';
import { USER_LEVELS, ADMIN_BADGE_DETAILS, MODERATOR_BADGE_DETAILS } from '../types/types.ts';

export const getAuthorDisplayName = (userId: string, fallbackName: string | undefined, users: User[]): string => {
  const user = users.find(u => u.id === userId);
  return user?.publicDisplayName || fallbackName || userId;
};

export const checkProfileCompleteness = (user: User): boolean => {
  return (
    !!user.publicDisplayName &&
    !!user.email &&
    !!user.mobile &&
    !!user.gender &&
    !!user.birthdate &&
    !!user.educationLevel
  );
};

export const calculateUserLevel = (userId: string, posts: WebboardPost[], comments: WebboardComment[]): UserLevel => {
  const userPostCount = posts.filter(p => p.userId === userId).length;
  const userCommentCount = comments.filter(c => c.userId === userId).length;
  const score = userPostCount * 2 + userCommentCount;

  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (USER_LEVELS[i].minScore !== undefined && score >= USER_LEVELS[i].minScore!) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
};

export const getUserDisplayBadge = (user: User | null | undefined, posts?: WebboardPost[], comments?: WebboardComment[]): UserLevel => {
  if (!user) return USER_LEVELS[0];
  if (user.role === 'Admin') return ADMIN_BADGE_DETAILS;
  if (user.role === 'Moderator') return MODERATOR_BADGE_DETAILS;
  return calculateUserLevel(user.id, posts || [], comments || []);
};