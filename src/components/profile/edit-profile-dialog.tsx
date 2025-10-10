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
import { Loader2 } from "lucide-react";
import { useUser } from '@/hooks/use-user';
import { updateUser } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface EditProfileDialogProps {
    children: React.ReactNode;
}

const getInitials = (name?: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('');
}


export function EditProfileDialog({ children }: EditProfileDialogProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setPreview(URL.createObjectURL(file));
        }
    }

    const resetForm = () => {
        setAvatarFile(null);
        setPreview(null);
    }
    
    const handleSubmit = async () => {
        if (!user || !avatarFile) {
            toast({ variant: 'destructive', title: "No file selected", description: "Please select an image to upload." });
            return;
        }
        setIsLoading(true);

        try {
            const storageRef = ref(storage, `avatars/${user.id}/${avatarFile.name}`);
            await uploadBytes(storageRef, avatarFile);
            const downloadURL = await getDownloadURL(storageRef);

            await updateUser(user.id, { avatar: downloadURL });

            toast({ title: "Profile Updated!", description: "Your new profile picture has been saved." });
            resetForm();
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not save your new picture."});
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
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                        Update your profile picture.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-32 w-32">
                            <AvatarImage src={preview || user?.avatar} data-ai-hint="user avatar" />
                            <AvatarFallback className="text-5xl">{getInitials(user?.name)}</AvatarFallback>
                        </Avatar>
                        <div className="w-full">
                            <Label htmlFor="avatar" className="sr-only">Profile Picture</Label>
                            <Input id="avatar" type="file" accept="image/*" onChange={handleFileChange} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={isLoading || !avatarFile}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
