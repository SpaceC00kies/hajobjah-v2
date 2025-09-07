import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BlogHeaderProps {
    currentUser: any;
}

export const BlogHeader: React.FC<BlogHeaderProps> = ({ }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [scrollOpacity, setScrollOpacity] = useState(0);


    const isArticlePage = location.pathname.startsWith('/blog/') && location.pathname !== '/blog';

    // Handle navigation - simplified to prevent state issues
    const handleNavigation = (path: string) => {
        navigate(path);
    };

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const threshold = 50;

            // Smooth scroll detection with gradual opacity
            const opacity = Math.min(scrollTop / threshold, 1);
            setScrollOpacity(opacity);
            setIsScrolled(scrollTop > 20); // Earlier threshold for smoother transition
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 w-full py-3 sm:py-4 transition-all duration-300 ease-out"
            style={{
                backgroundColor: isArticlePage
                    ? 'rgba(255, 255, 255, 0.9)'
                    : `rgba(255, 255, 255, ${scrollOpacity * 0.9})`,
                backdropFilter: (isScrolled || isArticlePage) ? 'blur(8px)' : 'none',
                borderBottom: (isScrolled || isArticlePage)
                    ? '1px solid rgba(229, 231, 235, 0.3)'
                    : '1px solid transparent'
            }}
        >
            <div className="container mx-auto px-4 sm:px-6 flex justify-between items-center">
                {/* Left: Blog Brand */}
                <div className="flex items-center min-w-0 flex-1">
                    <span
                        onClick={() => handleNavigation('/')}
                        className={`cursor-pointer font-sans font-bold text-base sm:text-lg transition-colors duration-300 ease-out ${isScrolled || isArticlePage
                            ? 'text-blue-600'
                            : 'text-white'
                            }`}
                    >
                        HAJOBJA.COM
                    </span>
                </div>

                {/* Right: Navigation */}
                <div className="flex items-center gap-4 sm:gap-4 flex-shrink-0">
                    {isArticlePage ? (
                        <>
                            {/* Back to Articles Button */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleNavigation('/blog');
                                }}
                                className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 ease-out px-2 sm:px-3 py-1.5 rounded-md min-h-[36px] sm:min-h-[40px] focus:outline-none nav-button-fixed ${isScrolled || isArticlePage
                                    ? 'text-neutral-600'
                                    : 'text-white'
                                    }`}
                                aria-label="กลับไปหน้าบทความทั้งหมด"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span className="hidden sm:inline">บทความ</span>
                            </button>

                            {/* Back to Homepage Button */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleNavigation('/');
                                }}
                                className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded-md min-h-[36px] sm:min-h-[40px] focus:outline-none blog-homepage-button ${isArticlePage || isScrolled
                                    ? 'text-neutral-600'
                                    : 'text-white'
                                    }`}
                                aria-label="กลับไปหน้าแรก"
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span className="hidden sm:inline">โฮมเพจ</span>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleNavigation('/');
                            }}
                            className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2 sm:px-3 py-1.5 rounded-md min-h-[36px] sm:min-h-[40px] focus:outline-none blog-homepage-button ${isScrolled || isArticlePage
                                ? 'text-neutral-600'
                                : 'text-white'
                                }`}
                            aria-label="กลับไปหน้าแรก"
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            <span className="hidden sm:inline">โฮมเพจ</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};