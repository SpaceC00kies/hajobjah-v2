import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User, WebboardPost, WebboardComment } from '../types/types.ts';
import { UserRole } from '../types/types.ts';
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
  open: { opacity: 1, transition: { duration: 0.15 } },
  closed: { opacity: 0, transition: { duration: 0.15 } },
};

const menuPanelVariants = {
  open: { x: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
  closed: { x: '100%', transition: { duration: 0.2, ease: "easeIn" as const } },
};

const MenuToggle = React.forwardRef<HTMLButtonElement, { toggle: () => void; isOpen: boolean }>(
  ({ toggle, isOpen }, ref) => (
    <button
      ref={ref}
      onClick={toggle}
      className="relative w-12 h-12 p-3 flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:bg-primary-light/50 transition-colors"
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      aria-controls="mobile-navigation-menu"
      aria-haspopup="true"
    >
      <div className="space-y-1.5">
        <span className="block w-6 h-0.5 bg-primary-dark transition-transform duration-200"></span>
        <span className="block w-6 h-0.5 bg-primary-dark transition-opacity duration-200"></span>
        <span className="block w-6 h-0.5 bg-primary-dark transition-transform duration-200"></span>
      </div>
    </button>
  )
);

MenuToggle.displayName = 'MenuToggle';

const DesktopGreeting: React.FC<{ currentUser: User }> = ({ currentUser }) => (
  <div className="hidden lg:flex items-center gap-2 font-sans font-medium text-primary-dark whitespace-nowrap">
    <span>สวัสดี, {currentUser.publicDisplayName}!</span>
  </div>
);

const MobileGreeting: React.FC<{ currentUser: User }> = ({ currentUser }) => (
  <div className="font-sans font-medium text-sm py-2 px-3 border-b border-primary-light w-full text-primary-dark text-center bg-primary/5">
    <span>สวัสดี, {currentUser.publicDisplayName}!</span>
  </div>
);

type NavItem = {
  label: string;
  path: string;
  action?: () => void;
  specialStyle?: 'login' | 'logout' | 'special';
};

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, allWebboardPostsForAdmin, webboardComments, users }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);
  const lastMenuItemRef = useRef<HTMLButtonElement>(null);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => {
      const newState = !prev;
      // If opening the menu via click, blur the toggle button to remove focus ring
      if (newState) {
        setTimeout(() => {
          menuToggleRef.current?.blur();
        }, 50);
      }
      return newState;
    });
  };

  const closeMobileMenuWithFocus = () => {
    setIsMobileMenuOpen(false);
    // Return focus to menu toggle when menu closes via keyboard
    setTimeout(() => {
      menuToggleRef.current?.focus();
    }, 100);
  };

  // Focus management for mobile menu - removed auto-focus to prevent unwanted blue border
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Don't auto-focus first item to avoid unwanted focus ring
      // Focus will be managed by keyboard navigation instead
    }
  }, [isMobileMenuOpen]);

  // Keyboard navigation for mobile menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isMobileMenuOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closeMobileMenuWithFocus();
          break;
        case 'Tab':
          // Focus trap within mobile menu
          const focusableElements = mobileMenuRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (event.shiftKey && document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
          break;
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const getAdminNavLink = (): NavItem[] => {
    if (currentUser?.role === UserRole.Admin) {
      return [{ label: "Admin", path: "/admin" }];
    }
    if (currentUser?.role === UserRole.Writer) {
      return [{ label: "นักเขียน", path: "/admin" }];
    }
    return [];
  };

  const getButtonClass = (item: NavItem, isMobile: boolean = false) => {
    const isActive = location.pathname === '/' ? item.path === '/' : item.path !== '/' && location.pathname.startsWith(item.path);
    const baseClass = `font-sans text-sm font-medium transition-all duration-200 rounded-md relative ${isMobile ? 'px-3 py-1' : 'px-3 py-1.5'}`;

    if (item.specialStyle === 'login') {
      return `${baseClass} text-white bg-primary hover:bg-primary-hover`;
    }
    if (item.specialStyle === 'logout') {
      return `${baseClass} text-accent hover:bg-accent/10`;
    }

    if (isActive) {
      return `${baseClass} text-primary bg-primary/8`;
    }

    return `${baseClass} text-primary-dark hover:text-primary hover:bg-primary/5`;
  };

  const navItems: NavItem[] = currentUser
    ? [
      ...(location.pathname !== '/' ? [{ label: "หน้าแรก", path: "/" }] : []),
      ...getAdminNavLink(),
      { label: "ห้องของฉัน", path: "/my-room/profile" },
      { label: "ประกาศรับสมัคร", path: "/find-jobs" },
      { label: "เสนอโปรไฟล์", path: "/find-helpers" },
      { label: "นิตยาสาร", path: "/blog" },
      { label: "ออกจากระบบ", path: "/login", action: onLogout, specialStyle: 'logout' as const },
    ]
    : [
      ...(location.pathname !== '/' ? [{ label: "หน้าแรก", path: "/" }] : []),
      { label: "เข้าสู่ระบบ", path: "/login", specialStyle: 'login' as const },
      { label: "ลงทะเบียน", path: "/register" },
      { label: "นิตยาสาร", path: "/blog" },
    ];

  const renderLinks = (isMobile: boolean) => {
    const itemWrapper = (item: NavItem, index: number) => (
      <button
        ref={isMobile && index === 0 ? firstMenuItemRef :
          isMobile && index === navItems.length - 1 ? lastMenuItemRef : undefined}
        onClick={() => (item.action ? item.action() : handleNavigate(item.path))}
        className={`${getButtonClass(item, isMobile)} ${isMobile ? 'w-full text-left justify-start min-h-[48px] flex items-center' : 'min-h-[44px] flex items-center'}`}
        aria-current={location.pathname === '/' ? (item.path === '/' ? 'page' : undefined) :
          (item.path !== '/' && location.pathname.startsWith(item.path) ? 'page' : undefined)}
      >
        {item.label}
      </button>
    );
    return navItems.map((item, index) => <React.Fragment key={item.label}>{itemWrapper(item, index)}</React.Fragment>);
  };

  return (
    <>
      <header className="main-navbar sticky lg:relative top-0 z-30 w-full bg-transparent text-primary-dark p-3 sm:p-4 lg:p-5">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-x-4 lg:gap-x-6 min-w-0">
            <div className="flex-shrink-0">
              <span onClick={() => handleNavigate('/')} className="cursor-pointer font-sans font-bold text-lg sm:text-xl lg:text-2xl" style={{ color: 'var(--primary-blue)' }}>HAJOBJA.COM</span>
            </div>
            {currentUser && <DesktopGreeting currentUser={currentUser} />}
          </div>
          <div className="flex-grow">
            <nav className="hidden lg:flex items-center flex-nowrap justify-end gap-2" role="navigation" aria-label="Main navigation">{renderLinks(false)}</nav>
            <div className="lg:hidden flex justify-end">
              <MenuToggle
                ref={menuToggleRef}
                toggle={toggleMobileMenu}
                isOpen={isMobileMenuOpen}
              />
            </div>
          </div>
        </div>
      </header>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div className="fixed inset-0 z-[9999] lg:hidden" role="dialog" aria-modal="true" initial="closed" animate="open" exit="closed">
            <motion.div key="backdrop" variants={menuBackdropVariants} className="fixed inset-0 bg-neutral-dark/60 backdrop-blur-sm z-[9998]" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
            <motion.div
              key="menuPanel"
              ref={mobileMenuRef}
              variants={menuPanelVariants}
              className="fixed top-0 right-0 w-4/5 max-w-xs bg-white shadow-xl z-[10000] rounded-l-2xl h-full flex flex-col"
              id="mobile-navigation-menu"
              role="navigation"
              aria-label="Mobile navigation menu"
            >
              <div className="flex justify-between items-center p-3 border-b border-primary-light flex-shrink-0">
                <h2 className="text-lg font-bold font-sans text-primary">เมนู</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-primary-dark hover:bg-primary-light/50 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col flex-1">
                {currentUser && <MobileGreeting currentUser={currentUser} />}
                <nav className="px-2 py-2 flex-1 flex flex-col gap-1" role="navigation" aria-label="Main navigation">
                  {renderLinks(true)}
                </nav>
                <div className="p-3 text-center flex-shrink-0 border-t border-primary-light/30">
                  <p className="text-xs text-neutral-gray font-sans">HAJOBJA.COM</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};