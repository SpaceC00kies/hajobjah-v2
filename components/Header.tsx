
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User, WebboardPost, WebboardComment } from '../types/types.ts';
import { UserRole, ACTIVITY_BADGE_DETAILS } from '../types/types.ts';
import { UserLevelBadge } from './UserLevelBadge.tsx';
import { getUserDisplayBadge } from '../utils/userUtils.ts';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
    currentUser: User | null;
    onLogout: () => void;
    getAuthorDisplayName: (userId: string, fallbackName?: string) => string;
    allWebboardPostsForAdmin: WebboardPost[];
    webboardComments: WebboardComment[];
    users: User[];
}

const menuBackdropVariants = {
  open: { opacity: 1, transition: { duration: 0.3 } },
  closed: { opacity: 0, transition: { duration: 0.3, delay: 0.2 } },
};

const menuPanelVariants = {
  open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  closed: { x: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
};

const menuContentVariants = {
  open: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.2, duration: 0.4, ease: "easeOut" as const }
  },
  closed: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2 }
  },
};

const MenuToggle = ({ toggle }: { toggle: () => void }) => (
    <button
      onClick={toggle}
      className="relative w-8 h-8 p-0 flex items-center justify-center rounded-full focus:outline-none hover:bg-primary-light/50 transition-colors"
      aria-label="Open menu"
    >
      <div className="space-y-1.5">
          <span className="block w-6 h-0.5 bg-primary-dark"></span>
          <span className="block w-6 h-0.5 bg-primary-dark"></span>
          <span className="block w-6 h-0.5 bg-primary-dark"></span>
      </div>
    </button>
);

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, allWebboardPostsForAdmin, webboardComments, users }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigate = (path: string) => {
        navigate(path);
        setIsMobileMenuOpen(false);
    };

    const displayBadgeForProfile = getUserDisplayBadge(currentUser, allWebboardPostsForAdmin, webboardComments);
    
    type NavItem = {
        label: string;
        emoji: string;
        path: string;
        action?: () => void;
        specialStyle?: 'login' | 'logout' | 'special';
    };

    const getButtonClass = (item: NavItem) => {
        const baseClass = 'nav-pill';
        const isActive = item.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(item.path);
            
        if (item.specialStyle === 'login') return `${baseClass} nav-pill-login`;
        if (item.specialStyle === 'logout') return `${baseClass} nav-pill-logout`;
        if (item.specialStyle === 'special') return `${baseClass} nav-pill-special ${isActive ? 'active' : ''}`;
        return `${baseClass} nav-pill-default ${isActive ? 'active' : ''}`;
    };
    
    const navItems: NavItem[] = currentUser
      ? [
          ...(location.pathname !== '/' ? [{ label: "หน้าแรก", emoji: "🏠", path: "/" }] : []),
          ...((currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer) ? [{ label: "Admin", emoji: "🔐", path: "/admin", specialStyle: 'special' as const }] : []),
          { label: "ห้องของฉัน", emoji: "🛋️", path: "/my-room/profile", specialStyle: 'special' as const },
          { label: "ประกาศงาน", emoji: "📢", path: "/find-jobs" },
          { label: "โปรไฟล์ผู้ช่วย", emoji: "👥", path: "/find-helpers" },
          { label: "บทความ", emoji: "📖", path: "/blog" },
          { label: "กระทู้พูดคุย", emoji: "💬", path: "/webboard" },
          { label: "ออกจากระบบ", emoji: "🔓", path: "/login", action: onLogout, specialStyle: 'logout' as const },
        ]
      : [
          ...(location.pathname !== '/' ? [{ label: "หน้าแรก", emoji: "🏠", path: "/" }] : []),
          { label: "เข้าสู่ระบบ", emoji: "🔑", path: "/login", specialStyle: 'login' as const },
          { label: "ลงทะเบียน", emoji: "📝", path: "/register" },
          { label: "บทความ", emoji: "📖", path: "/blog" },
        ];

    const renderLinks = (isMobile: boolean) => {
        const itemWrapper = (item: NavItem) => (
            <button
              onClick={() => (item.action ? item.action() : handleNavigate(item.path))}
              className={`${getButtonClass(item)} ${isMobile ? 'w-full justify-start text-left py-3' : ''}`}
            >
              <span className="inline-flex items-center gap-2.5">
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </span>
            </button>
        );
        return navItems.map(item => <React.Fragment key={item.label}>{itemWrapper(item)}</React.Fragment>);
    };

    const greeting = currentUser && (
        <div className={`font-sans font-medium ${isMobileMenuOpen ? 'text-base mb-3 py-2 px-4 border-b border-primary-light w-full text-left text-primary-dark' : 'hidden lg:flex items-center gap-2 text-primary-dark whitespace-nowrap overflow-hidden'}`}
             title={`สวัสดี, ${currentUser.publicDisplayName}!`}>
            <span className={isMobileMenuOpen ? '' : 'truncate'}>สวัสดี, {currentUser.publicDisplayName}!</span>
            <div className="flex-shrink-0"><UserLevelBadge level={displayBadgeForProfile} size="sm" /></div>
            {currentUser.activityBadge?.isActive && (<div className="flex-shrink-0"><UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" /></div>)}
        </div>
    );
    
    return (
        <>
        <header className="main-navbar sticky top-0 z-30 w-full bg-white text-primary-dark p-4 sm:p-5 lg:p-6 shadow-md border-b border-primary-light">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-x-4 lg:gap-x-6 min-w-0">
              <div className="flex-shrink-0">
                  <span onClick={() => handleNavigate('/')} className="cursor-pointer font-sans font-bold text-lg sm:text-xl lg:text-2xl" style={{color: 'var(--primary-blue)'}}>HAJOBJA.COM</span>
              </div>
              {greeting}
            </div>
            <div className="flex-grow">
              <nav className="hidden lg:flex items-center flex-nowrap justify-end gap-2">{renderLinks(false)}</nav>
              <div className="lg:hidden flex justify-end"><MenuToggle toggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} /></div>
            </div>
          </div>
        </header>
        <AnimatePresence>
            {isMobileMenuOpen && (
                <motion.div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" initial="closed" animate="open" exit="closed">
                    <motion.div key="backdrop" variants={menuBackdropVariants} className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
                    <motion.div key="menuPanel" variants={menuPanelVariants} className="fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl z-50 overflow-y-auto">
                        <div className="flex justify-between items-center p-4 border-b border-primary-light">
                            <h2 className="text-xl font-bold font-sans text-primary">เมนู</h2>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-primary-dark" aria-label="Close menu">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <motion.div className="flex flex-col items-start p-5 space-y-2" variants={menuContentVariants}>
                            {greeting}
                            {renderLinks(true)}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
};
