import React from 'react';
import { motion } from 'framer-motion';

interface ListingPageLayoutProps {
  title: string;
  titleIcon: string | React.ReactNode;
  subtitle?: string;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  isLoading: boolean;
  hasItems: boolean;
  emptyStateMessage: string;
  emptyStateSubMessage: string;
  loadingMessage?: string;
  loadMoreContent?: React.ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const ListingPageLayout: React.FC<ListingPageLayoutProps> = ({
  title,
  titleIcon,
  subtitle,
  sidebar,
  children,
  isLoading,
  hasItems,
  emptyStateMessage,
  emptyStateSubMessage,
  loadingMessage = "กำลังโหลด...",
  loadMoreContent,
}) => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <header className="text-center mb-8">
        <div className="flex flex-col items-center mb-2">
          <div className="mb-1">{titleIcon}</div>
          <h1 className="text-3xl font-sans font-bold text-primary-dark text-center">
            {title}
          </h1>
        </div>
        {subtitle && (
          <p className="text-sm text-neutral-medium font-sans max-w-2xl mx-auto -mt-3">
            {subtitle}
          </p>
        )}
      </header>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8" role="main">
        {/* Sidebar */}
        <aside
          className="lg:col-span-3 mb-8 lg:mb-0"
          role="complementary"
          aria-label="Filters and search options"
        >
          {sidebar}
        </aside>

        {/* Main Content Area */}
        <section
          className="lg:col-span-9"
          role="region"
          aria-label="Search results"
        >
          {isLoading && !hasItems ? (
            <div
              className="text-center py-10 text-primary-dark font-sans"
              role="status"
              aria-live="polite"
            >
              {loadingMessage}
            </div>
          ) : !hasItems ? (
            <div
              className="text-center py-10 bg-white rounded-lg shadow flex flex-col items-center justify-center min-h-[300px]"
              role="status"
              aria-live="polite"
            >
              <p className="text-xl text-neutral-dark mb-2">{emptyStateMessage}</p>
              <p className="text-sm text-neutral-medium">{emptyStateSubMessage}</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              role="list"
              aria-label="Search results grid"
            >
              {children}
            </motion.div>
          )}

          {/* Load More Content */}
          {loadMoreContent && (
            <div className="mt-4">
              {loadMoreContent}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// Export animation variants for use in child components
export { containerVariants, itemVariants };