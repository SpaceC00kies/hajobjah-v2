// hooks/useAdminData.ts
import { useState, useEffect } from 'react';
import type { User, Interaction, WebboardPost, WebboardComment, Job, HelperProfile, VouchReport, BlogPost } from '@/types/types';
import { subscribeToUsersService } from '@/services/userService';
import { subscribeToAllJobsService } from '@/services/jobService';
import { subscribeToAllHelperProfilesService } from '@/services/helperProfileService';
import { subscribeToWebboardCommentsService, subscribeToAllWebboardPostsService } from '@/services/webboardService';
import { subscribeToInteractionsService } from '@/services/interactionService';
import { subscribeToVouchReportsService } from '@/services/adminService';
import { getBlogPostsForAdmin } from '@/services/blogService';

export const useAdminData = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [webboardPosts, setWebboardPosts] = useState<WebboardPost[]>([]);
    const [webboardComments, setWebboardComments] = useState<WebboardComment[]>([]);
    const [vouchReports, setVouchReports] = useState<VouchReport[]>([]);
    const [allBlogPostsForAdmin, setAllBlogPostsForAdmin] = useState<BlogPost[]>([]);
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAdminBlogPosts = async () => {
            const adminPosts = await getBlogPostsForAdmin();
            setAllBlogPostsForAdmin(adminPosts);
        };
        
        const unsubscribers = [
            subscribeToAllJobsService(setJobs),
            subscribeToAllHelperProfilesService(setHelperProfiles),
            subscribeToUsersService(setUsers),
            subscribeToAllWebboardPostsService(setWebboardPosts),
            subscribeToWebboardCommentsService(setWebboardComments),
            subscribeToVouchReportsService(setVouchReports),
            subscribeToInteractionsService(setInteractions)
        ];

        Promise.all([fetchAdminBlogPosts()]).finally(() => setIsLoading(false));

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    return { 
        jobs, 
        helperProfiles, 
        users, 
        webboardPosts, 
        webboardComments, 
        vouchReports, 
        allBlogPostsForAdmin,
        interactions,
        isLoading 
    };
};
