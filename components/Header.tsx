// components/Header.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useAuthActions } from '@/hooks/useAuthActions';
import { UserRole, ACTIVITY_BADGE_DETAILS } from '@/types/types';
import { UserLevelBadge } from './UserLevelBadge';
import { getUserDisplayBadge } from '@/utils/userUtils';
import { motion, AnimatePresence } from 'framer-motion';

const menuBackdropVariants = { open: { opacity: 1 }, closed: { opacity: 0 }};
const menuPanelVariants = { open: { x: 0 }, closed: { x: '100%' }};
const menuContentVariants = { open: { opacity: 1, y: 0 }, closed: { opacity: 0, y: 20 }};

export const Header: React.FC = () => {
    const { currentUser, isLoadingAuth } = useAuth();
    const { allWebboardPostsForAdmin, webboardComments } = useData();
    const authActions = useAuthActions();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const currentPath = usePathname();
    
    const onLogout = async () => {
        await authActions.logout();
        window.location.href = '/';
    };

    const renderNavLinks = (isMobile: boolean) => {
        const displayBadge = getUserDisplayBadge(currentUser, allWebboardPostsForAdmin, webboardComments);
        const navItems = currentUser
          ? [
              ...(currentUser.role === UserRole.Admin || currentUser.role === UserRole.Writer ? [{ label: "Admin", href: "/admin/dashboard", special: true }] : []),
              { label: "ห้องของฉัน", href: "/my-room", special: true },
              { label: "ประกาศงาน", href: "/find-jobs" },
              { label: "โปรไฟล์ผู้ช่วย", href: "/find-helpers" },
              { label: "ลงประกาศ", href: "/post-job", special: true },
              { label: "เสนอตัวช่วย", href: "/offer-help", special: true },
              { label: "กระทู้", href: "/webboard" },
              { label: "Logout", action: onLogout, special: true },
            ]
          : [
              { label: "เข้าสู่ระบบ", href: "/login", special: true },
              { label: "ลงทะเบียน", href: "/register" },
              { label: "ประกาศงาน", href: "/find-jobs" },
              { label: "โปรไฟล์ผู้ช่วย", href: "/find-helpers" },
            ];

        return navItems.map(item => (
            item.action ? 
            <button key={item.label} onClick={item.action} className={`nav-pill nav-pill-logout`}>
                {item.label}
            </button> :
            <Link key={item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)} passHref>
                <div className={`nav-pill ${currentPath === item.href ? 'active' : ''} ${item.special ? 'nav-pill-special' : 'nav-pill-default'}`}>
                    {item.label}
                </div>
            </Link>
        ));
    };

    if (isLoadingAuth) return <header className="h-20" />;

    return (
        <>
            <header className="main-navbar sticky top-0 z-30 w-full bg-white text-primary-dark p-4 sm:p-5 shadow-md border-b border-primary-light">
              <div className="container mx-auto flex justify-between items-center">
                <Link href="/" passHref><div className="cursor-pointer font-sans font-bold text-lg sm:text-xl" style={{color: 'var(--primary-blue)'}}>HAJOBJA.COM</div></Link>
                <nav className="hidden lg:flex items-center gap-2">{renderNavLinks(false)}</nav>
                <div className="lg:hidden"><button onClick={() => setIsMobileMenuOpen(true)} aria-label="Open menu">🍔</button></div>
              </div>
            </header>
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div className="fixed inset-0 z-40 lg:hidden" initial="closed" animate="open" exit="closed">
                        <motion.div variants={menuBackdropVariants} className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
                        <motion.div variants={menuPanelVariants} className="fixed top-0 right-0 h-full w-4/5 max-w-xs bg-white shadow-xl z-50">
                            <motion.div variants={menuContentVariants} className="p-5 space-y-2">{renderNavLinks(true)}</motion.div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
