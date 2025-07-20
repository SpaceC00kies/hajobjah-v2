"use client";
import React, { useState, useEffect } from 'react';
import { functions } from '../../lib/firebase/clientApp';
import { httpsCallable } from 'firebase/functions';
import type { AdminDashboardData, VouchReport, User } from '@/types/types';
import { PlatformVitals } from './widgets/PlatformVitals';
import { ActionCenter } from './widgets/ActionCenter';
import { GrowthChart } from './widgets/GrowthChart';
import { logFirebaseError } from '../../firebase/logging';

interface AdminOverviewProps {
    vouchReports: VouchReport[];
    users: User[];
    onSelectReport: (report: VouchReport) => void;
    getAuthorDisplayName: (userId: string) => string;
}

const getAdminDashboardData = httpsCallable<void, AdminDashboardData>(functions, 'getAdminDashboardData');

export const AdminOverview: React.FC<AdminOverviewProps> = ({ vouchReports, users, onSelectReport, getAuthorDisplayName }) => {
    const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const result = await getAdminDashboardData();
                setDashboardData(result.data);
            } catch (error) {
                logFirebaseError("AdminOverview.fetchData", error);
                console.error("Failed to fetch admin dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const pendingReports = vouchReports.filter(r => r.status === 'pending_review');
    const newUsers = users.filter(u => new Date(u.createdAt as string) > new Date(Date.now() - 24 * 60 * 60 * 1000));

    return (
        <div className="space-y-6">
            <PlatformVitals vitals={dashboardData?.vitals} isLoading={isLoading} />
            
            <div className="dashboard-grid">
                <div className="lg:col-span-2">
                    <GrowthChart data={dashboardData?.userGrowth || []} isLoading={isLoading} />
                </div>
                <div className="lg:col-span-1">
                    <ActionCenter 
                        pendingReports={pendingReports} 
                        onSelectReport={onSelectReport}
                        getAuthorDisplayName={getAuthorDisplayName}
                    />
                </div>
            </div>
             {/* Additional widgets like PostActivityChart can be added here */}
        </div>
    );
};