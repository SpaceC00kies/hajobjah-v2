import React, { useState, useEffect } from 'react';
// Corrected import path for types
import type { WebboardPost, WebboardComment, User, EnrichedWebboardPost, EnrichedWebboardComment, UserLevel, UserRole } from '../../types';
import { View, USER_LEVELS, WebboardCategory } from '../types/types'; 
import { Button } from './Button';
import { WebboardPostCard } from './WebboardPostCard';
import { WebboardPostDetail } from './WebboardPostDetail';
import { WebboardPostCreateForm } from './WebboardPostCreateForm';

interface WebboardPageProps {
  currentUser: User | null;
  users: User[]; 
  posts: WebboardPost[];
  comments: WebboardComment[];
  onAddOrUpdatePost: (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => void; 
  onAddComment: (postId: string, text: string) => void;
  onToggleLike: (postId: string) => void;
  onSavePost: (postId: string) => void; // New prop
  onSharePost: (postId: string, postTitle: string) => void; // New prop
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
  getUserDisplayBadge: (user: User | null | undefined) => UserLevel; // Removed posts, comments from signature as badges are not on webboard items
  requestLoginForAction: (view: View, payload?: any) => void; 
  onNavigateToPublicProfile: (userId: string) => void;
  checkWebboardPostLimits: (user: User) => { canPost: boolean; message?: string | null };
  checkWebboardCommentLimits: (user: User) => { canPost: boolean; message?: string };
}

export const WebboardPage: React.FC<WebboardPageProps> = ({
  currentUser,
  users,
  posts,
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
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<WebboardCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

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
    if (selectedPostId === 'create' || editingPost) { 
      setSelectedPostId(null); 
      onCancelEdit(); 
    }
  };
  
  const handleSubmitPostForm = (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
    onAddOrUpdatePost(postData, postIdToUpdate);
    handleCloseCreateModal(); 
  };

  let filteredPosts = posts;
  if (selectedCategoryFilter !== 'all') {
    filteredPosts = filteredPosts.filter(post => post.category === selectedCategoryFilter);
  }
  if (searchTerm.trim() !== '') {
    const lowerSearchTerm = searchTerm.toLowerCase();
    filteredPosts = filteredPosts.filter(post =>
      post.title.toLowerCase().includes(lowerSearchTerm) ||
      post.body.toLowerCase().includes(lowerSearchTerm) ||
      post.authorDisplayName.toLowerCase().includes(lowerSearchTerm)
    );
  }

  const enrichedPosts: EnrichedWebboardPost[] = filteredPosts
    .map(post => {
      const author = users.find(u => u.id === post.userId);
      return {
        ...post,
        commentCount: comments.filter(c => c.postId === post.id).length,
        // authorLevel: getUserDisplayBadge(author), // Badge removed from card/detail
        authorPhoto: author?.photo || post.authorPhoto,
        isAuthorAdmin: author?.role === 'Admin' as UserRole.Admin, 
      };
    })
    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
            // authorLevel: getUserDisplayBadge(commenter), // Badge removed from comment
            authorPhoto: commenter?.photo || comment.authorPhoto,
            isAuthorAdmin: commenter?.role === 'Admin' as UserRole.Admin,
          };
        })
    : [];

  if (currentDetailedPost) {
    return (
      <div className="p-2 sm:p-4 md:max-w-3xl md:mx-auto"> {/* Centered single column for detail */}
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
          onToggleLike={onToggleLike}
          onSavePost={onSavePost}
          onSharePost={onSharePost}
          onAddComment={onAddComment}
          onDeletePost={onDeletePost}
          onPinPost={onPinPost}
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
    <div className="p-2 sm:p-4 md:max-w-3xl md:mx-auto"> {/* Centered single column for list */}
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
            {Object.values(WebboardCategory).map(cat => (
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


      {enrichedPosts.length === 0 ? (
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
      ) : (
        <div className="space-y-4"> {/* Changed from grid to space-y for single column */}
          {enrichedPosts.map(post => (
            <WebboardPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onViewPost={setSelectedPostId}
              onToggleLike={onToggleLike}
              onSavePost={onSavePost}
              onSharePost={onSharePost}
              onDeletePost={onDeletePost}
              onPinPost={onPinPost}
              onEditPost={onEditPost}
              requestLoginForAction={requestLoginForAction} 
              onNavigateToPublicProfile={onNavigateToPublicProfile}
            />
          ))}
        </div>
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
