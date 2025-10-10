
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
import { KeyRound, Copy, Loader2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { createInviteCode } from '@/services/firestore';

interface GenerateInviteCodeDialogProps {
    onInviteGenerated?: () => void;
}

export function GenerateInviteCodeDialog({ onInviteGenerated }: GenerateInviteCodeDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const generateCode = async () => {
        if (!email) {
            toast({
                variant: 'destructive',
                title: "Email Required",
                description: "Please enter the OBC's email address."
            });
            return;
        }

        setIsLoading(true);
        const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        try {
            await createInviteCode(newCode, email);
            setCode(newCode);
            toast({
                title: "Invite Code Generated!",
                description: `Code ${newCode} has been created for ${email}.`,
            });
            onInviteGenerated?.();
        } catch (error) {
            console.error("Failed to create invite code:", error);
            toast({
                variant: 'destructive',
                title: "Generation Failed",
                description: "Could not create an invite code in the database."
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = () => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        toast({
            title: "Copied to clipboard!",
            description: `Invite code ${code} is ready to be shared.`
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button><KeyRound /> Generate Invite</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate OBC Invite Code</DialogTitle>
                    <DialogDescription>
                        Generate a unique one-time code for a specific OBC email address.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="obc-email">OBC Email</Label>
                        <Input 
                            id="obc-email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="courier@email.com" 
                            type="email"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="invite-code">Generated Code</Label>
                        <div className="flex gap-2">
                            <Input id="invite-code" value={code} readOnly placeholder="Click generate to create a code" />
                            <Button variant="outline" size="icon" onClick={copyToClipboard} disabled={!code}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={generateCode} disabled={isLoading || !email}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Code
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
