

"use client"

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { 
    getOBCProfile, 
    getActiveMissionForOBC, 
    updateUser, 
    getPendingMissions, 
    applyForMission, 
    getApplicationsForOBC, 
    deleteMissionApplication,
    onApplicationsUpdate
} from "@/services/firestore"
import { getAirportCode } from '@/ai/flows/get-airport-code-flow';
import type { OBC, Mission, MissionApplication } from '@/types';
import { useUser } from "@/hooks/use-user"
import { MissionTimeline } from "./mission-timeline"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { ArrowRight, MapPin, CheckCircle, Loader2, Plane, Truck, Luggage, XCircle, MessageSquare, Paperclip, Receipt } from 'lucide-react';
import { StatusBadge } from '../status-badge';
import { MissionChatSheet } from '../chat/mission-chat-sheet';
import { ExpenseReportDialog } from '../missions/expense-report-dialog';
import { cn } from '@/lib/utils';

const ServiceTypeIcons = ({ serviceType }: { serviceType: Array<'OBC' | 'First Mile' | 'Last Mile'> | undefined }) => {
    if (!serviceType || serviceType.length === 0) return <span>-</span>;
    
    const icons = {
        OBC: <Plane className="h-5 w-5" title="OBC" />,
        'First Mile': <Truck className="h-5 w-5" title="First Mile" />,
        'Last Mile': <Luggage className="h-5 w-5" title="Last Mile" />,
    };

    return (
        <div className="flex gap-3 items-center h-5">
            {serviceType.map(type => (
                <div key={type}>{icons[type]}</div>
            ))}
        </div>
    );
};

export function OBCDashboard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [obc, setObc] = useState<OBC | null>(null);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [appliedMissionIds, setAppliedMissionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [isTranslatingLocation, setIsTranslatingLocation] = useState(false);

  const [showGpsDialog, setShowGpsDialog] = useState(false);

  const refreshDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadingAvailable(true);
    
    const [activeMission, pendingMissionsData, userApplications] = await Promise.all([
      getActiveMissionForOBC(user.id),
      getPendingMissions(),
      getApplicationsForOBC(user.id)
    ]);

    setCurrentMission(activeMission);
    setAvailableMissions(pendingMissionsData.filter(m => m.id !== activeMission?.id));
    setAppliedMissionIds(new Set(userApplications.map(app => app.missionId)));

    setLoading(false);
    setLoadingAvailable(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setObc(user as OBC); // Set OBC profile from real-time user object

    let localApplications: MissionApplication[] = [];

    refreshDashboard();

    const unsubscribe = onApplicationsUpdate(user.id, (newApplications) => {
      const approvedApp = newApplications.find(newApp => 
        newApp.status === 'approved' &&
        localApplications.find(prevApp => prevApp.id === newApp.id)?.status === 'pending'
      );

      localApplications = newApplications;

      if (approvedApp) {
        toast({
          title: "Mission Approved!",
          description: `You have been assigned to mission: ${approvedApp.missionTitle}`
        });
        refreshDashboard();
      } else {
        setAppliedMissionIds(new Set(newApplications.map(app => app.missionId)));
      }
    });

    return () => unsubscribe();
  }, [user, toast, refreshDashboard]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const gpsAccepted = localStorage.getItem('gpsAccepted');
        if (!gpsAccepted) {
          setShowGpsDialog(true);
        }
    }
    
  }, []);

  const handleApply = async (mission: Mission) => {
      if (!user || !user.obcNumber) {
          toast({ variant: 'destructive', title: "Application Failed", description: "Your profile is incomplete." });
          return;
      }
      setApplyingId(mission.id);
      try {
          await applyForMission(mission, user);
          toast({ title: "Application Sent!", description: `You have applied for mission: ${mission.title}` });
          // Listener will update the UI
      } catch (error) {
          console.error("Failed to apply for mission:", error);
          toast({ variant: 'destructive', title: "Application Failed", description: "There was an error sending your application." });
      } finally {
          setApplyingId(null);
      }
  };

  const handleUnapply = async (mission: Mission) => {
      if (!user) return;
      setApplyingId(mission.id);
      try {
        await deleteMissionApplication(mission.id, user.id);
        toast({ title: "Application Withdrawn", description: `You have withdrawn your application for mission: ${mission.title}`});
        // Listener will update the UI
      } catch (error) {
        console.error("Failed to withdraw application:", error);
        toast({ variant: 'destructive', title: "Withdrawal Failed", description: "Could not withdraw your application." });
      } finally {
          setApplyingId(null);
      }
  }

  const handleGpsAccept = () => {
    localStorage.setItem('gpsAccepted', 'true');
    setShowGpsDialog(false);

    if (user) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const result = await getAirportCode({ lat: latitude, lon: longitude });
            if (!result) throw new Error("AI service unavailable.");
            await updateUser(user.id, { 
                location: { lat: latitude, lng: longitude },
                currentLocation: result.airportCode
            });
            toast({
                title: "Location Updated",
                description: `Your location has been set to the nearest airport: ${result.airportCode}.`
            });
          } catch(e) {
             console.error("Could not determine nearest airport", e);
             await updateUser(user.id, {
                location: { lat: latitude, lng: longitude },
                currentLocation: `Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`
             });
          }
        },
        () => {
          toast({
            variant: "destructive",
            title: "Location Access Denied",
            description: "Please enable location in your browser settings."
          })
        }
      )
    }
  };

  useEffect(() => {
    const translateLocationIfNeeded = async () => {
      if (obc && obc.currentLocation && obc.currentLocation.startsWith('Lat:')) {
        setIsTranslatingLocation(true);
        try {
          if (!obc.location) throw new Error("Location coordinates missing");
          const result = await getAirportCode({ lat: obc.location.lat, lon: obc.location.lng });
          if (!result) return;
          // No need to call updateUser here, as the onSnapshot from useUser will update the state
          await updateUser(obc.id, { currentLocation: result.airportCode });
        } catch (error) {
          console.error("Failed to translate coordinates to airport code", error);
        } finally {
          setIsTranslatingLocation(false);
        }
      }
    };
    translateLocationIfNeeded();
  }, [obc]);
  
  if (!user) return null;

  const getOBCMapUrl = () => {
    if (!user.location || typeof user.location.lat !== 'number' || typeof user.location.lng !== 'number') {
      return null;
    }
    const { lat, lng } = user.location;
    return `https://static-maps.yandex.ru/v1?ll=${lng},${lat}&z=13&l=map&size=600,450&pt=${lng},${lat},pm2rdl`;
  };
  const obcMapUrl = getOBCMapUrl();

  const displayLocation = isTranslatingLocation 
    ? <Loader2 className="h-5 w-5 animate-spin inline-block" /> 
    : obc?.currentLocation;

  return (
    <div className="flex flex-col gap-6">
       <AlertDialog open={showGpsDialog} onOpenChange={setShowGpsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>GPS Location Access</AlertDialogTitle>
            <AlertDialogDescription>
              AlphaClub requires access to your GPS location to provide real-time mission tracking for administrators. Your location will only be shared during active missions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleGpsAccept}>Accept & Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {user.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here is your mission overview for today.</p>
      </div>

        {loading ? (
             <Card>
                <CardHeader><CardTitle>Your Status</CardTitle></CardHeader>
                <CardContent><Skeleton className="h-6 w-3/4" /></CardContent>
            </Card>
        ) : (
             <Card>
                <CardHeader>
                <CardTitle>Your Status</CardTitle>
                </CardHeader>
                <CardContent>
                <p className="text-lg">You are currently <span className="font-bold text-primary">{obc?.availability}</span> and located in <span className="font-bold text-primary">{displayLocation}</span>.</p>
                </CardContent>
            </Card>
        )}
      
      {loading ? (
        <Skeleton className="h-96 w-full" />
      ) : currentMission ? (
        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <MissionTimeline mission={currentMission} onUpdate={refreshDashboard} />
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Mission Details</CardTitle>
                        <CardDescription>{currentMission.title}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {currentMission.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentMission.description}</p>
                        )}
                        <div className="space-y-1 text-sm">
                            <p><strong>From:</strong> {currentMission.origin}</p>
                            {currentMission.destination && <p><strong>To:</strong> {currentMission.destination}</p>}
                             {currentMission.amountOfBoxes > 0 && <p><strong>Amount of Boxes:</strong> {currentMission.amountOfBoxes}</p>}
                            {currentMission.routingInfo && <p><strong>Routing:</strong> {currentMission.routingInfo}</p>}
                            {currentMission.serviceOrder && <p><strong>Service Order:</strong> {currentMission.serviceOrder}</p>}
                            <div className="flex items-center gap-2 pt-1"><strong>Status:</strong> <StatusBadge status={currentMission.status} /></div>
                        </div>

                        {(currentMission.attachments?.planeTicketUrl || currentMission.attachments?.hotelUrl) && (
                            <div>
                                <h4 className="font-semibold text-sm mb-2 pt-2 border-t">Attachments</h4>
                                <div className="space-y-2">
                                    {currentMission.attachments.planeTicketUrl && (
                                        <a href={currentMission.attachments.planeTicketUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" className="w-full justify-start"><Paperclip className="mr-2" />View Plane Ticket</Button>
                                        </a>
                                    )}
                                    {currentMission.attachments.hotelUrl && (
                                        <a href={currentMission.attachments.hotelUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" className="w-full justify-start"><Paperclip className="mr-2" />View Hotel Details</Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-2">
                         <MissionChatSheet mission={currentMission}>
                            <Button className="w-full"><MessageSquare className="mr-2" />Mission Chat</Button>
                         </MissionChatSheet>
                         <ExpenseReportDialog mission={currentMission}>
                            <Button variant="outline" className="w-full"><Receipt className="mr-2" />Send Expense Report</Button>
                         </ExpenseReportDialog>
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Live Map</CardTitle>
                        <CardDescription>Your current location for this mission.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {obcMapUrl ? (
                                <Image
                                    src={obcMapUrl}
                                    alt="Your current location map"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                    className="object-cover"
                                />
                            ) : (
                                <p className="text-muted-foreground">Location not available.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        <>
            <Card className="text-center p-8">
                <CardTitle>No Active Mission</CardTitle>
                <CardDescription>You do not have an active mission assigned. Please await instructions.</CardDescription>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Available Missions</CardTitle>
                    <CardDescription>Missions you can apply for.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loadingAvailable ? (
                        <Skeleton className="h-48 w-full" />
                    ) : availableMissions.length > 0 ? (
                        availableMissions.map(mission => {
                            const isApplied = appliedMissionIds.has(mission.id);
                            const isProcessing = applyingId === mission.id;
                            const canApply = !currentMission;

                            return (
                                <Card key={mission.id} className={cn("bg-muted/50", isApplied && "border-primary")}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg">{mission.title}</CardTitle>
                                            {isApplied && <StatusBadge status="Pending" />}
                                        </div>
                                        <CardDescription>
                                            Published on: {mission.missionDate ? format(new Date(mission.missionDate), 'PPP') : 'N/A'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-y-4 text-sm">
                                        {mission.description && (
                                            <div>
                                                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Description</p>
                                                <p className="font-medium whitespace-pre-wrap">{mission.description}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Service Type</p>
                                            <ServiceTypeIcons serviceType={mission.serviceType} />
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1">Location</p>
                                            <div className="flex items-center gap-2 font-medium">
                                                <MapPin className="h-4 w-4" />
                                                <span>{mission.origin}</span>
                                                {mission.destination && (
                                                <>
                                                    <ArrowRight className="h-4 w-4 mx-2 text-primary" />
                                                    <span>{mission.destination}</span>
                                                </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        {isApplied ? (
                                            <Button 
                                                variant="secondary"
                                                onClick={() => handleUnapply(mission)} 
                                                disabled={isProcessing}
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                )}
                                                Withdraw Application
                                            </Button>
                                        ) : (
                                            <Button 
                                                onClick={() => handleApply(mission)} 
                                                disabled={isProcessing || !canApply}
                                                title={!canApply ? "You already have an active mission." : ""}
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                )}
                                                Apply Now
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No available missions at this time.</p>
                    )}
                </CardContent>
            </Card>
        </>
      )}
    </div>
  )
}
