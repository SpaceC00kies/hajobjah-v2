import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { WebboardPost, EnrichedWebboardPost, EnrichedWebboardComment, User, Cursor } from '../types/types.ts';
import { View, WebboardCategory, WEBBOARD_CATEGORY_STYLES } from '../types/types.ts';
import { Button } from './Button.tsx';
import { WebboardPostCard } from './WebboardPostCard.tsx';
import { WebboardPostDetail } from './WebboardPostDetail.tsx';
import { WebboardPostCreateForm } from './WebboardPostCreateForm.tsx';
import { getWebboardPostsPaginated as getWebboardPostsPaginatedService } from '../services/webboardService.ts';
import { logFirebaseError } from '../firebase/logging.ts';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.tsx';
import { useUsers } from '../hooks/useUsers.ts';
import { useWebboard } from '../hooks/useWebboard.ts';
import { useUser } from '../hooks/useUser.ts';

const listContainerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.3, when: "beforeChildren" as const, staggerChildren: 0.07, delayChildren: 0.1 } }, exit: { opacity: 0, transition: { duration: 0.2 } } };
const itemVariants = { hidden: { y: 15, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 12 } }, exit: { opacity: 0, y: -10, transition: { duration: 0.2 } } };
const detailViewVariants = { initial: { x: '100%', opacity: 0 }, animate: { x: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 260, damping: 25, duration: 0.4 } }, exit: { x: '-100%', opacity: 0, transition: { type: "spring" as const, stiffness: 260, damping: 25, duration: 0.3 } } };

export const WebboardPage: React.FC = () => {
  const { postId: selectedPostIdFromUrl, isEditing: isEditingFromUrl } = useParams<{ postId?: string, isEditing?: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const { webboardComments, addOrUpdateWebboardPost, addWebboardComment, toggleWebboardPostLike, deleteWebboardPost, pinWebboardPost, deleteWebboardComment, updateWebboardComment, checkWebboardPostLimits, checkWebboardCommentLimits, canEditOrDelete } = useWebboard();
  const { saveWebboardPost } = useUser();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<WebboardCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [webboardPostsList, setWebboardPostsList] = useState<WebboardPost[]>([]);
  const [lastVisibleWebboardPost, setLastVisibleWebboardPost] = useState<Cursor | null>(null);
  const [isLoadingWebboardPosts, setIsLoadingWebboardPosts] = useState(false);
  const [hasMoreWebboardPosts, setHasMoreWebboardPosts] = useState(true);
  const [initialWebboardPostsLoaded, setInitialWebboardPostsLoaded] = useState(false);
  const webboardLoaderRef = useRef<HTMLDivElement>(null);
  
  const isLoadingRef = useRef(isLoadingWebboardPosts);
  const hasMoreRef = useRef(hasMoreWebboardPosts);
  const lastVisibleRef = useRef(lastVisibleWebboardPost);

  useEffect(() => { isLoadingRef.current = isLoadingWebboardPosts; hasMoreRef.current = hasMoreWebboardPosts; lastVisibleRef.current = lastVisibleWebboardPost; }, [isLoadingWebboardPosts, hasMoreWebboardPosts, lastVisibleWebboardPost]);

  const loadWebboardPosts = useCallback(async (isInitialLoad = false) => {
    if (isLoadingRef.current || (!isInitialLoad && !hasMoreRef.current)) return;
    setIsLoadingWebboardPosts(true);
    if (isInitialLoad) { setWebboardPostsList([]); setLastVisibleWebboardPost(null); setHasMoreWebboardPosts(true); setInitialWebboardPostsLoaded(false); }
    try {
      const result = await getWebboardPostsPaginatedService(20, isInitialLoad ? null : lastVisibleRef.current, selectedCategoryFilter === 'all' ? null : selectedCategoryFilter, searchTerm);
      setWebboardPostsList(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
      setLastVisibleWebboardPost(result.cursor);
      setHasMoreWebboardPosts(!!result.cursor);
    } catch (error) { logFirebaseError("loadWebboardPosts", error); setHasMoreWebboardPosts(false); } 
    finally { setIsLoadingWebboardPosts(false); setInitialWebboardPostsLoaded(true); }
  }, [selectedCategoryFilter, searchTerm]);

  useEffect(() => { loadWebboardPosts(true); }, [selectedCategoryFilter, searchTerm, loadWebboardPosts]);
  useEffect(() => { if (selectedPostIdFromUrl) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && hasMoreRef.current && !isLoadingRef.current && initialWebboardPostsLoaded) loadWebboardPosts(); }, { threshold: 0.8 }); const currentLoader = webboardLoaderRef.current; if (currentLoader) observer.observe(currentLoader); return () => { if (currentLoader) observer.unobserve(currentLoader); }; }, [selectedPostIdFromUrl, initialWebboardPostsLoaded, loadWebboardPosts]);

  const getAuthorDisplayName = useCallback((userId: string, fallbackName?: string): string => { const author = users.find(u => u && u.id === userId); return author?.publicDisplayName || fallbackName || "ผู้ใช้ไม่ทราบชื่อ"; }, [users]);

  const enrichedPosts: EnrichedWebboardPost[] = webboardPostsList.map(post => { const author = users.find(u => u.id === post.userId); return { ...post, commentCount: webboardComments.filter(c => c.postId === post.id).length, authorPhoto: author?.photo || post.authorPhoto, isAuthorAdmin: author?.role === 'Admin' }; });
  const currentDetailedPost = selectedPostIdFromUrl ? enrichedPosts.find(p => p.id === selectedPostIdFromUrl) : null;
  const commentsForDetailView: EnrichedWebboardComment[] = currentDetailedPost ? webboardComments.filter(c => c.postId === currentDetailedPost.id).map(c => { const commenter = users.find(u => u.id === c.userId); return { ...c, authorPhoto: commenter?.photo, isAuthorAdmin: commenter?.role === 'Admin' }; }) : [];

  const filterInputBaseStyle = "w-full p-3 bg-white border border-neutral-DEFAULT rounded-md text-neutral-dark font-sans focus:outline-none focus:ring-1 focus:ring-neutral-DEFAULT text-sm sm:text-base";
  const filterSelectBaseStyle = `${filterInputBaseStyle} appearance-none`;

  return (
    <div className="p-2 sm:p-4 md:max-w-3xl md:mx-auto" style={{ position: 'relative', overflowX: 'hidden' }}>
      <AnimatePresence mode="wait">
        {currentDetailedPost ? (
          <motion.div key={`detail-${currentDetailedPost.id}`} variants={detailViewVariants} initial="initial" animate="animate" exit="exit" className="w-full">
            <Button onClick={() => navigate('/webboard')} variant="outline" colorScheme="neutral" size="sm" className="mb-4 rounded-full">&larr; กลับไปหน้ารวมกระทู้</Button>
            <WebboardPostDetail post={currentDetailedPost} comments={commentsForDetailView} currentUser={currentUser} users={users} onToggleLike={toggleWebboardPostLike} onSavePost={saveWebboardPost} onSharePost={() => {}} onAddComment={addWebboardComment} onDeletePost={deleteWebboardPost} onPinPost={pinWebboardPost} onEditPost={(post) => navigate(`/webboard/post/${post.id}/edit`)} onDeleteComment={deleteWebboardComment} onUpdateComment={updateWebboardComment} requestLoginForAction={() => navigate('/login')} onNavigateToPublicProfile={(info) => navigate(`/profile/${info.userId}`)} checkWebboardCommentLimits={checkWebboardCommentLimits} getAuthorDisplayName={getAuthorDisplayName} />
          </motion.div>
        ) : (
          <motion.div key="list-view" variants={listContainerVariants} initial="hidden" animate="visible" exit="exit">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h2 className="text-2xl sm:text-3xl font-sans font-semibold text-neutral-700 text-center sm:text-left">💬 กระทู้พูดคุย</h2>
              <Button onClick={() => currentUser ? setIsCreateModalOpen(true) : navigate('/login')} variant="login" size="sm" className="rounded-full font-semibold flex-shrink-0">+ สร้างกระทู้ใหม่</Button>
            </div>
            <div className="mb-6 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-neutral-DEFAULT/30 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
              <div className="w-full sm:w-auto sm:flex-1"><label htmlFor="categoryFilter" className="sr-only">กรองตามหมวดหมู่</label><select id="categoryFilter" value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value as WebboardCategory | 'all')} className={`${filterSelectBaseStyle} w-full`}><option value="all">หมวดหมู่ทั้งหมด</option>{Object.values(WebboardCategory).map((cat: string) => (<option key={cat} value={cat}>{cat}</option>))}</select></div>
              <div className="w-full sm:w-auto sm:flex-1"><label htmlFor="searchWebboard" className="sr-only">ค้นหากระทู้</label><input type="search" id="searchWebboard" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาหัวข้อ, เนื้อหา, ผู้เขียน..." className={`${filterInputBaseStyle} w-full`} /></div>
            </div>
            {!initialWebboardPostsLoaded && isLoadingWebboardPosts && webboardPostsList.length === 0 && <div className="text-center py-20"><p className="text-xl font-sans text-neutral-dark">✨ กำลังโหลดกระทู้…</p></div>}
            {initialWebboardPostsLoaded && enrichedPosts.length === 0 && !hasMoreWebboardPosts && <div className="text-center py-10 bg-white p-6 rounded-lg shadow"><svg className="mx-auto h-16 w-16 text-neutral-DEFAULT mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg><p className="text-xl font-serif text-neutral-dark mb-4 font-normal">{(searchTerm || selectedCategoryFilter !== 'all') ? 'ไม่พบกระทู้ที่ตรงกับการค้นหาหรือตัวกรองของคุณ' : 'ยังไม่มีกระทู้ในขณะนี้'}</p>{!currentUser && !(searchTerm || selectedCategoryFilter !== 'all') && <p className="text-md font-serif text-neutral-dark mb-4 font-normal"><button onClick={() => navigate('/login')} className="font-sans text-primary hover:underline">เข้าสู่ระบบ</button> หรือ <button onClick={() => navigate('/register')} className="font-sans text-primary hover:underline">ลงทะเบียน</button> เพื่อเริ่มสร้างกระทู้</p>}<Button onClick={() => setIsCreateModalOpen(true)} variant="login" size="sm" className="rounded-full font-semibold">เป็นคนแรกที่สร้างกระทู้!</Button></div>}
            {enrichedPosts.length > 0 && <motion.div className="space-y-4" variants={listContainerVariants} initial="hidden" animate="visible">{enrichedPosts.map(post => <motion.div key={post.id} variants={itemVariants}><WebboardPostCard post={post} currentUser={currentUser} onViewPost={(id) => navigate(`/webboard/post/${id}`)} onToggleLike={toggleWebboardPostLike} onSavePost={saveWebboardPost} onSharePost={() => {}} requestLoginForAction={() => navigate('/login')} onNavigateToPublicProfile={(info) => navigate(`/profile/${info.userId}`)} getAuthorDisplayName={getAuthorDisplayName} /></motion.div>)}</motion.div>}
            <div ref={webboardLoaderRef} className="h-10 flex justify-center items-center">{isLoadingWebboardPosts && initialWebboardPostsLoaded && webboardPostsList.length > 0 && <p className="text-sm font-sans text-neutral-medium">กำลังโหลดเพิ่มเติม…</p>}</div>
            {initialWebboardPostsLoaded && !hasMoreWebboardPosts && webboardPostsList.length > 0 && <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกกระทู้แล้ว</p>}
          </motion.div>
        )}
      </AnimatePresence>
      <WebboardPostCreateForm isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={(data, id) => { addOrUpdateWebboardPost(data, id); setIsCreateModalOpen(false); }} editingPost={isEditingFromUrl && currentDetailedPost ? currentDetailedPost : null} currentUser={currentUser} checkWebboardPostLimits={checkWebboardPostLimits} />
    </div>
  );
};