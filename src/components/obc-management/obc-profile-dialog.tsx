

"use client"

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User, UserDocument, UserComment } from "@/types";
import { Loader2, CheckCircle, Hash, Building, Phone, Home, DollarSign, Plane, FileText, Truck, Landmark, MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getUserDocuments, addUserComment, onUserCommentsUpdate } from '@/services/firestore';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { useUser } from '@/hooks/use-user';
import { format } from 'date-fns';

interface OBCProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  obc: User | null;
}

const getInitials = (name?: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('');
}

const InfoItem = ({ icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div>
            <p className="text-muted-foreground text-sm flex items-center gap-2"><Icon className="h-4 w-4" /> {label}</p>
            <p className="font-medium">{children || "N/A"}</p>
        </div>
    )
}

function CommentsSection({ obcId }: { obcId: string }) {
    const { user: adminUser } = useUser();
    const [comments, setComments] = useState<UserComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!obcId) return;
        
        setLoading(true);
        const unsubscribe = onUserCommentsUpdate(obcId, (updatedComments) => {
            setComments(updatedComments);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [obcId]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !adminUser) return;
        setIsSubmitting(true);
        try {
            await addUserComment(obcId, {
                authorId: adminUser.id,
                authorName: adminUser.name,
                text: newComment,
            });
            setNewComment("");
        } catch (error) {
            console.error("Failed to add comment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Admin Comments</h4>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <Textarea 
                        placeholder="Add a new comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <Button onClick={handleAddComment} disabled={isSubmitting || !newComment.trim()}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {loading ? (
                        <Skeleton className="h-16 w-full" />
                    ) : comments.length > 0 ? (
                        comments.map(comment => (
                             <div key={comment.id} className="text-sm p-2 rounded-md bg-muted/50">
                                <p className="whitespace-pre-wrap">{comment.text}</p>
                                <p className="text-xs text-muted-foreground mt-1 text-right">
                                    - {comment.authorName} on {format(new Date(comment.createdAt as string), 'PPP')}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground text-center pt-4">No comments yet.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export function OBCProfileDialog({ isOpen, onOpenChange, obc }: OBCProfileDialogProps) {
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    useEffect(() => {
        if (isOpen && obc) {
            setLoadingDocs(true);
            getUserDocuments(obc.id)
                .then(setDocuments)
                .finally(() => setLoadingDocs(false));
        } else {
            setDocuments([]);
        }
    }, [isOpen, obc]);
    
    if (!obc) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>OBC Profile</DialogTitle>
                    <DialogDescription>
                        Full details for {obc.name}.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-6">
                    <div className="py-4 space-y-6">
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={obc.avatar} data-ai-hint="person portrait" />
                                <AvatarFallback className="text-xl">{getInitials(obc.name)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-0.5">
                                <p className="font-semibold text-lg">{obc.name}</p>
                                <p className="text-sm text-muted-foreground">{obc.email}</p>
                                <p className="font-mono text-sm text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3"/>{obc.obcNumber || 'N/A'}</p>
                                <Badge variant="outline" className="w-fit mt-1">{obc.availability || "Unavailable"}</Badge>
                            </div>
                        </div>

                        <Separator />

                        {/* Contact & Location */}
                        <div>
                             <h4 className="font-semibold mb-2">Contact & Location</h4>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <InfoItem icon={Phone} label="Mobile Number">{obc.mobileNumber}</InfoItem>
                                <InfoItem icon={Building} label="Base City">{obc.baseCity}</InfoItem>
                                <InfoItem icon={Home} label="Address">{obc.address}</InfoItem>
                                <InfoItem icon={Building} label="Current Location">{obc.currentLocation}</InfoItem>
                            </div>
                        </div>

                        <Separator />

                        {/* Financial & Loyalty */}
                         <div>
                             <h4 className="font-semibold mb-2">Financial, Banking & Tax</h4>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <InfoItem icon={DollarSign} label="Credit Card Limit">
                                   {obc.creditCardLimit ? `$${obc.creditCardLimit.toLocaleString()}` : 'N/A'}
                                </InfoItem>
                                {obc.rfc && (
                                    <InfoItem icon={FileText} label="RFC">{obc.rfc}</InfoItem>
                                )}
                             </div>
                             {obc.bankDetails && (
                                 <div className="mt-4 space-y-2">
                                     <div className="text-sm p-2 rounded-md bg-muted/50">
                                         <p className="font-medium flex items-center gap-2"><Landmark className="h-4 w-4" /> Bank Details</p>
                                         <div className="pl-6 mt-1 space-y-1 text-xs">
                                             <p><strong>Bank:</strong> {obc.bankDetails.bankName}</p>
                                             <p><strong>IBAN:</strong> {obc.bankDetails.iban}</p>
                                             <p><strong>SWIFT:</strong> {obc.bankDetails.swift}</p>
                                         </div>
                                     </div>
                                 </div>
                             )}
                             <div className="mt-4">
                                <p className="text-muted-foreground text-sm flex items-center gap-2"><Plane className="h-4 w-4" /> Airline Loyalty</p>
                                 <div className="space-y-1 mt-1">
                                    {obc.airlineLoyaltyPrograms && obc.airlineLoyaltyPrograms.length > 0 ? obc.airlineLoyaltyPrograms.map((p, i) => (
                                        <div key={i} className="text-sm p-2 rounded-md bg-muted/50">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{p.airline}</span>
                                                <Badge variant="outline">{p.status}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-mono mt-1">#{p.programNumber}</p>
                                        </div>
                                    )) : <p className="text-sm">No programs listed.</p>}
                                </div>
                             </div>
                        </div>

                        <Separator />

                        {/* Unit Data */}
                        {obc.units && obc.units.length > 0 && (
                            <>
                                <div>
                                    <h4 className="font-semibold mb-2">Unit Data</h4>
                                    <div className="space-y-2">
                                        {obc.units.map((unit, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                                <div className="flex items-center gap-2">
                                                    <Truck className="h-4 w-4" />
                                                    <span className="font-medium">{unit.type}</span>
                                                </div>
                                                <span className="text-muted-foreground font-mono">{unit.plateNumber}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <Separator />
                            </>
                        )}
                        
                        {/* Documents */}
                        <div>
                             <h4 className="font-semibold mb-2">Documents</h4>
                             {loadingDocs ? <Skeleton className="h-24 w-full" /> : (
                                 <div className="space-y-2">
                                     {documents.map(doc => (
                                         <div key={doc.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                <span className="font-medium">{doc.type.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            </div>
                                             <div className="flex items-center gap-4">
                                                {doc.expiryDate && <span className="text-muted-foreground">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</span>}
                                                <a href={doc.image} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="link" size="sm" className="p-0 h-auto">View Scan</Button>
                                                </a>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </div>

                        <Separator />

                        {/* Comments */}
                        <CommentsSection obcId={obc.id} />

                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
