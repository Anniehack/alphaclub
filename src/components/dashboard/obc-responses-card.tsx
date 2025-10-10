
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getMissionApplications, approveMissionApplication, rejectMissionApplication } from '@/services/firestore';
import type { MissionApplication } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Plane, Truck, Luggage, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ServiceTypeIcons = ({ serviceType }: { serviceType: Array<'OBC' | 'First Mile' | 'Last Mile'> | undefined }) => {
    if (!serviceType || serviceType.length === 0) return <span>-</span>;
    
    const icons = {
        OBC: <Plane className="h-5 w-5" title="OBC" />,
        'First Mile': <Truck className="h-5 w-5" title="First Mile" />,
        'Last Mile': <Luggage className="h-5 w-5" title="Last Mile" />,
    };

    return (
        <div className="flex gap-3 items-center">
            {serviceType.map(type => (
                <div key={type}>{icons[type]}</div>
            ))}
        </div>
    );
};

export function ObcResponsesCard() {
    const [applications, setApplications] = useState<MissionApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchApplications = useCallback(() => {
        setLoading(true);
        getMissionApplications()
            .then(setApplications)
            .catch(err => {
                console.error("Failed to fetch mission applications:", err);
                toast({ variant: 'destructive', title: "Fetch Failed", description: "Could not fetch OBC responses. You may need to create a Firestore index." });
            })
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const handleApprove = async (app: MissionApplication) => {
        setUpdatingId(app.id);
        try {
            await approveMissionApplication(app);
            toast({ title: "Application Approved", description: `${app.obcName} has been assigned to ${app.missionTitle}.`});
            fetchApplications(); // Re-fetch to update the list
        } catch (error: any) {
            console.error("Failed to approve application:", error);
            toast({ variant: 'destructive', title: "Approval Failed", description: error.message || "Could not approve the application." });
        } finally {
            setUpdatingId(null);
        }
    };

    const handleReject = async (app: MissionApplication) => {
        setUpdatingId(app.id);
        try {
            await rejectMissionApplication(app.id);
            toast({ title: "Application Rejected", description: `${app.obcName}'s application has been rejected.`});
            fetchApplications(); // Re-fetch to update the list
        } catch (error) {
            console.error("Failed to reject application:", error);
            toast({ variant: 'destructive', title: "Rejection Failed", description: "Could not reject the application." });
        } finally {
            setUpdatingId(null);
        }
    };

    const statusBadgeVariant = (status: MissionApplication['status']) => {
        switch (status) {
            case 'approved': return 'default';
            case 'rejected': return 'destructive';
            case 'pending':
            default:
                return 'outline';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>OBC Responses to Missions</CardTitle>
                <CardDescription>Review OBC applications for missions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mission Name</TableHead>
                                <TableHead>OBC Name</TableHead>
                                <TableHead>OBC Number</TableHead>
                                <TableHead>Application Date</TableHead>
                                <TableHead>Service Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7} className="p-0"><Skeleton className="h-12 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : applications.length > 0 ? (
                                applications.map(app => {
                                    const isActionable = app.status === 'pending';
                                    return (
                                        <TableRow key={app.id}>
                                            <TableCell className="font-medium">{app.missionTitle}</TableCell>
                                            <TableCell>{app.obcName}</TableCell>
                                            <TableCell className="font-mono text-xs">{app.obcNumber}</TableCell>
                                            <TableCell>{format(new Date(app.applicationDate), 'PPP')}</TableCell>
                                            <TableCell><ServiceTypeIcons serviceType={app.serviceType} /></TableCell>
                                            <TableCell><Badge variant={statusBadgeVariant(app.status)} className={cn("capitalize")}>{app.status}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleApprove(app)} 
                                                    disabled={!!updatingId || !isActionable}
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-500 dark:hover:bg-green-900/50"
                                                >
                                                    {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => handleReject(app)} 
                                                    disabled={!!updatingId || !isActionable}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-500 dark:hover:bg-red-900/50"
                                                >
                                                    {updatingId === app.id ? null : <X className="h-4 w-4" />}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No OBC responses yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
