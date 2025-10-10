"use client";

import { useState, useCallback } from "react";
import { NewRegistrationsCard } from "@/components/obc-management/new-registrations-card";
import { ObcListCard } from "@/components/dashboard/obc-list-card";

export default function ObcManagementPage() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleApproval = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">OBC Management</h1>
                <p className="text-muted-foreground">Approve new courier registrations and view all active couriers.</p>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <ObcListCard key={`approved-${refreshKey}`} />
                </div>
                <div className="xl:col-span-1">
                    <NewRegistrationsCard onOBCApproved={handleApproval} key={`pending-${refreshKey}`} />
                </div>
            </div>
        </div>
    );
}
