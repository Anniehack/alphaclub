

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
import type { User, UserDocument } from "@/types";
import { Loader2, CheckCircle, Hash, Building, Phone, Home, DollarSign, Plane, FileText, Truck, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getUserDocuments } from '@/services/firestore';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';

interface ViewRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User | null;
  onApprove: (userId: string, name: string) => void;
  isApproving: boolean;
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

export function ViewRegistrationDialog({ isOpen, onOpenChange, user, onApprove, isApproving }: ViewRegistrationDialogProps) {
    const [documents, setDocuments] = useState<UserDocument[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setLoadingDocs(true);
            getUserDocuments(user.id)
                .then(setDocuments)
                .finally(() => setLoadingDocs(false));
        } else {
            setDocuments([]);
        }
    }, [isOpen, user]);
    
    if (!user) return null;

    const handleApproveClick = () => {
        onApprove(user.id, user.name);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>OBC Registration Details</DialogTitle>
                    <DialogDescription>
                        Review the details below and approve the registration.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-6">
                    <div className="py-4 space-y-6">
                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={user.avatar} data-ai-hint="person portrait" />
                                <AvatarFallback className="text-xl">{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-0.5">
                                <p className="font-semibold text-lg">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <Badge variant="outline" className="w-fit mt-1">{user.registrationStatus}</Badge>
                            </div>
                        </div>

                        <Separator />

                        {/* Contact & Location */}
                        <div>
                             <h4 className="font-semibold mb-2">Contact & Location</h4>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <InfoItem icon={Phone} label="Mobile Number">{user.mobileNumber}</InfoItem>
                                <InfoItem icon={Building} label="Base City">{user.baseCity}</InfoItem>
                                <InfoItem icon={Home} label="Address">{user.address}</InfoItem>
                            </div>
                        </div>

                        <Separator />

                        {/* Financial & Loyalty */}
                         <div>
                             <h4 className="font-semibold mb-2">Financial, Banking & Tax</h4>
                             <div className="grid grid-cols-2 gap-4 text-sm">
                                <InfoItem icon={DollarSign} label="Credit Card Limit">
                                   {user.creditCardLimit ? `$${user.creditCardLimit.toLocaleString()}` : 'N/A'}
                                </InfoItem>
                                {user.rfc && (
                                    <InfoItem icon={FileText} label="RFC">{user.rfc}</InfoItem>
                                )}
                             </div>
                             {user.bankDetails && (
                                 <div className="mt-4 space-y-2">
                                     <div className="text-sm p-2 rounded-md bg-muted/50">
                                         <p className="font-medium flex items-center gap-2"><Landmark className="h-4 w-4" /> Bank Details</p>
                                         <div className="pl-6 mt-1 space-y-1 text-xs">
                                             <p><strong>Bank:</strong> {user.bankDetails.bankName}</p>
                                             <p><strong>IBAN:</strong> {user.bankDetails.iban}</p>
                                             <p><strong>SWIFT:</strong> {user.bankDetails.swift}</p>
                                         </div>
                                     </div>
                                 </div>
                             )}
                             <div className="mt-4">
                                <p className="text-muted-foreground text-sm flex items-center gap-2"><Plane className="h-4 w-4" /> Airline Loyalty</p>
                                 <div className="space-y-1 mt-1">
                                    {user.airlineLoyaltyPrograms && user.airlineLoyaltyPrograms.length > 0 ? user.airlineLoyaltyPrograms.map((p, i) => (
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
                        {user.units && user.units.length > 0 && (
                            <>
                                <div>
                                    <h4 className="font-semibold mb-2">Unit Data</h4>
                                    <div className="space-y-2">
                                        {user.units.map((unit, i) => (
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

                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApproving}>Cancel</Button>
                    <Button onClick={handleApproveClick} disabled={isApproving}>
                        {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        {isApproving ? 'Approving...' : 'Approve Registration'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
