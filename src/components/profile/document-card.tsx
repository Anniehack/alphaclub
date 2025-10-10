import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserDocument } from "@/types";
import { Button } from "../ui/button";
import { Calendar, Globe } from "lucide-react";

interface DocumentCardProps {
    document: UserDocument;
}

export function DocumentCard({ document }: DocumentCardProps) {
    const hasValidExpiry = document.expiryDate && !isNaN(new Date(document.expiryDate).getTime());
    const isExpired = hasValidExpiry && new Date(document.expiryDate) < new Date();
    const expiryDateFormatted = hasValidExpiry ? new Date(document.expiryDate).toLocaleDateString() : null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{document.type.replace(/([A-Z])/g, ' $1').trim()}</CardTitle>
                <CardDescription>Manage your document details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {document.image && (
                     <div className="relative aspect-video rounded-md overflow-hidden">
                        <Image src={document.image} alt={`${document.type} scan`} fill sizes="100vw" className="object-cover" data-ai-hint="document scan" />
                    </div>
                )}
                <div className="space-y-2 text-sm">
                    {document.country && (
                        <div className="flex items-center gap-2">
                           <Globe className="h-4 w-4 text-muted-foreground" /> 
                           <span>Country of Issue: <strong>{document.country}</strong></span>
                        </div>
                    )}
                    {hasValidExpiry && expiryDateFormatted && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" /> 
                            <span className={isExpired ? 'text-red-500' : ''}>Expiry Date: <strong>{expiryDateFormatted}</strong></span>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline">Update</Button>
                <Button variant="ghost">View</Button>
            </CardFooter>
        </Card>
    )
}
