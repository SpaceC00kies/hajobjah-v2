// services/serverService.ts
import { serverDb } from '@/lib/firebase/serverApp';
import type { User, Job, HelperProfile, WebboardPost, PaginatedDocsResponse, Cursor, WebboardCategory } from '@/types/types';
import { Timestamp } from 'firebase-admin/firestore';

const convertAdminTimestamps = (data: any): any => {
    if (data === null || typeof data !== 'object') {
        return data;
    }
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    if (Array.isArray(data)) {
        return data.map(convertAdminTimestamps);
    }
    const result: { [key: string]: any } = {};
    for (const key in data) {
        result[key] = convertAdminTimestamps(data[key]);
    }
    return result;
};

export const getUsersServer = async (): Promise<User[]> => {
    const snapshot = await serverDb.collection('users').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...convertAdminTimestamps(doc.data()) } as User));
};

export const getJobsPaginatedServer = async (pageSize: number, cursor?: Cursor): Promise<PaginatedDocsResponse<Job>> => {
    let query = serverDb.collection('jobs')
        .where('isExpired', '==', false)
        .where('isSuspicious', '==', false)
        .orderBy('isPinned', 'desc')
        .orderBy('updatedAt', 'desc')
        .limit(pageSize);

    if (cursor) {
        query = query.startAfter(cursor.isPinned, Timestamp.fromMillis(new Date(cursor.updatedAt).getTime()));
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...convertAdminTimestamps(doc.data()) } as Job));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    const nextCursor: Cursor | null = lastDoc 
        ? { isPinned: lastDoc.data().isPinned, updatedAt: convertAdminTimestamps(lastDoc.data().updatedAt) } 
        : null;

    return { items, cursor: nextCursor };
};

export const getHelperProfilesPaginatedServer = async (pageSize: number, cursor?: Cursor): Promise<PaginatedDocsResponse<HelperProfile>> => {
    let query = serverDb.collection('helperProfiles')
        .where('isExpired', '==', false)
        .where('isSuspicious', '==', false)
        .orderBy('isPinned', 'desc')
        .orderBy('updatedAt', 'desc')
        .limit(pageSize);

    if (cursor) {
        query = query.startAfter(cursor.isPinned, Timestamp.fromMillis(new Date(cursor.updatedAt).getTime()));
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...convertAdminTimestamps(doc.data()) } as HelperProfile));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    const nextCursor: Cursor | null = lastDoc
        ? { isPinned: lastDoc.data().isPinned, updatedAt: convertAdminTimestamps(lastDoc.data().updatedAt) }
        : null;

    return { items, cursor: nextCursor };
};

export const getWebboardPostsPaginatedServer = async (pageSize: number, cursor?: Cursor): Promise<PaginatedDocsResponse<WebboardPost>> => {
    let query = serverDb.collection('webboardPosts')
        .orderBy("isPinned", "desc")
        .orderBy("createdAt", "desc")
        .limit(pageSize);

    if (cursor) {
        query = query.startAfter(cursor.isPinned, Timestamp.fromMillis(new Date(cursor.updatedAt).getTime()));
    }

    const snapshot = await query.get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...convertAdminTimestamps(doc.data()) } as WebboardPost));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    const nextCursor: Cursor | null = lastDoc 
        ? { isPinned: lastDoc.data().isPinned, updatedAt: convertAdminTimestamps(lastDoc.data().createdAt) }
        : null;
        
    return { items, cursor: nextCursor };
};