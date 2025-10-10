
"use client"

import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { getUserDocuments } from "@/services/firestore";
import { DocumentCard } from "@/components/profile/document-card";
import { Separator } from "@/components/ui/separator";
import type { UserDocument } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AddDocumentDialog } from "@/components/profile/add-document-dialog";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
    const { user, loading } = useUser();
    const { toast } = useToast();
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);

    const fetchDocuments = useCallback(async () => {
        if (user) {
            setLoadingDocs(true);
            getUserDocuments(user.id)
                .then(setDocuments)
                .catch(() => {
                    toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: 'Could not fetch your documents.',
                    });
                })
                .finally(() => setLoadingDocs(false));
        }
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchDocuments();
        }
    }, [user, fetchDocuments]);

    const getInitials = (name: string) => {
        if (!name) return "";
        return name.split(' ').map(n => n[0]).join('');
    }

    if (loading || !user) {
        return (
             <div className="space-y-6">
                <div>
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-5 w-1/2 mt-2" />
                </div>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                    <CardContent className="flex items-start gap-8">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-5 w-1/4" />
                        </div>
                    </CardContent>
                </Card>
                <Separator />
                <div>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-5 w-1/2 mt-2" />
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">My Profile</h1>
                <p className="text-muted-foreground">Manage your account settings and personal documents.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row items-start gap-8">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={user.avatar} data-ai-hint="user avatar" />
                        <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-2 flex-1">
                        <div className="text-sm"><strong className="w-24 inline-block">Name:</strong> {user.name}</div>
                        <div className="text-sm"><strong className="w-24 inline-block">Email:</strong> {user.email}</div>
                        <div className="text-sm"><strong className="w-24 inline-block">Role:</strong> <span className="capitalize">{user.role}</span></div>
                        {user.role === 'obc' && user.obcNumber && (
                           <div className="text-sm"><strong className="w-24 inline-block">OBC #:</strong> <span className="font-mono">{user.obcNumber}</span></div>
                        )}
                        <EditProfileDialog>
                            <Button variant="outline" size="sm" className="mt-2 w-fit">Edit Profile</Button>
                        </EditProfileDialog>
                    </div>
                </CardContent>
            </Card>

            <Separator />
            
            <div>
                <h2 className="text-2xl font-bold font-headline">Document Control</h2>
                <p className="text-muted-foreground">Keep your travel documents up-to-date.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingDocs ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-lg" />)
                ) : (
                    <>
                        {documents.map(doc => (
                            <DocumentCard key={doc.type} document={doc} />
                        ))}
                    </>
                )}
                 <AddDocumentDialog onDocumentAdded={fetchDocuments}>
                    <Card className="border-dashed border-2 flex flex-col items-center justify-center h-full min-h-[200px] hover:border-primary transition-colors cursor-pointer">
                        <Button variant="ghost">Add New Document</Button>
                    </Card>
                 </AddDocumentDialog>
            </div>
        </div>
    );
}
