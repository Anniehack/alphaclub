"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPendingOBCs, approveOBC } from "@/services/firestore";
import type { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Eye } from 'lucide-react';
import { ViewRegistrationDialog } from './view-registration-dialog';

interface NewRegistrationsCardProps {
    onOBCApproved: () => void;
}

export function NewRegistrationsCard({ onOBCApproved }: NewRegistrationsCardProps) {
    const [pending, setPending] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const { toast } = useToast();

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchPendingOBCs = useCallback(() => {
        setLoading(true);
        getPendingOBCs()
            .then(setPending)
            .catch(err => {
                console.error("Failed to fetch pending OBCs:", err);
                toast({
                    variant: "destructive",
                    title: "Database Error",
                    description: "Could not fetch new registrations. You may need to create a Firestore index. Check the browser console for a link.",
                });
            })
            .finally(() => setLoading(false));
    }, [toast]);
    
    useEffect(() => {
        fetchPendingOBCs();
    }, [fetchPendingOBCs]);

    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    }

    const handleApprove = async (userId: string, name: string) => {
        setApprovingId(userId);
        try {
            await approveOBC(userId, name);
            toast({
                title: "OBC Approved!",
                description: `${name} is now an approved courier and a welcome email has been sent.`,
            });
            onOBCApproved();
            setIsDialogOpen(false);
            setSelectedUser(null);
            fetchPendingOBCs(); // Re-fetch to update the list
        } catch (error) {
            console.error("Failed to approve OBC:", error);
            toast({
                variant: "destructive",
                title: "Approval Failed",
                description: "Could not approve the courier.",
            });
        } finally {
            setApprovingId(null);
        }
    }
    
    const getInitials = (name: string) => {
        return name ? name.split(' ').map(n => n[0]).join('') : '';
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>New Registrations</CardTitle>
                    <CardDescription>Review and approve new OBC sign-ups.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-md" />)
                    ) : pending.length > 0 ? (
                        pending.map(user => (
                            <div key={user.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={user.avatar} data-ai-hint="person portrait" />
                                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-semibold">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    onClick={() => handleViewDetails(user)} 
                                    variant="outline"
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No new registrations.</p>
                    )}
                </CardContent>
            </Card>
            <ViewRegistrationDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={selectedUser}
                onApprove={handleApprove}
                isApproving={!!approvingId}
            />
        </>
    );
}
