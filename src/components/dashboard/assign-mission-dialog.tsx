
"use client"

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Sparkles, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { smartMissionAssignment } from '@/ai/flows/smart-mission-assignment';
import { getAllOBCs, getOBCProfile, createMission } from '@/services/firestore';
import type { OBC, Mission, MissionTimelineStage } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';


interface AssignMissionDialogProps {
    onMissionCreated: () => void;
}

const defaultTimeline: MissionTimelineStage[] = [
    { stage: 'On my way to ATO', label: 'On my way to ATO', completed: false, timestamp: null, location: null },
    { stage: 'On my way to PU', label: 'On my way to PU', completed: false, timestamp: null, location: null },
    { stage: 'Arrival in ATO', label: 'Arrival in ATO', completed: false, timestamp: null, location: null },
    { stage: 'Arrival in PU', label: 'Arrival in PU', completed: false, timestamp: null, location:null },
    { stage: 'Received goods', label: 'Received goods', completed: false, timestamp: null, location: null, photoUrls: [], amountOfBoxes: 0 },
    { stage: 'On my way to ATO after PU', label: 'On my way to ATO after PU', completed: false, timestamp: null, location: null },
    { stage: 'Arrival in ATO after PU', label: 'Arrival in ATO after PU', completed: false, timestamp: null, location: null },
    { stage: 'Started Customs Clearance', label: 'Started Customs Clearance', completed: false, timestamp: null, location: null },
    { stage: 'Finished Customs Clearance', label: 'Finished Customs Clearance', completed: false, timestamp: null, location: null },
    { stage: 'On my way to check in goods', label: 'On my way to check in goods', completed: false, timestamp: null, location: null },
    { stage: 'Finished check-in', label: 'Finished check-in', completed: false, timestamp: null, location: null, photoUrls: [], attachmentUrls: [] },
    { stage: 'OBC and goods on board', label: 'OBC and goods on board', completed: false, timestamp: null, location: null, photoUrls: [], attachmentUrls: [] },
    { stage: 'Landing in connecting Hub', label: 'Landing in connecting Hub', completed: false, timestamp: null, location: null },
    { stage: 'On my way to migration', label: 'On my way to migration', completed: false, timestamp: null, location: null },
    { stage: 'On my way to Customs', label: 'On my way to Customs', completed: false, timestamp: null, location: null },
    { stage: 'Finished Customs', label: 'Finished Customs', completed: false, timestamp: null, location: null, photoUrls: [] },
    { stage: 'goods are collected connection Hub', label: 'Goods are collected connection Hub', completed: false, timestamp: null, location: null },
    { stage: 'On my way to connecting flight', label: 'On my way to connecting flight', completed: false, timestamp: null, location: null },
    { stage: 'OBC and goods on board connecting flight', label: 'OBC and goods on board connecting flight', completed: false, timestamp: null, location: null, photoUrls: [], attachmentUrls: [] },
    { stage: 'Landing Final destination', label: 'Landing Final destination', completed: false, timestamp: null, location: null },
    { stage: 'Goods are collected final destination', label: 'Goods are collected final destination', completed: false, timestamp: null, location: null },
    { stage: 'On my way to deliver', label: 'On my way to deliver', completed: false, timestamp: null, location: null, eta: '' },
    { stage: 'Delivered', label: 'Delivered', completed: false, timestamp: null, location: null, photoUrls: [], podUrl: '' },
];

export function AssignMissionDialog({ onMissionCreated }: AssignMissionDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [title, setTitle] = useState('');
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [details, setDetails] = useState('');

    const [suggestion, setSuggestion] = useState<{ suggestedObcId: string; reason: string } | null>(null);
    const [suggestedOBC, setSuggestedOBC] = useState<OBC | null>(null);
    const [availableOBCs, setAvailableOBCs] = useState<OBC[]>([]);
    const { toast } = useToast();

    useEffect(() => {
        if(isOpen) {
            // Reset state on open
            setTitle('');
            setOrigin('');
            setDestination('');
            setDetails('');
            setSuggestion(null);
            setSuggestedOBC(null);
            setIsLoading(false);
            setIsCreating(false);
            getAllOBCs().then(setAvailableOBCs);
        }
    }, [isOpen]);

    const handleGetSuggestion = async () => {
        if (!origin || !destination) {
            toast({ variant: 'destructive', title: "Missing Information", description: "Please provide an origin and destination."});
            return;
        }
        setIsLoading(true);
        setSuggestion(null);
        setSuggestedOBC(null);

        const missionDetails = `Title: ${title}; From ${origin} to ${destination}. Details: ${details}`;

        try {
            const result = await smartMissionAssignment({
                missionDetails,
                availableOBCs,
            });
            setSuggestion(result);
            if (result.suggestedObcId) {
                const obcProfile = await getOBCProfile(result.suggestedObcId);
                setSuggestedOBC(obcProfile);
            }
        } catch (error) {
            console.error("Failed to get suggestion:", error);
            toast({ variant: 'destructive', title: "AI Suggestion Failed", description: "Could not get an AI suggestion."});
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleCreateMission = async () => {
        if (!suggestion || !suggestedOBC) return;
        setIsCreating(true);

        const newMission: Omit<Mission, 'id'> = {
            title: title || `Mission from ${origin} to ${destination}`,
            origin,
            destination,
            obcIds: [suggestedOBC.obcId],
            status: 'Booked',
            timeline: defaultTimeline,
        };

        try {
            await createMission(newMission);
            toast({ title: "Mission Created!", description: `${suggestedOBC.name} has been assigned.`});
            onMissionCreated();
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to create mission:", error);
            toast({ variant: 'destructive', title: "Creation Failed", description: "Could not create the new mission."});
        } finally {
            setIsCreating(false);
        }
    }

    const getInitials = (name: string) => {
        return name ? name.split(' ').map(n => n[0]).join('') : '';
    }

    const canSubmit = title && origin && destination;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><PlusCircle /> Create Mission</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                    <DialogTitle>Smart Mission Creation & Assignment</DialogTitle>
                    <DialogDescription>
                        Use AI to find the best OBC for your new mission. Describe the mission below.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} className="col-span-3" placeholder="e.g., Urgent Documents Delivery" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="origin" className="text-right">Origin</Label>
                        <Input id="origin" value={origin} onChange={e => setOrigin(e.target.value)} className="col-span-3" placeholder="New York, USA" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="destination" className="text-right">Destination</Label>
                        <Input id="destination" value={destination} onChange={e => setDestination(e.target.value)} className="col-span-3" placeholder="Tokyo, Japan" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="mission-details" className="text-right">
                            Details
                        </Label>
                        <Textarea
                            id="mission-details"
                            placeholder="Additional details for the AI to consider (e.g., requires immediate pickup, fragile items)."
                            className="col-span-3"
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                        />
                    </div>
                </div>

                {suggestion && suggestedOBC && (
                    <Card className="bg-muted/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-accent" /> AI Suggestion</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={suggestedOBC.avatar} data-ai-hint="person portrait" />
                                <AvatarFallback>{getInitials(suggestedOBC.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-bold">{suggestedOBC.name}</p>
                                <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <DialogFooter>
                    {suggestion ? (
                        <Button onClick={handleCreateMission} disabled={isCreating}>
                            {isCreating ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                            ) : "Confirm & Create Mission" }
                        </Button>
                    ) : (
                         <Button onClick={handleGetSuggestion} disabled={isLoading || availableOBCs.length === 0 || !canSubmit}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Get Suggestion
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
