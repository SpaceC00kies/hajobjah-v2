// components/WebboardClient.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { WebboardPost, User, EnrichedWebboardPost, Cursor } from '../types/types';
import { WebboardCategory } from '../types/types';
import { Button } from './Button';
import { WebboardPostCard } from './WebboardPostCard';
import { WebboardPostCreateForm } from './WebboardPostCreateForm';
import { getWebboardPostsPaginated as getWebboardPostsPaginatedService } from '../services/webboardService';
import { logFirebaseError } from '../firebase/logging';
import { motion } from 'framer-motion';

import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useWebboard } from '@/hooks/useWebboard';
import { useUser } from '@/hooks/useUser';
import { getAuthorDisplayName as getAuthorDisplayNameUtil } from '@/utils/userUtils';

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, when: "beforeChildren", staggerChildren: 0.07 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100, damping: 12 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export const WebboardClient: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentUser } = useAuth();
    const { users, webboardComments: allComments, allWebboardPostsForAdmin } = useData();
    const webboardActions = useWebboard();
    const userActions = useUser();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<WebboardPost | null>(null);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<WebboardCategory | 'all'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [webboardPostsList, setWebboardPostsList] = useState<WebboardPost[]>([]);
    const [lastVisibleWebboardPost, setLastVisibleWebboardPost] = useState<Cursor | null>(null);
    const [isLoadingWebboardPosts, setIsLoadingWebboardPosts] = useState(false);
    const [hasMoreWebboardPosts, setHasMoreWebboardPosts] = useState(true);
    const webboardLoaderRef = useRef<HTMLDivElement>(null);
    const pageSize = 10;

    const getAuthorDisplayName = (userId: string, fallbackName?: string) => getAuthorDisplayNameUtil(userId, fallbackName, users);

    useEffect(() => {
        const editId = searchParams.get('edit');
        const action = searchParams.get('action');

        if (editId) {
            const postToEdit = allWebboardPostsForAdmin.find(p => p.id === editId);
            if (postToEdit) {
                setEditingPost(postToEdit);
                setIsCreateModalOpen(true);
            }
        } else if (action === 'create') {
            handleOpenCreateModal();
        }
    }, [searchParams, allWebboardPostsForAdmin]);
    
    const loadWebboardPosts = useCallback(async (isInitialLoad = false) => {
        if (isLoadingWebboardPosts || (!isInitialLoad && !hasMoreWebboardPosts)) return;
        setIsLoadingWebboardPosts(true);
        if (isInitialLoad) {
            setWebboardPostsList([]);
            setLastVisibleWebboardPost(null);
            setHasMoreWebboardPosts(true);
        }
        try {
            const result = await getWebboardPostsPaginatedService(pageSize, isInitialLoad ? null : lastVisibleWebboardPost, selectedCategoryFilter, searchTerm);
            setWebboardPostsList(prev => isInitialLoad ? result.items : [...prev, ...result.items]);
            setLastVisibleWebboardPost(result.cursor);
            setHasMoreWebboardPosts(!!result.cursor);
        } catch (error) { 
            logFirebaseError("loadWebboardPosts", error); 
            setHasMoreWebboardPosts(false); 
        } finally { 
            setIsLoadingWebboardPosts(false); 
        }
    }, [pageSize, selectedCategoryFilter, searchTerm, isLoadingWebboardPosts, hasMoreWebboardPosts, lastVisibleWebboardPost]);

    useEffect(() => { loadWebboardPosts(true); }, [selectedCategoryFilter, searchTerm, loadWebboardPosts]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMoreWebboardPosts && !isLoadingWebboardPosts) {
                loadWebboardPosts();
            }
        }, { threshold: 0.8 });
        const currentLoaderRef = webboardLoaderRef.current;
        if (currentLoaderRef) observer.observe(currentLoaderRef);
        return () => { if (currentLoaderRef) observer.unobserve(currentLoaderRef); };
    }, [hasMoreWebboardPosts, isLoadingWebboardPosts, loadWebboardPosts]);

    const handleOpenCreateModal = () => {
        if (!currentUser) {
            router.push('/login?redirect=/webboard?action=create');
            return;
        }
        setEditingPost(null);
        setIsCreateModalOpen(true);
    };

    const handleCloseCreateModal = () => {
        setIsCreateModalOpen(false);
        setEditingPost(null);
        router.push('/webboard', { scroll: false }); 
    };

    const handleSubmitPostForm = async (postData: { title: string; body: string; category: WebboardCategory; image?: string }, postIdToUpdate?: string) => {
        await webboardActions.addOrUpdateWebboardPost(postData, postIdToUpdate);
        await loadWebboardPosts(true);
        handleCloseCreateModal();
    };

    const handleToggleLikeForPage = async (postId: string) => {
        if (!currentUser) {
            router.push('/login');
            return;
        }
        await webboardActions.toggleWebboardPostLike(postId);
        setWebboardPostsList(prev => prev.map(p => {
            if (p.id === postId) {
                const newLikes = p.likes.includes(currentUser!.id)
                    ? p.likes.filter(id => id !== currentUser!.id)
                    : [...p.likes, currentUser!.id];
                return { ...p, likes: newLikes };
            }
            return p;
        }));
    };
    
    const enrichedPosts: EnrichedWebboardPost[] = webboardPostsList.map(post => ({
        ...post,
        commentCount: allComments.filter(c => c.postId === post.id).length,
        authorPhoto: users.find(u => u.id === post.userId)?.photo || post.authorPhoto,
        isAuthorAdmin: users.find(u => u.id === post.userId)?.role === 'Admin',
    }));

    return (
        <div className="p-2 sm:p-4 md:max-w-3xl md:mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl sm:text-3xl font-sans font-semibold text-primary-dark text-center sm:text-left">💬 กระทู้พูดคุย</h2>
                <Button onClick={handleOpenCreateModal} variant="login" size="sm" className="rounded-full font-semibold flex-shrink-0">+ สร้างกระทู้ใหม่</Button>
            </div>
            <div className="mb-6 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-neutral-DEFAULT/30 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center">
                <div className="w-full sm:w-auto sm:flex-1"><select id="categoryFilter" value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value as WebboardCategory | 'all')} className="w-full"><option value="all">หมวดหมู่ทั้งหมด</option>{Object.values(WebboardCategory).map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div className="w-full sm:w-auto sm:flex-1"><input type="search" id="searchWebboard" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาหัวข้อ, เนื้อหา, ผู้เขียน..." className="w-full" /></div>
            </div>
            {!isLoadingWebboardPosts && enrichedPosts.length === 0 && <div className="text-center py-10 bg-white p-6 rounded-lg shadow"><p className="text-xl font-serif text-neutral-dark mb-4 font-normal">{(searchTerm || selectedCategoryFilter !== 'all') ? 'ไม่พบกระทู้ที่ตรงกับเงื่อนไข' : 'ยังไม่มีกระทู้ในขณะนี้'}</p></div>}
            {enrichedPosts.length > 0 && <motion.div className="space-y-4" variants={listContainerVariants} initial="hidden" animate="visible">{enrichedPosts.map(post => <motion.div key={post.id} variants={itemVariants}><WebboardPostCard post={post} currentUser={currentUser} onViewPost={(id) => router.push(`/webboard/${id}`)} onToggleLike={handleToggleLikeForPage} onSavePost={userActions.saveWebboardPost} onSharePost={() => {}} requestLoginForAction={() => router.push('/login')} onNavigateToPublicProfile={(info) => router.push(`/profile/${info.userId}`)} getAuthorDisplayName={getAuthorDisplayName} /></motion.div>)}</motion.div>}
            <div ref={webboardLoaderRef} className="h-10 flex justify-center items-center">{isLoadingWebboardPosts && <p className="text-sm font-sans text-neutral-medium">กำลังโหลดเพิ่มเติม…</p>}</div>
            {!hasMoreWebboardPosts && enrichedPosts.length > 0 && <p className="text-center text-sm font-sans text-neutral-medium py-4">🎉 คุณดูครบทุกกระทู้แล้ว</p>}
            <WebboardPostCreateForm 
                isOpen={isCreateModalOpen} 
                onClose={handleCloseCreateModal} 
                onSubmit={handleSubmitPostForm} 
                editingPost={editingPost} 
                currentUser={currentUser} 
                checkWebboardPostLimits={webboardActions.checkWebboardPostLimits} 
            />
        </div>
    );
};