
"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Mission, MissionTimelineStage } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { 
    Loader2, Camera, Paperclip, CheckCircle2, Clock, Truck, Package, Plane, Building, Archive, FileScan, 
    ShieldCheck, Luggage, Ticket, PlaneTakeoff, PlaneLanding, Fingerprint, PackageSearch, PackageCheck, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { updateUser, updateMission, getMission } from '@/services/firestore';
import { getAirportCode } from '@/ai/flows/get-airport-code-flow.ts';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

const timelineLayout: { stage: string, label: string }[][] = [
    [{ stage: 'On my way to ATO', label: 'On my way to ATO' }, { stage: 'On my way to PU', label: 'On my way to PU' }],
    [{ stage: 'Arrival in ATO', label: 'Arrival in ATO' }, { stage: 'Arrival in PU', label: 'Arrival in PU' }],
    [{ stage: 'Received goods', label: 'Received goods' }],
    [{ stage: 'On my way to ATO after PU', label: 'On my way to ATO after PU' }],
    [{ stage: 'Arrival in ATO after PU', label: 'Arrival in ATO after PU' }],
    [{ stage: 'Started Customs Clearance', label: 'Started Customs Clearance' }],
    [{ stage: 'Finished Customs Clearance', label: 'Finished Customs Clearance' }],
    [{ stage: 'On my way to check in goods', label: 'On my way to check in goods' }],
    [{ stage: 'Finished check-in', label: 'Finished check-in' }],
    [{ stage: 'OBC and goods on board', label: 'OBC and goods on board' }],
    [{ stage: 'Landing in connecting Hub', label: 'Landing in connecting Hub' }],
    [{ stage: 'On my way to migration', label: 'On my way to migration' }, { stage: 'On my way to Customs', label: 'On my way to Customs' }],
    [{ stage: 'Finished Customs', label: 'Finished Customs' }],
    [{ stage: 'goods are collected connection Hub', label: 'Goods are collected connection Hub' }],
    [{ stage: 'On my way to connecting flight', label: 'On my way to connecting flight' }],
    [{ stage: 'OBC and goods on board connecting flight', label: 'OBC and goods on board connecting flight' }],
    [{ stage: 'Landing Final destination', label: 'Landing Final destination' }],
    [{ stage: 'Goods are collected final destination', label: 'Goods are collected final destination' }],
    [{ stage: 'On my way to deliver', label: 'On my way to deliver' }],
    [{ stage: 'Delivered', label: 'Delivered' }],
];

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

const defaultStages: MissionTimelineStage[] = timelineLayout.flat().map(item => ({
    ...item,
    completed: false, 
    timestamp: null, 
    location: null,
    photoUrls: [],
    attachmentUrls: [],
    amountOfBoxes: 0,
    eta: '',
    podUrl: '',
}));

interface MissionTimelineProps {
  mission: Mission;
  onUpdate: () => void;
}

export function MissionTimeline({ mission: initialMission, onUpdate }: MissionTimelineProps) {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [mission, setMission] = useState(initialMission);
  const [updatingStage, setUpdatingStage] = useState<string | null>(null);
  const [uploadingInfo, setUploadingInfo] = useState<{ stage: string; type: 'photo' | 'attachment' | 'pod' } | null>(null);
  
  useEffect(() => {
    setMission(initialMission);
  }, [initialMission]);

  const timeline = useMemo(() => {
    const baseTimeline = initialMission.timeline || [];
    const progressMap = new Map(baseTimeline.map(stage => [stage.stage, stage]));
    return defaultStages.map(defaultStage => {
        const progress = progressMap.get(defaultStage.stage);
        return progress ? { ...defaultStage, ...progress, label: defaultStage.label } : defaultStage;
    });
  }, [initialMission.timeline]);

  const updateTimelineStateAndFirestore = useCallback(async (newTimeline: MissionTimelineStage[], newStatus?: Mission['status']) => {
    const missionUpdate: Partial<Mission> = { timeline: newTimeline };
    if (newStatus) {
      missionUpdate.status = newStatus;
    }

    try {
      if (!user) throw new Error("User not found");
      await updateMission(mission.id, missionUpdate);
      toast({ title: "Timeline Updated!", description: "Your progress has been saved." });
      // Fetch the latest mission data to ensure UI is in sync
      const updatedMission = await getMission(mission.id);
      if (updatedMission) {
        setMission(updatedMission);
      }
      onUpdate();
    } catch (error) {
       console.error("Timeline update failed:", error);
       toast({ variant: 'destructive', title: "Update Failed", description: "Could not save timeline changes." });
    } finally {
        setUpdatingStage(null); 
    }
  }, [mission.id, user, toast, onUpdate]);
  
  const handleToggleStatus = async (stageToToggle: MissionTimelineStage) => {
    if (updatingStage) return;
    setUpdatingStage(stageToToggle.stage);
    
    const isCompleting = !stageToToggle.completed;
    const isAiAvailable = typeof getAirportCode === 'function';

    const performUpdate = async (latitude: number | null, longitude: number | null) => {
        let airportCode = latitude && longitude ? `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}` : 'Location N/A';
        const location = latitude && longitude ? { lat: latitude, lng: longitude } : null;

        if (isAiAvailable && latitude && longitude) {
            try {
                const result = await getAirportCode({ lat: latitude, lon: longitude });
                if (result) airportCode = result.airportCode;
            } catch (e) {
                console.error("Could not get airport code, falling back to coordinates.", e);
            }
        }

        const updatedStage = { ...stageToToggle, completed: true, timestamp: new Date().toISOString(), location };
        const newTimeline = timeline.map(stage => stage.stage === stageToToggle.stage ? updatedStage : stage);
        
        let newStatus: Mission['status'] | undefined = 'Booked';

        if (stageToToggle.stage === 'Delivered') {
            newStatus = 'Completed';
        }
        
        try {
            if (user && location) {
                await updateUser(user.id, { location, currentLocation: airportCode });
            }
            await updateTimelineStateAndFirestore(newTimeline, newStatus);
        } catch(e) {
             console.error("Timeline update failed:", e);
             toast({ variant: 'destructive', title: "Update Failed", description: "Could not save timeline changes." });
             setUpdatingStage(null);
        }
    };

    if (isCompleting) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                performUpdate(latitude, longitude);
            },
            (error) => {
                console.warn("Could not get location, updating stage without it.", error.message);
                toast({ variant: 'destructive', title: "Location Error", description: "Could not get your location. Updating stage without it." });
                performUpdate(null, null); // Update stage without location data
            }
        );
    } else {
        const defaultStateForStage = defaultStages.find(s => s.stage === stageToToggle.stage);
        const newTimeline = timeline.map(stage => stage.stage === stageToToggle.stage ? { ...defaultStateForStage!, label: stageToToggle.label } : stage);
        await updateTimelineStateAndFirestore(newTimeline, 'Booked');
    }
  };
  
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    stageName: string,
    type: 'photo' | 'attachment' | 'pod'
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user) return;
    
    setUploadingInfo({ stage: stageName, type });
    let downloadURLs: string[] = [];

    try {
        for (const file of Array.from(files)) {
            const filePath = `mission-attachments/${mission.id}/${stageName}/${Date.now()}-${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            downloadURLs.push(downloadURL);
        }

        const newTimeline = timeline.map(stage => {
            if (stage.stage === stageName) {
                const updatedStage = { ...stage };
                if (type === 'pod') {
                    updatedStage.podUrl = downloadURLs[0];
                } else if (type === 'photo') {
                    updatedStage.photoUrls = [...(updatedStage.photoUrls || []), ...downloadURLs];
                } else {
                    updatedStage.attachmentUrls = [...(updatedStage.attachmentUrls || []), ...downloadURLs];
                }
                return updatedStage;
            }
            return stage;
        });
        await updateTimelineStateAndFirestore(newTimeline);
        toast({ title: 'Upload successful!', description: `Your ${type}(s) have been attached.` });
    } catch (error) {
      console.error("File upload failed:", error);
      toast({ variant: 'destructive', title: "Upload Failed", description: "Could not upload the file(s)." });
    } finally {
      setUploadingInfo(null);
      if (event.target) event.target.value = '';
    }
  };

  const handleValueChange = (stageName: string, field: string, value: any) => {
      const newTimeline = timeline.map(stage => 
          stage.stage === stageName ? { ...stage, [field]: value } : stage
      );
      // Optimistically update local state for better UX
      setMission(prev => ({ ...prev, timeline: newTimeline }));
      // Immediately save to Firestore
      updateTimelineStateAndFirestore(newTimeline);
  };

  const getAcceptMimeTypes = (type: 'photo' | 'attachment' | 'pod') => {
    if (type === 'photo') return 'image/*';
    if (type === 'pod') return 'image/*,application/pdf';
    return 'image/*,application/pdf';
  };

  const FileUploadButton = ({ stageName, type, children, multiple = false }: { stageName: string, type: 'photo' | 'attachment' | 'pod', children: React.ReactNode, multiple?: boolean }) => {
    const isUploading = uploadingInfo?.stage === stageName && uploadingInfo?.type === type;
    
    return (
        <Button asChild variant="outline" size="sm" className="w-full">
            <label className="cursor-pointer">
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
                <input 
                    type="file" 
                    className="hidden" 
                    accept={getAcceptMimeTypes(type)}
                    multiple={multiple}
                    capture={type === 'photo' || (type === 'pod' && getAcceptMimeTypes(type).includes('image')) ? 'environment' : undefined}
                    onChange={(e) => handleFileUpload(e, stageName, type)} 
                    disabled={isUploading} 
                />
            </label>
        </Button>
    )
  }

  const renderActions = (stage: MissionTimelineStage) => {
      const stageName = stage.stage;
      
      switch(stageName) {
          case 'Received goods':
              return (
                <div className="mt-2 space-y-2">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label htmlFor={`${stageName}-boxes`}>Amount of boxes</Label>
                            <Input 
                                id={`${stageName}-boxes`}
                                type="number" 
                                value={stage.amountOfBoxes ?? ''}
                                onChange={e => handleValueChange(stageName, 'amountOfBoxes', parseInt(e.target.value) || 0)}
                                placeholder="Enter amount"
                            />
                        </div>
                    </div>
                    <FileUploadButton stageName={stageName} type="photo" multiple>
                        <Camera className="mr-2 h-4 w-4" /> Add Photo(s)
                    </FileUploadButton>
                </div>
              );
          case 'Finished check-in':
              return (
                <div className="mt-2 space-y-2">
                    <FileUploadButton stageName={stageName} type="photo" multiple>
                        <Camera className="mr-2 h-4 w-4" /> Add Photo(s)
                    </FileUploadButton>
                    <FileUploadButton stageName={stageName} type="attachment" multiple>
                        <Paperclip className="mr-2 h-4 w-4" /> Add Attachment(s)
                    </FileUploadButton>
                </div>
              );
          case 'OBC and goods on board':
          case 'OBC and goods on board connecting flight':
              return (
                <div className="mt-2 space-y-2">
                    <FileUploadButton stageName={stageName} type="photo" multiple>
                        <Camera className="mr-2 h-4 w-4" /> Add Photo(s)
                    </FileUploadButton>
                    <FileUploadButton stageName={stageName} type="attachment" multiple>
                        <Paperclip className="mr-2 h-4 w-4" /> Add Attachment(s)
                    </FileUploadButton>
                </div>
              );
          case 'Finished Customs':
              return (
                <div className="mt-2 space-y-2">
                    <FileUploadButton stageName={stageName} type="photo" multiple>
                        <Camera className="mr-2 h-4 w-4" /> Add Photo(s)
                    </FileUploadButton>
                </div>
              );
          case 'On my way to deliver':
              return (
                 <div className="mt-2 space-y-2">
                    <Label htmlFor={`${stageName}-eta`}>Set ETA</Label>
                    <Input 
                        id={`${stageName}-eta`}
                        type="datetime-local" 
                        value={stage.eta ?? ''}
                        onChange={e => handleValueChange(stageName, 'eta', e.target.value)}
                    />
                </div>
              );
          case 'Delivered':
            return (
                <div className="mt-2 space-y-2">
                    <FileUploadButton stageName={stageName} type="photo" multiple>
                        <Camera className="mr-2 h-4 w-4" /> Add Photo(s)
                    </FileUploadButton>
                    <FileUploadButton stageName={stageName} type="pod">
                        <Paperclip className="mr-2 h-4 w-4" /> Attach POD
                    </FileUploadButton>
                </div>
            )
          default:
              return null;
      }
  };
  
  const renderAttachments = (stage: MissionTimelineStage) => (
    <div className="mt-2 space-y-1">
        {stage.photoUrls?.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm gap-2 text-blue-600 hover:underline">
                <Image src={url} alt={`Photo ${i+1}`} width={20} height={20} className="rounded object-cover" /> Photo {i + 1}
            </a>
        ))}
        {stage.attachmentUrls?.map((url, i) => (
             <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm gap-2 text-blue-600 hover:underline">
                <Paperclip className="h-4 w-4" /> Attachment {i + 1}
            </a>
        ))}
        {stage.eta && (
            <div className="flex items-center text-sm gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> ETA: {new Date(stage.eta).toLocaleString()}
            </div>
        )}
        {stage.podUrl && (
             <a href={stage.podUrl} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm gap-2 text-blue-600 hover:underline">
                <Paperclip className="h-4 w-4" /> View POD
            </a>
        )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Mission Timeline</CardTitle>
        <CardDescription>Update your progress for mission {mission.id}.</CardDescription>
      </CardHeader>
      <CardContent>
        {mission.status === 'Completed' ? (
          <Alert variant="default" className="border-green-500/50 text-green-700 dark:text-green-400 [&>svg]:text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Mission Complete!</AlertTitle>
            <AlertDescription>
              You have successfully completed all stages of this mission. Well done!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-1 -ml-3">
            {timelineLayout.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-col md:flex-row md:gap-4 w-full">
                    {row.map(stageLayout => {
                        const stage = timeline.find(s => s.stage === stageLayout.stage);
                        if (!stage) return <div key={stageLayout.stage} className="flex-1" />;

                        const isStageEnabled = true;
                        const isUpdatingThis = updatingStage === stage.stage;
                        const Icon = stageIcons[stage.stage];
                        const showActionsAndAttachments = ['Received goods', 'Finished check-in', 'OBC and goods on board', 'OBC and goods on board connecting flight', 'Finished Customs', 'On my way to deliver', 'Delivered'].includes(stage.stage);

                        return (
                            <div key={stage.stage} className="flex-1 flex gap-2 p-3">
                                <div className="flex flex-col items-center pt-1">
                                    <button onClick={() => handleToggleStatus(stage)} disabled={isUpdatingThis || !isStageEnabled}>
                                        {isUpdatingThis ? (
                                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        ) : stage.completed ? (
                                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                                        ) : (
                                          <Circle className={cn("h-6 w-6 text-muted-foreground/50", isStageEnabled && "text-primary/50 hover:text-primary transition-colors")} />
                                        )}
                                    </button>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                                        <p className={cn("font-semibold", !isStageEnabled && "text-muted-foreground", stage.completed && "text-green-600")}>{stage.label}</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground ml-7">
                                        {stage.timestamp ? new Date(stage.timestamp).toLocaleString() : 'Pending'}
                                    </p>
                                    <div className="ml-7">
                                        {showActionsAndAttachments && (
                                            <>
                                                {renderActions(stage)}
                                                {renderAttachments(stage)}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
