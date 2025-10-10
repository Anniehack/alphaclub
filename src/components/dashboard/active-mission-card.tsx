
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateMission, onOBCProfileUpdate } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Mission, OBC, MissionTimelineStage } from '@/types';
import { 
    Trash2, MessageSquare, Paperclip, MapPin, Pencil, Loader2, Plane, Truck, Luggage, ExternalLink, Activity,
    Archive, Building, FileScan, Fingerprint, Package, PackageCheck, PackageSearch, PlaneLanding, PlaneTakeoff, ShieldCheck, Ticket,
    CheckCircle, Circle, FileText
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { MissionChatSheet } from '../chat/mission-chat-sheet';
import { format } from 'date-fns';

const stageIcons: Record<string, React.ElementType> = {
    'On my way to ATO': Truck,
    'On my way to PU': Package,
    'Arrival in ATO': Plane,
    'Arrival in PU': Building,
    'Received goods': Archive,
    'On my way to ATO after PU': Truck,
    'Arrival in ATO after PU': Plane,
    'Started Customs Clearance': FileScan,
    'Finished Customs Clearance': ShieldCheck,
    'On my way to check in goods': Luggage,
    'Finished check-in': Ticket,
    'OBC and goods on board': PlaneTakeoff,
    'Landing in connecting Hub': PlaneLanding,
    'On my way to migration': Fingerprint,
    'On my way to Customs': FileScan,
    'Finished Customs': ShieldCheck,
    'goods are collected connection Hub': PackageSearch,
    'On my way to connecting flight': Plane,
    'OBC and goods on board connecting flight': PlaneTakeoff,
    'Landing Final destination': PlaneLanding,
    'Goods are collected final destination': PackageSearch,
    'On my way to deliver': Truck,
    'Delivered': PackageCheck,
};

interface ActiveMissionCardProps {
    mission: Mission;
    onMissionUpdate?: () => void;
}

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

const AdminViewTimelineItem = ({ stage, isLast }: { stage: MissionTimelineStage, isLast: boolean }) => (
  <div className="flex gap-4 group">
    <div className="flex flex-col items-center">
      {stage.completed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground/50" />}
      {!isLast && <div className="w-px flex-grow bg-border mt-2" />}
    </div>
    <div className="flex-1 pb-4">
      <p className="font-medium">{stage.label}</p>
      {stage.completed ? (
        <div className="text-xs text-muted-foreground space-y-2 mt-1">
          <p>{format(new Date(stage.timestamp!), "PPP p")}</p>
          {stage.amountOfBoxes && <p>Amount of Boxes: {stage.amountOfBoxes}</p>}
          {stage.eta && <p>ETA: {format(new Date(stage.eta), "PPP p")}</p>}
          {stage.podUrl && <a href={stage.podUrl} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">View POD</a>}
          {(stage.photoUrls && stage.photoUrls?.length > 0) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {stage.photoUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <Image src={url} alt={`Photo ${i}`} width={48} height={48} className="rounded-md object-cover aspect-square" />
                </a>
              ))}
            </div>
          )}
          {(stage.attachmentUrls && stage.attachmentUrls.length > 0) && (
             <div className="space-y-1 pt-1">
              {stage.attachmentUrls.map((url, i) => (
                <a key={i} href={url} className="text-primary hover:underline flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3 w-3" /> Attachment {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Pending</p>
      )}
    </div>
  </div>
);

export function ActiveMissionCard({ mission, onMissionUpdate }: ActiveMissionCardProps) {
    const { toast } = useToast();
    const [obcs, setObcs] = useState<OBC[]>([]);
    const [loadingOBC, setLoadingOBC] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [uploading, setUploading] = useState<'ticket' | 'hotel' | null>(null);

    const [formData, setFormData] = useState({
        routingInfo: mission.routingInfo || '',
        serviceOrder: mission.serviceOrder || '',
        amountOfBoxes: mission.amountOfBoxes || 0,
    });

    useEffect(() => {
        setFormData({
            routingInfo: mission.routingInfo || '',
            serviceOrder: mission.serviceOrder || '',
            amountOfBoxes: mission.amountOfBoxes || 0,
        });
    }, [mission]);
    
     useEffect(() => {
        if (!mission.obcIds || mission.obcIds.length === 0) {
            setLoadingOBC(false);
            setObcs([]);
            return;
        }

        setLoadingOBC(true);
        const unsubscribers = mission.obcIds.map(id => {
            return onOBCProfileUpdate(id, (profile) => {
                if (profile) {
                    setObcs(currentObcs => {
                        const existingOBC = currentObcs.find(o => o.id === id);
                        if (existingOBC) {
                            // Update existing OBC
                            return currentObcs.map(o => o.id === id ? profile : o);
                        } else {
                            // Add new OBC
                            return [...currentObcs, profile];
                        }
                    });
                }
            });
        });

        // The first load might be from multiple separate updates, so we can turn off loading shortly after
        const timer = setTimeout(() => setLoadingOBC(false), 1500);

        return () => {
            unsubscribers.forEach(unsub => unsub());
            clearTimeout(timer);
        };
    }, [mission.obcIds]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const missionUpdate: Partial<Mission> = {
                routingInfo: formData.routingInfo,
                serviceOrder: formData.serviceOrder,
                amountOfBoxes: Number(formData.amountOfBoxes)
            };
            await updateMission(mission.id, missionUpdate);
            toast({ title: "Mission Updated", description: "The mission details have been saved." });
            setIsEditing(false);
            onMissionUpdate?.();
        } catch (error) {
            console.error("Failed to save mission details:", error);
            toast({ variant: 'destructive', title: "Save Failed", description: "Could not update mission details." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchive = async () => {
        setIsArchiving(true);
        try {
            await updateMission(mission.id, { status: 'Canceled' });
            toast({ title: "Mission Archived", description: `Mission ${mission.title} has been canceled.` });
            onMissionUpdate?.();
        } catch (error) {
            console.error("Failed to archive mission:", error);
            toast({ variant: 'destructive', title: "Archive Failed", description: "Could not archive the mission." });
        } finally {
            setIsArchiving(false);
        }
    };
    
    const handleAttachmentUpload = async (
        event: React.ChangeEvent<HTMLInputElement>,
        attachmentType: 'planeTicketUrl' | 'hotelUrl'
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const currentUploading = attachmentType === 'planeTicketUrl' ? 'ticket' : 'hotel';
        setUploading(currentUploading);

        try {
            if (!storage) {
                throw new Error("Firebase Storage is not configured correctly.");
            }

            const uniqueFileName = `${Date.now()}_${file.name}`;
            const filePath = `mission-attachments/${mission.id}/${attachmentType}/${uniqueFileName}`;
            const storageRef = ref(storage, filePath);

            await uploadBytes(storageRef, file);

            const downloadURL = await getDownloadURL(storageRef);

            await updateMission(mission.id, {
                [`attachments.${attachmentType}`]: downloadURL
            });
            
            toast({ title: "Attachment Uploaded", description: "The file has been attached to the mission." });
            onMissionUpdate?.();

        } catch (error: any) {
            console.error(`Failed to upload ${attachmentType}:`, error);
            toast({ variant: 'destructive', title: "Upload Failed", description: error.message || "Could not upload the attachment." });
        } finally {
            setUploading(null);
            if (event.target) {
                event.target.value = '';
            }
        }
    };

    const getMapUrl = () => {
        const locations = obcs
            .map(o => o.location)
            .filter(loc => loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') as { lat: number; lng: number }[];
        
        if (locations.length === 0) return null;

        const center = locations[0];
        const pins = locations.map(loc => `${loc.lng},${loc.lat},pm2rdl`).join('~');
        
        return `https://static-maps.yandex.ru/v1?ll=${center.lng},${center.lat}&z=10&l=map&size=600,450&pt=${pins}`;
    };

    const mapUrl = getMapUrl();
    const lastCompletedStage = mission.timeline?.slice().reverse().find(stage => stage.completed);
    const LastStageIcon = lastCompletedStage ? stageIcons[lastCompletedStage.stage] : null;


    return (
        <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Mission: {mission.title}</h3>
                            <div className="text-sm text-muted-foreground">
                                OBCs: {loadingOBC ? <Skeleton className="h-4 w-24 inline-block" /> : (obcs.length > 0 ? obcs.map(o => o.obcNumber ? `#${o.obcNumber}` : o.name).join(', ') : 'Awaiting OBC assignment')}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <p className="text-sm text-muted-foreground">Service:</p>
                                <ServiceTypeIcons serviceType={mission.serviceType} />
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                         <div className="space-y-2">
                            <h4 className="font-semibold text-md flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />
                                Live Status
                            </h4>
                            <div className="p-3 bg-muted rounded-md text-sm">
                                {lastCompletedStage && lastCompletedStage.timestamp ? (
                                    <div className="flex items-start gap-3">
                                        {LastStageIcon && <LastStageIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />}
                                        <div className="flex-1">
                                            <p className="font-medium">{lastCompletedStage.label}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Updated at: {format(new Date(lastCompletedStage.timestamp), 'PPP p')}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Awaiting first update from OBC.</p>
                                )}
                            </div>
                        </div>
                        
                         <div>
                            <h4 className="font-semibold text-md mb-2">Mission Details:</h4>
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor={`routingInfo-${mission.id}`}>Routing:</Label>
                                    <Input 
                                        id={`routingInfo-${mission.id}`} 
                                        name="routingInfo"
                                        placeholder="Enter routing information"
                                        value={formData.routingInfo}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`serviceOrder-${mission.id}`}>Service Order (SO):</Label>
                                    <Input 
                                        id={`serviceOrder-${mission.id}`} 
                                        name="serviceOrder"
                                        placeholder="Enter SO Number"
                                        value={formData.serviceOrder}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`amountOfBoxes-${mission.id}`}>Amount of Boxes:</Label>
                                    <Input
                                        id={`amountOfBoxes-${mission.id}`}
                                        name="amountOfBoxes"
                                        type="number"
                                        placeholder="Enter number of boxes"
                                        value={formData.amountOfBoxes}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <MissionChatSheet mission={mission}>
                                <Button variant="outline"><MessageSquare className="mr-2" />Chat</Button>
                            </MissionChatSheet>
                            <Button variant="destructive" onClick={handleArchive} disabled={isArchiving}>
                                {isArchiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Archive
                            </Button>
                            {isEditing && (
                                <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
                                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            )}
                        </div>
                        
                        <div className="pt-4">
                            <h4 className="font-semibold text-md mb-2">Attachments:</h4>
                            <div className="flex flex-col sm:flex-row gap-2">
                                {/* Plane Ticket Button */}
                                {mission.attachments?.planeTicketUrl ? (
                                    <a href={mission.attachments.planeTicketUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="secondary">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Plane Ticket
                                        </Button>
                                    </a>
                                ) : (
                                    <Button asChild variant="outline" disabled={uploading === 'ticket'}>
                                        <label>
                                            {uploading === 'ticket' ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Paperclip className="mr-2 h-4 w-4" />
                                            )}
                                            Attach Plane Ticket
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleAttachmentUpload(e, 'planeTicketUrl')}
                                                disabled={uploading === 'ticket'}
                                            />
                                        </label>
                                    </Button>
                                )}

                                {/* Hotel Button */}
                                {mission.attachments?.hotelUrl ? (
                                    <a href={mission.attachments.hotelUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="secondary">
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            View Hotel Details
                                        </Button>
                                    </a>
                                ) : (
                                    <Button asChild variant="outline" disabled={uploading === 'hotel'}>
                                        <label>
                                            {uploading === 'hotel' ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Paperclip className="mr-2 h-4 w-4" />
                                            )}
                                            Attach Hotel
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => handleAttachmentUpload(e, 'hotelUrl')}
                                                disabled={uploading === 'hotel'}
                                            />
                                        </label>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                        {loadingOBC ? (
                            <p className="text-muted-foreground">Loading map data...</p>
                        ) : mapUrl ? (
                            <Image
                                src={mapUrl}
                                alt="Real-time mission map"
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                            />
                        ) : (
                            <p className="text-muted-foreground text-center p-4">OBC location not available.</p>
                        )}
                    </div>
                    <ScrollArea className="h-64 border rounded-md p-4">
                         <h4 className="font-semibold text-md mb-4">Mission Timeline</h4>
                         {mission.timeline && mission.timeline.length > 0 ? (
                            mission.timeline.map((stage, index) => (
                                <AdminViewTimelineItem key={stage.stage} stage={stage} isLast={index === mission.timeline!.length - 1} />
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No timeline history available.</p>
                        )}
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
