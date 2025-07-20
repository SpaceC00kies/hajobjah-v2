// components/Header.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useAuthActions } from '@/hooks/useAuthActions';
import { UserRole, ACTIVITY_BADGE_DETAILS } from '@/types/types';
import { UserLevelBadge } from './UserLevelBadge';
import { getUserDisplayBadge } from '@/utils/userUtils';
import { motion, AnimatePresence } from 'framer-motion';

const menuBackdropVariants = {
  open: { opacity: 1, transition: { duration: 0.3 } },
  closed: { opacity: 0, transition: { duration: 0.3, delay: 0.2 } },
};

const menuPanelVariants = {
  open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  closed: { x: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
};

const menuContentVariants = {
  open: { opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.4, ease: "easeOut" as const } },
  closed: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

type NavItem = {
  label: string;
  emoji: string;
  href?: string;
  action?: () => void;
  special?: boolean | 'login' | 'logout';
};

export const Header: React.FC = () => {
    const { currentUser, isLoadingAuth } = useAuth();
    const { allWebboardPostsForAdmin, webboardComments } = useData();
    const authActions = useAuthActions();
    const router = useRouter();
    const currentPath = usePathname();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const onLogout = async () => {
        await authActions.logout();
        setIsMobileMenuOpen(false);
        router.push('/');
    };
    
    const navigateAndCloseMenu = (path: string) => {
        router.push(path);
        setIsMobileMenuOpen(false);
    };

    const renderNavLinks = (isMobile: boolean) => {
        const displayBadge = getUserDisplayBadge(currentUser, allWebboardPostsForAdmin, webboardComments);

        const navItems: NavItem[] = currentUser
          ? [
              ...(currentPath !== '/' ? [{ label: "หน้าแรก", emoji: "🏠", href: "/" }] : []),
              ...((currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer) ? [{ label: "Admin", emoji: "🔐", href: "/admin/dashboard", special: true }] : []),
              { label: "ห้องของฉัน", emoji: "🛋️", href: "/my-room", special: true },
              { label: "ประกาศงาน", emoji: "📢", href: "/find-jobs" },
              { label: "โปรไฟล์ผู้ช่วย", emoji: "👥", href: "/find-helpers" },
              { label: "บทความ", emoji: "📖", href: "/blog" },
              { label: "กระทู้พูดคุย", emoji: "💬", href: "/webboard" },
              { label: "ออกจากระบบ", emoji: "🔓", action: onLogout, special: 'logout' as const },
            ]
          : [
              ...(currentPath !== '/' ? [{ label: "หน้าแรก", emoji: "🏠", href: "/" }] : []),
              { label: "เข้าสู่ระบบ", emoji: "🔑", href: "/login", special: 'login' as const },
              { label: "ลงทะเบียน", emoji: "📝", href: "/register" },
              { label: "บทความ", emoji: "📖", href: "/blog" },
            ];

        const getButtonClass = (item: NavItem) => {
            const baseClass = 'nav-pill';
            const isActive = currentPath === item.href;
            if (item.special === 'login') return `${baseClass} nav-pill-login`;
            if (item.special === 'logout') return `${baseClass} nav-pill-logout`;
            if (item.special === true) return `${baseClass} nav-pill-special ${isActive ? 'active' : ''}`;
            return `${baseClass} nav-pill-default ${isActive ? 'active' : ''}`;
        };

        const itemContent = (item: NavItem) => (
            <span className="inline-flex items-center gap-2.5">
                <span>{item.emoji}</span>
                <span>{item.label}</span>
            </span>
        );

        if (isMobile) {
            return <>
                {currentUser && (
                    <div className="font-sans font-medium text-base mb-3 py-2 px-4 border-b border-primary-light w-full text-left text-primary-dark">
                        สวัสดี, {currentUser.publicDisplayName}!
                        <UserLevelBadge level={displayBadge} size="sm" />
                        {currentUser.activityBadge?.isActive && <UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" />}
                    </div>
                )}
                {navItems.map(item => (
                    <button key={item.label} onClick={() => (item.action ? item.action() : navigateAndCloseMenu(item.href!))} className={`${getButtonClass(item)} w-full justify-start text-left py-3`}>
                        {itemContent(item)}
                    </button>
                ))}
            </>;
        }

        return navItems.map(item => (
            <button key={item.label} onClick={() => (item.action ? item.action() : navigateAndCloseMenu(item.href!))} className={getButtonClass(item)}>
                {itemContent(item)}
            </button>
        ));
    };

    const MenuToggle = ({ toggle }: { toggle: () => void }) => (
      <button onClick={toggle} className="relative w-8 h-8 p-0 flex items-center justify-center rounded-full focus:outline-none hover:bg-primary-light/50 transition-colors" aria-label="Open menu">
        <div className="space-y-1.5"><span className="block w-6 h-0.5 bg-primary-dark"></span><span className="block w-6 h-0.5 bg-primary-dark"></span><span className="block w-6 h-0.5 bg-primary-dark"></span></div>
      </button>
    );

    if (isLoadingAuth) return <header className="h-20" />;

    const displayBadgeForProfile = getUserDisplayBadge(currentUser, allWebboardPostsForAdmin, webboardComments);

    return (
        <>
            <header className="main-navbar sticky top-0 z-30 w-full bg-white text-primary-dark p-4 sm:p-5 lg:p-6 shadow-md border-b border-primary-light">
              <div className="container mx-auto flex justify-between items-center">
                <div className="flex items-center gap-x-4 lg:gap-x-6 min-w-0">
                    <Link href="/" passHref><div className="cursor-pointer font-sans font-bold text-lg sm:text-xl lg:text-2xl" style={{color: 'var(--primary-blue)'}}>HAJOBJA.COM</div></Link>
                    {currentUser && (
                        <div className="hidden lg:flex items-center gap-2 font-sans font-medium text-primary-dark whitespace-nowrap overflow-hidden" title={`สวัสดี, ${currentUser.publicDisplayName}!`}>
                            <span className="truncate">สวัสดี, {currentUser.publicDisplayName}!</span>
                            <div className="flex-shrink-0"><UserLevelBadge level={displayBadgeForProfile} size="sm" /></div>
                            {currentUser.activityBadge?.isActive && (<div className="flex-shrink-0"><UserLevelBadge level={ACTIVITY_BADGE_DETAILS} size="sm" /></div>)}
                        </div>
                    )}
                </div>
                <div className="flex-grow">
                    <nav className="hidden lg:flex items-center flex-nowrap justify-end gap-2">{renderNavLinks(false)}</nav>
                    <div className="lg:hidden flex justify-end"><MenuToggle toggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} /></div>
                </div>
              </div>
            </header>
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" initial="closed" animate="open" exit="closed">
                        <motion.div key="backdrop" variants={menuBackdropVariants} className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true"/>
                        <motion.div key="menuPanel" variants={menuPanelVariants} className="fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl z-50 overflow-y-auto">
                            <div className="flex justify-between items-center p-4 border-b border-primary-light">
                                <h2 className="text-xl font-bold font-sans text-primary">เมนู</h2>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-primary-dark" aria-label="Close menu">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <motion.div className="flex flex-col items-start p-5 space-y-2" variants={menuContentVariants}>{renderNavLinks(true)}</motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};