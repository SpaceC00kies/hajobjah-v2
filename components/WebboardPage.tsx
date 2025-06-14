
import React, { useState, useEffect, useCallback, useRef } from 'react';
// Corrected import path for types
import type { WebboardPost, WebboardComment, User, EnrichedWebboardPost, EnrichedWebboardComment, UserLevel, UserRole } from '../types';
import { View, USER_LEVELS, WebboardCategory } from '../types'; 
import { Button } from './Button';
import { WebboardPostCard } from './WebboardPostCard';
import { WebboardPostDetail } from './WebboardPostDetail';
import { WebboardPostCreateForm } from './WebboardPostCreateForm';
import { getWebboardPostsPaginated as getWebboardPostsPaginatedService } from '../services/firebaseService'; // Import paginated fetch
import type { DocumentSnapshot } from 'firebase/firestore'; // For pagination
import { logFirebaseError } from '../firebase/logging';


interface WebboardPageProps {
  currentUser: User | null;
  users: User[]; 
  // posts: WebboardPost[]; // Removed: WebboardPage will fetch its own posts
  comments: WebboardComment[]; // Global comments for enrichment
  onAddOrUpdatePost: (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => Promise<void>; 
  onAddComment: (postId: string, text: string) => void;
  onToggleLike: (postId: string) => Promise<void>;
  onSavePost: (postId: string) => Promise<void>; 
  onSharePost: (postId: string, postTitle: string) => void; 
  onDeletePost: (postId: string) => void;
  onPinPost: (postId: string) => Promise<void>;
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
  onNavigateToPublicProfile: (userId: string) => void;
  checkWebboardPostLimits: (user: User) => { canPost: boolean; message?: string | null };
  checkWebboardCommentLimits: (user: User) => { canPost: boolean; message?: string };
  pageSize: number; // For infinite scroll
}

export const WebboardPage: React.FC<WebboardPageProps> = (props) => {
  const {
    currentUser, users, comments, onAddOrUpdatePost, onAddComment,
    onToggleLike: appOnToggleLike, 
    onSavePost: appOnSavePost, 
    onSharePost, onDeletePost, 
    onPinPost: appOnPinPost,
    onEditPost, onDeleteComment, onUpdateComment, selectedPostId,
    setSelectedPostId, navigateTo, editingPost, onCancelEdit,
    getUserDisplayBadge, requestLoginForAction, onNavigateToPublicProfile,
    checkWebboardPostLimits, checkWebboardCommentLimits, pageSize
  } = props;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<WebboardCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [webboardPostsList, setWebboardPostsList] = useState<WebboardPost[]>([]);
  const [lastVisibleWebboardPost, setLastVisibleWebboardPost] = useState<DocumentSnapshot | null>(null);
  const [isLoadingWebboardPosts, setIsLoadingWebboardPosts] = useState(false);
  const [hasMoreWebboardPosts, setHasMoreWebboardPosts] = useState(true);
  const [initialWebboardPostsLoaded, setInitialWebboardPostsLoaded] = useState(false);
  const webboardLoaderRef = useRef<HTMLDivElement>(null);

  const loadWebboardPosts = useCallback(async (isInitialLoad = false) => {
    if (isLoadingWebboardPosts || (!isInitialLoad && !hasMoreWebboardPosts)) return;
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
        isInitialLoad ? null : lastVisibleWebboardPost,
        selectedCategoryFilter === 'all' ? null : selectedCategoryFilter,
        searchTerm
      );
      console.log("WEBBOARD PAGE: Received result from service:", result);
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
  }, [isLoadingWebboardPosts, hasMoreWebboardPosts, lastVisibleWebboardPost, pageSize, selectedCategoryFilter, searchTerm]);

  useEffect(() => { 
    loadWebboardPosts(true); 
  }, [selectedCategoryFilter, searchTerm, loadWebboardPosts]); // Added loadWebboardPosts

 useEffect(() => { 
    if (selectedPostId !== null && selectedPostId !== 'create') { 
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreWebboardPosts && !isLoadingWebboardPosts && initialWebboardPostsLoaded) {
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
  }, [selectedPostId, hasMoreWebboardPosts, isLoadingWebboardPosts, initialWebboardPostsLoaded, loadWebboardPosts]);


  useEffect(() => {
    if (selectedPostId && selectedPostId !== 'create' && initialWebboardPostsLoaded) {
      const postExists = webboardPostsList.some(p => p.id === selectedPostId);
      if (!postExists && hasMoreWebboardPosts) { // Only load if not found and potentially more posts
        loadWebboardPosts(true);
      }
    }
  }, [selectedPostId, webboardPostsList, initialWebboardPostsLoaded, loadWebboardPosts, hasMoreWebboardPosts]);


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
    console.log("BUG HUNT: The function that closes the modal was just called!");
    setIsCreateModalOpen(false);
    if (selectedPostId === 'create' || editingPost) { 
      setSelectedPostId(null); 
      onCancelEdit(); 
    }
  };
  
  const handleSubmitPostForm = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
    await onAddOrUpdatePost(postData, postIdToUpdate); 
    await loadWebboardPosts(true); 
    // Modal will close reactively based on selectedPostId and editingPost changes driven by App.tsx
  };

  const handleToggleLikeProxy = async (postId: string) => {
    await appOnToggleLike(postId);
    if (webboardPostsList.some(p => p.id === postId) || selectedPostId === postId) {
      loadWebboardPosts(true);
    }
  };

  const handleSavePostProxy = async (postId: string) => {
    await appOnSavePost(postId);
  };

  const handlePinPostProxy = async (postId: string) => {
    await appOnPinPost(postId);
     if (webboardPostsList.some(p => p.id === postId) || selectedPostId === postId) {
      loadWebboardPosts(true);
    }
  };

  const handleDeletePostProxy = (postId: string) => {
    onDeletePost(postId); 
    loadWebboardPosts(true); 
    if (selectedPostId === postId) {
      setSelectedPostId(null); 
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

  if (currentDetailedPost) {
    return (
      <div className="p-2 sm:p-4 md:max-w-3xl md:mx-auto"> 
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
          onToggleLike={handleToggleLikeProxy}
          onSavePost={handleSavePostProxy}
          onSharePost={onSharePost}
          onAddComment={onAddComment}
          onDeletePost={handleDeletePostProxy}
          onPinPost={handlePinPostProxy}
          onEditPost={onEditPost}
          onDeleteComment={onDeleteComment}
          onUpdateComment={onUpdateComment}
          requestLoginForAction={requestLoginForAction} 
          onNavigateToPublicProfile={onNavigateToPublicProfile}
          checkWebboardCommentLimits={checkWebboardCommentLimits}
        />
      </div>
    );
  }

  const inputBaseStyle = "p-2 sm:p-2.5 bg-white dark:bg-dark-inputBg border border-neutral-DEFAULT dark:border-dark-border rounded-lg text-neutral-dark dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-neutral-DEFAULT dark:focus:ring-dark-border text-sm sm:text-base";
  const selectBaseStyle = `${inputBaseStyle} appearance-none`;

  return (
    <div className="p-2 sm:p-4 md:max-w-3xl md:mx-auto"> 
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl sm:text-3xl font-sans font-semibold text-neutral-700 dark:text-neutral-300 text-center sm:text-left">
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

      <div className="mb-6 p-3 sm:p-4 bg-white dark:bg-dark-cardBg rounded-lg shadow-sm border border-neutral-DEFAULT/30 dark:border-dark-border/30 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
        <div className="w-full sm:w-auto sm:flex-1">
          <label htmlFor="categoryFilter" className="sr-only">กรองตามหมวดหมู่</label>
          <select
            id="categoryFilter"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value as WebboardCategory | 'all')}
            className={`${selectBaseStyle} w-full font-sans`}
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
            className={`${inputBaseStyle} w-full font-serif`}
          />
        </div>
      </div>

      {!initialWebboardPostsLoaded && isLoadingWebboardPosts && webboardPostsList.length === 0 && (
        <div className="text-center py-20"><p className="text-xl font-sans text-neutral-dark dark:text-dark-text">✨ กำลังโหลดกระทู้…</p></div>
      )}

      {initialWebboardPostsLoaded && enrichedPosts.length === 0 && !hasMoreWebboardPosts && (
        <div className="text-center py-10 bg-white dark:bg-dark-cardBg p-6 rounded-lg shadow">
          <svg className="mx-auto h-16 w-16 text-neutral-DEFAULT dark:text-dark-border mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-xl font-serif text-neutral-dark dark:text-dark-textMuted mb-4 font-normal">
             {(searchTerm || selectedCategoryFilter !== 'all')
                ? 'ไม่พบกระทู้ที่ตรงกับการค้นหาหรือตัวกรองของคุณ'
                : 'ยังไม่มีกระทู้ในขณะนี้'}
          </p>
          {!currentUser && !(searchTerm || selectedCategoryFilter !== 'all') && (
             <p className="text-md font-serif text-neutral-dark dark:text-dark-textMuted mb-4 font-normal">
                <button onClick={() => navigateTo(View.Login)} className="font-sans text-primary dark:text-dark-primary-DEFAULT hover:underline">เข้าสู่ระบบ</button> หรือ <button onClick={() => navigateTo(View.Register)} className="font-sans text-primary dark:text-dark-primary-DEFAULT hover:underline">ลงทะเบียน</button> เพื่อเริ่มสร้างกระทู้
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
        <div className="space-y-4"> 
          {enrichedPosts.map(post => (
            <WebboardPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onViewPost={setSelectedPostId}
              onToggleLike={handleToggleLikeProxy}
              onSavePost={handleSavePostProxy}
              onSharePost={onSharePost}
              onDeletePost={handleDeletePostProxy}
              onPinPost={handlePinPostProxy}
              onEditPost={onEditPost}
              requestLoginForAction={requestLoginForAction} 
              onNavigateToPublicProfile={onNavigateToPublicProfile}
            />
          ))}
        </div>
      )}

      <div ref={webboardLoaderRef} className="h-10 flex justify-center items-center">
        {isLoadingWebboardPosts && initialWebboardPostsLoaded && webboardPostsList.length > 0 && (
           <p className="text-sm font-sans text-neutral-medium dark:text-dark-textMuted">กำลังโหลดเพิ่มเติม…</p>
        )}
      </div>

      {initialWebboardPostsLoaded && !hasMoreWebboardPosts && webboardPostsList.length > 0 && (
        <p className="text-center text-sm font-sans text-neutral-medium dark:text-dark-textMuted py-4">🎉 คุณดูครบทุกกระทู้แล้ว</p>
      )}

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
