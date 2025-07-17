





import React, { useState, useEffect, useCallback, useRef } from 'react';
// Corrected import path for types
import type { WebboardPost, WebboardComment, User, EnrichedWebboardPost, EnrichedWebboardComment, UserLevel, UserRole } from '../types/types.ts';
import { View, USER_LEVELS, WebboardCategory } from '../types/types.ts';
import { Button } from './Button.tsx';
import { WebboardPostCard } from './WebboardPostCard.tsx';
import { WebboardPostDetail } from './WebboardPostDetail.tsx';
import { WebboardPostCreateForm } from './WebboardPostCreateForm.tsx';
import { getWebboardPostsPaginated as getWebboardPostsPaginatedService } from '../services/webboardService.ts'; // Import paginated fetch
import type { DocumentSnapshot } from 'firebase/firestore'; // For pagination
import { logFirebaseError } from '../firebase/logging.ts';
import { motion, AnimatePresence } from 'framer-motion';


export interface WebboardPageProps { // Added export
  currentUser: User | null;
  users: User[];
  comments: WebboardComment[]; // Global comments for enrichment
  onAddOrUpdatePost: (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onToggleLike: (postId: string) => Promise<void>;
  onSavePost: (postId: string) => void;
  onSharePost: (postId: string, postTitle: string) => void;
  onDeletePost: (postId: string) => void;
  onPinPost: (postId: string) => void;
  onEditPost: (post: EnrichedWebboardPost) => void;
  onDeleteComment?: (commentId: string) => void;
  onUpdateComment?: (commentId: string, newText: string) => void;
  selectedPostId: string | null;
  setSelectedPostId: (postId: string | null) => void;
  navigateTo: (view: View, payload?: any) => void;
  editingPost?: WebboardPost | null;
  onCancelEdit: () => void;
  getUserDisplayBadge: (user: User | null | undefined) => UserLevel;
  requestLoginForAction: (view: View, payload?: any) => void;
  onNavigateToPublicProfile: (profileInfo: { userId: string; helperProfileId?: string }) => void;
  checkWebboardPostLimits: (user: User) => { canPost: boolean; message?: string | null };
  checkWebboardCommentLimits: (user: User) => { canPost: boolean; message?: string };
  pageSize: number; // For infinite scroll
  getAuthorDisplayName: (userId: string, fallbackName?: string) => string; // Added this prop
}

// Animation Variants
const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      when: "beforeChildren" as const,
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 12,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

const detailViewVariants = {
  initial: { x: '100%', opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 260, damping: 25, duration: 0.4 }
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 25, duration: 0.3 }
  },
};


export const WebboardPage: React.FC<WebboardPageProps> = ({
  currentUser,
  users,
  comments,
  onAddOrUpdatePost,
  onAddComment,
  onToggleLike,
  onSavePost,
  onSharePost,
  onDeletePost,
  onPinPost,
  onEditPost,
  onDeleteComment,
  onUpdateComment,
  selectedPostId,
  setSelectedPostId,
  navigateTo,
  editingPost,
  onCancelEdit,
  getUserDisplayBadge,
  requestLoginForAction,
  onNavigateToPublicProfile,
  checkWebboardPostLimits,
  checkWebboardCommentLimits,
  pageSize,
  getAuthorDisplayName, // Destructure the new prop
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<WebboardCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [webboardPostsList, setWebboardPostsList] = useState<WebboardPost[]>([]);
  const [lastVisibleWebboardPost, setLastVisibleWebboardPost] = useState<DocumentSnapshot | null>(null);
  const [isLoadingWebboardPosts, setIsLoadingWebboardPosts] = useState(false);
  const [hasMoreWebboardPosts, setHasMoreWebboardPosts] = useState(true);
  const [initialWebboardPostsLoaded, setInitialWebboardPostsLoaded] = useState(false);
  const webboardLoaderRef = useRef<HTMLDivElement>(null);

  const isLoadingRef = useRef(isLoadingWebboardPosts);
  const hasMoreRef = useRef(hasMoreWebboardPosts);
  const lastVisibleRef = useRef(lastVisibleWebboardPost);

  useEffect(() => {
    isLoadingRef.current = isLoadingWebboardPosts;
    hasMoreRef.current = hasMoreWebboardPosts;
    lastVisibleRef.current = lastVisibleWebboardPost;
  }, [isLoadingWebboardPosts, hasMoreWebboardPosts, lastVisibleWebboardPost]);


  const loadWebboardPosts = useCallback(async (isInitialLoad = false) => {
    if (isLoadingRef.current || (!isInitialLoad && !hasMoreRef.current)) {
      return;
    }
    setIsLoadingWebboardPosts(true);

    if (isInitialLoad) {
      setWebboardPostsList([]);
      setLastVisibleWebboardPost(null);
      setHasMoreWebboardPosts(true);
      setInitialWebboardPostsLoaded(false);
    }

    try {
      const result = await getWebboardPostsPaginatedService(
        pageSize,
        isInitialLoad ? null : lastVisibleRef.current,
        selectedCategoryFilter === 'all' ? null : selectedCategoryFilter,
        searchTerm
      );
      setWebboardPostsList(prevPosts => isInitialLoad ? result.items : [...prevPosts, ...result.items]);
      setLastVisibleWebboardPost(result.lastVisibleDoc);
      setHasMoreWebboardPosts(result.items.length === pageSize && result.lastVisibleDoc !== null);
      setInitialWebboardPostsLoaded(true);
    } catch (error) {
      console.error("Error loading webboard posts:", error);
      logFirebaseError("loadWebboardPosts", error);
      setHasMoreWebboardPosts(false);
      setInitialWebboardPostsLoaded(true);
    } finally {
      setIsLoadingWebboardPosts(false);
    }
  }, [
    pageSize, selectedCategoryFilter, searchTerm,
    setIsLoadingWebboardPosts, setWebboardPostsList, setLastVisibleWebboardPost, setHasMoreWebboardPosts, setInitialWebboardPostsLoaded
  ]);


  useEffect(() => {
    loadWebboardPosts(true);
  }, [selectedCategoryFilter, searchTerm, loadWebboardPosts]);

 useEffect(() => {
    if (selectedPostId !== null && selectedPostId !== 'create') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current && initialWebboardPostsLoaded) {
          loadWebboardPosts();
        }
      },
      { threshold: 0.8 }
    );
    const currentLoaderRef = webboardLoaderRef.current;
    if (currentLoaderRef) observer.observe(currentLoaderRef);
    return () => {
      if (currentLoaderRef) observer.unobserve(currentLoaderRef);
    };
  }, [selectedPostId, initialWebboardPostsLoaded, loadWebboardPosts]);


  useEffect(() => {
    if (selectedPostId !== null && selectedPostId !== 'create' && initialWebboardPostsLoaded) {
      const postExists = webboardPostsList.some(p => p.id === selectedPostId);
      if (!postExists) {
        loadWebboardPosts(true);
      }
    }
  }, [selectedPostId, webboardPostsList, initialWebboardPostsLoaded, loadWebboardPosts]);


  useEffect(() => {
    if (selectedPostId === 'create' || editingPost) {
      setIsCreateModalOpen(true);
    } else {
      setIsCreateModalOpen(false);
    }
  }, [selectedPostId, editingPost]);

  const handleOpenCreateModal = () => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'createPost' });
    } else {
      setSelectedPostId('create');
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    onCancelEdit();
  };

  const handleSubmitPostForm = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
    await onAddOrUpdatePost(postData, postIdToUpdate);
    await loadWebboardPosts(true);
    if (postIdToUpdate) {
        handleCloseCreateModal();
    }
  };

  const handleToggleLikeForPage = async (postId: string) => {
    if (!currentUser) {
      requestLoginForAction(View.Webboard, { action: 'like', postId });
      return;
    }

    try {
      await onToggleLike(postId);
      setWebboardPostsList(prevList =>
        prevList.map(p => {
          if (p.id === postId) {
            const userIndex = p.likes.indexOf(currentUser!.id);
            const newLikes =
              userIndex > -1
                ? p.likes.filter(id => id !== currentUser!.id)
                : [...p.likes, currentUser!.id];
            return { ...p, likes: newLikes };
          }
          return p;
        })
      );
    } catch (error) {
      console.error("Error during onToggleLike prop call in WebboardPage:", error);
    }
  };


  const enrichedPosts: EnrichedWebboardPost[] = webboardPostsList
    .map(post => {
      const author = users.find(u => u.id === post.userId);
      return {
        ...post,
        commentCount: comments.filter(c => c.postId === post.id).length,
        authorPhoto: author?.photo || post.authorPhoto,
        isAuthorAdmin: author?.role === 'Admin' as UserRole.Admin,
      };
    });


  const currentDetailedPost = selectedPostId && selectedPostId !== 'create'
    ? enrichedPosts.find(p => p.id === selectedPostId)
    : null;

  const commentsForDetailView: EnrichedWebboardComment[] = currentDetailedPost
    ? comments
        .filter(comment => comment.postId === currentDetailedPost.id)
        .map(comment => {
          const commenter = users.find(u => u.id === comment.userId);
          return {
            ...comment,
            authorPhoto: commenter?.photo || comment.authorPhoto,
            isAuthorAdmin: commenter?.role === 'Admin' as UserRole.Admin,
          };
        })
    : [];

  // Input styles for filters - overriding global font-serif with font-sans here
  const filterInputBaseStyle = "w-full p-3 bg-white border border-neutral-DEFAULT rounded-md text-neutral-dark font-sans focus:outline-none focus:ring-1 focus:ring-neutral-DEFAULT text-sm sm:text-base";
  const filterSelectBaseStyle = `${filterInputBaseStyle} appearance-none`;

  return (
    <div className="p-2 sm:p-4 md:max-w-3xl md:mx-auto" style={{ position: 'relative', overflowX: 'hidden' }}>
      <AnimatePresence mode="wait">
        {currentDetailedPost ? (
          <motion.div
            key={`detail-${currentDetailedPost.id}`}
            variants={detailViewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
          >
            <Button
              onClick={() => setSelectedPostId(null)}
              variant="outline"
              colorScheme="neutral"
              size="sm"
              className="mb-4 rounded-full"
            >
              &larr; กลับไปหน้ารวมกระทู้
            </Button>
            <WebboardPostDetail
              post={currentDetailedPost}
              comments={commentsForDetailView}
              currentUser={currentUser}
              users={users}
              onToggleLike={handleToggleLikeForPage}
              onSavePost={onSavePost}
              onSharePost={onSharePost}
              onAddComment={onAddComment}
              onDeletePost={(id) => { onDeletePost(id); loadWebboardPosts(true); setSelectedPostId(null); }}
              onPinPost={(id) => { onPinPost(id); loadWebboardPosts(true); }}
              onEditPost={onEditPost}
              onDeleteComment={onDeleteComment}
              onUpdateComment={onUpdateComment}
              requestLoginForAction={requestLoginForAction}
              onNavigateToPublicProfile={onNavigateToPublicProfile}
              checkWebboardCommentLimits={checkWebboardCommentLimits}
              getAuthorDisplayName={getAuthorDisplayName} // Pass down
            />
          </motion.div>
        ) : (
          <motion.div
            key="list-view"
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl sm:text-3xl font-sans font-semibold text-primary-dark text-center sm:text-left">
                💬 กระทู้พูดคุย
              </h2>
              <Button
                onClick={handleOpenCreateModal}
                variant="login"
                size="sm"
                className="rounded-full font-semibold flex-shrink-0"
              >
                + สร้างกระทู้ใหม่
              </Button>
            </div>

            <div className="mb-6 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-neutral-DEFAULT/30 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
              <div className="w-full sm:w-auto sm:flex-1">
                <label htmlFor="categoryFilter" className="sr-only">กรองตามหมวดหมู่</label>
                <select
                  id="categoryFilter"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value as WebboardCategory | 'all')}
                  className={`${filterSelectBaseStyle} w-full`}
                >
                  <option value="all">หมวดหมู่ทั้งหมด</option>
                  {Object.values(WebboardCategory).map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto sm:flex-1">
                <label htmlFor="searchWebboard" className="sr-only">ค้นหากระทู้</label>
                <input
                  type="search"
                  id="searchWebboard"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาหัวข้อ, เนื้อหา, ผู้เขียน..."
                  className={`${filterInputBaseStyle} w-full`}
                />
              </div>
            </div>

            {!initialWebboardPostsLoaded && isLoadingWebboardPosts && webboardPostsList.length === 0 && (
              <div className="text-center py-20"><p className="text-xl font-sans text-neutral-dark">✨ กำลังโหลดกระทู้…</p></div>
            )}

            {initialWebboardPostsLoaded && enrichedPosts.length === 0 && !hasMoreWebboardPosts && (
              <div className="text-center py-10 bg-white p-6 rounded-lg shadow">
                <svg className="mx-auto h-16 w-16 text-neutral-DEFAULT mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-xl font-serif text-neutral-dark mb-4 font-normal">
                  {(searchTerm || selectedCategoryFilter !== 'all')
                      ? 'ไม่พบกระทู้ที่ตรงกับการค้นหาหรือตัวกรองของคุณ'
                      : 'ยังไม่มีกระทู้ในขณะนี้'}
                </p>
                {!currentUser && !(searchTerm || selectedCategoryFilter !== 'all') && (
                  <p className="text-md font-serif text-neutral-dark mb-4 font-normal">
                      <button onClick={() => navigateTo(View.Login)} className="font-sans text-primary hover:underline">เข้าสู่ระบบ</button> หรือ <button onClick={() => navigateTo(View.Register)} className="font-sans text-primary hover:underline">ลงทะเบียน</button> เพื่อเริ่มสร้างกระทู้
                  </p>
                )}
                {currentUser && !(searchTerm || selectedCategoryFilter !== 'all') && (
                  <Button
                    onClick={handleOpenCreateModal}
                    variant="login"
                    size="sm"
                    className="rounded-full font-semibold"
                  >
                    เป็นคนแรกที่สร้างกระทู้!
                  </Button>
                )}
              </div>
            )}

            {enrichedPosts.length > 0 && (
              <motion.div
                className="space-y-4"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {enrichedPosts.map(post => (
                  <motion.div key={post.id} variants={itemVariants}>
                    <WebboardPostCard
                      post={post}
                      currentUser={currentUser}
                      onViewPost={setSelectedPostId}
                      onToggleLike={handleToggleLikeForPage}
                      onSavePost={onSavePost}
                      onSharePost={onSharePost}
                      requestLoginForAction={requestLoginForAction}
                      onNavigateToPublicProfile={(profileInfo) => onNavigateToPublicProfile(profileInfo)} // Pass as object
                      getAuthorDisplayName={getAuthorDisplayName} // Pass down
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            <div ref={webboardLoaderRef} className="h-10 flex justify-center items-center">
              {isLoadingWebboardPosts && initialWebboardPostsLoaded && webboardPostsList.length > 0 && (
                <p className="text-sm font-sans text-neutral-medium">กำลังโหลดเพิ่มเติม…</p>
              )}
            </div>

            {initialWebboardPostsLoaded && !hasMoreWebboardPosts && webboardPostsList.length > 0 && (
              <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกกระทู้แล้ว</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <WebboardPostCreateForm
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleSubmitPostForm}
        editingPost={editingPost || null}
        currentUser={currentUser}
        checkWebboardPostLimits={checkWebboardPostLimits}
      />
    </div>
  );
};
