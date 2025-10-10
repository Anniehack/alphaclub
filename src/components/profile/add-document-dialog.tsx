
"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useUser } from '@/hooks/use-user';
import { addDocument } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { DocumentType, UserDocument } from '@/types';

interface AddDocumentDialogProps {
    children: React.ReactNode;
    onDocumentAdded: () => void;
}

export function AddDocumentDialog({ children, onDocumentAdded }: AddDocumentDialogProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [type, setType] = useState<DocumentType | ''>('');
    const [country, setCountry] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const resetForm = () => {
        setType('');
        setCountry('');
        setExpiryDate('');
        setFile(null);
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    }
    
    const handleSubmit = async () => {
        const isExpiryRequired = type !== 'GlobalEntry' && type !== 'APEC';
        
        if (!user || !type || !file || (isExpiryRequired && !expiryDate)) {
            toast({ variant: 'destructive', title: "Missing fields", description: "Please fill in all required fields and select a file." });
            return;
        }
        setIsLoading(true);

        try {
            const filePath = `users/${user.id}/documents/${type}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const documentData: Omit<UserDocument, 'id'> = {
                type,
                expiryDate: expiryDate || '',
                image: downloadURL,
                ...(country && { country }),
            };

            await addDocument(user.id, documentData);
            toast({ title: "Document Added!", description: `Your ${type} has been saved.` });
            onDocumentAdded();
            resetForm();
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to add document:", error);
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not save your document."});
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            setIsOpen(open);
        }}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Document</DialogTitle>
                    <DialogDescription>
                        Provide the details and attach a scan of your new document.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Type</Label>
                        <Select onValueChange={(value) => setType(value as DocumentType)} value={type}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Passport">Passport</SelectItem>
                                <SelectItem value="Visa">Visa</SelectItem>
                                <SelectItem value="DriversLicense">Driver's License</SelectItem>
                                <SelectItem value="GlobalEntry">Global Entry</SelectItem>
                                <SelectItem value="APEC">APEC Card</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {type === 'Passport' || type === 'Visa' ? (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="country" className="text-right">Country</Label>
                            <Input id="country" value={country} onChange={e => setCountry(e.target.value)} className="col-span-3" placeholder="e.g., USA" />
                        </div>
                    ) : null}
                     {type && type !== 'GlobalEntry' && type !== 'APEC' ? (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expiry" className="text-right">Expiry Date</Label>
                            <Input id="expiry" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="col-span-3" />
                        </div>
                    ) : null}
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="file" className="text-right">Document Scan</Label>
                        <Input id="file" type="file" onChange={handleFileChange} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isLoading || !type || !file}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Document
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
