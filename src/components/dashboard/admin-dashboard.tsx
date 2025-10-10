

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { onMissionsUpdate, updateMission } from "@/services/firestore";
import type { Mission, MissionStatus } from '@/types';
import { DollarSign, Users, CreditCard, Plane, PlusCircle, MoreHorizontal, Pencil, Trash2, Truck, Luggage } from "lucide-react";
import { Skeleton } from '../ui/skeleton';
import { GenerateInviteCodeDialog } from './generate-invite-code-dialog';
import { InviteCodesCard } from './invite-codes-card';
import { ActiveMissionCard } from './active-mission-card';
import { ObcResponsesCard } from './obc-responses-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { format } from 'date-fns';
import { StatusBadge } from '../status-badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { LostReasonDialog } from '../missions/lost-reason-dialog';
import { PublishMissionDialog } from '../missions/publish-mission-dialog';

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

export function AdminDashboard() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshInvitesKey, setRefreshInvitesKey] = useState(0);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [missionToUpdate, setMissionToUpdate] = useState<Mission | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onMissionsUpdate((updatedMissions) => {
        setMissions(updatedMissions);
        if (loading) setLoading(false);
    });
    
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onInviteGenerated = () => {
    setRefreshInvitesKey(prev => prev + 1);
  }

  const handleMissionPublished = () => {
    // The real-time listener handles the UI update automatically.
  };

  const handleStatusChange = async (mission: Mission, status: MissionStatus) => {
    if (status === 'Lost') {
      setMissionToUpdate(mission);
      setIsLostDialogOpen(true);
      return;
    }

    try {
      await updateMission(mission.id, { status });
      toast({ title: "Mission Status Updated", description: `Mission has been set to ${status}.` });
    } catch (error) {
      toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the mission status." });
      console.error(error);
    }
  };

  const handleConfirmLost = async (missionId: string, reason: string) => {
    try {
      await updateMission(missionId, { status: 'Lost', lostReason: reason });
      toast({ title: "Mission Status Updated", description: `Mission has been set to Lost.` });
    } catch (error) {
      toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the mission status." });
      console.error(error);
    }
  };

  const bookedMissionsCount = missions.filter(m => m.status === 'Booked').length;
  const pendingMissions = missions.filter(m => m.status === 'Pending').length;
  const completedMissions = missions.filter(m => m.status === 'Completed').length;
  
  const activeMissions = missions.filter(m => m.status === 'Booked');
  const missionStatuses: MissionStatus[] = ['Booked', 'Canceled', 'Postponed', 'Lost'];

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold font-headline">Admin Dashboard</h1>
          <div className="flex gap-2">
            <PublishMissionDialog onMissionPublished={handleMissionPublished}>
              <Button><PlusCircle /> Publish Mission</Button>
            </PublishMissionDialog>
            <GenerateInviteCodeDialog onInviteGenerated={onInviteGenerated} />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Booked Missions
              </CardTitle>
              <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-6 w-1/2" /> : <div className="text-2xl font-bold">{bookedMissionsCount}</div>}
              <p className="text-xs text-muted-foreground">
                Currently in progress
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Missions
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               {loading ? <Skeleton className="h-6 w-1/2" /> : <div className="text-2xl font-bold">{pendingMissions}</div>}
              <p className="text-xs text-muted-foreground">
                Awaiting OBC assignment
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Missions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-6 w-1/2" /> : <div className="text-2xl font-bold">{completedMissions}</div>}
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Active Missions</CardTitle>
                    <CardDescription>Missions currently in progress.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {loading ? (
                        <Skeleton className="h-64 w-full" />
                    ) : activeMissions.length > 0 ? (
                        activeMissions.map(mission => (
                            <ActiveMissionCard key={mission.id} mission={mission} />
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center py-8">No active missions.</p>
                    )}
                </CardContent>
            </Card>
        </div>

        <ObcResponsesCard />
        
        <Card>
          <CardHeader>
              <CardTitle>All Missions</CardTitle>
              <CardDescription>Browse and manage all company missions.</CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Mission Reference</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Service Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                          <TableHead>Edit</TableHead>
                          <TableHead>Archive</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {loading ? (
                          [...Array(5)].map((_, i) => (
                              <TableRow key={i}>
                                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                  <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                              </TableRow>
                          ))
                      ) : missions.length > 0 ? (
                          missions.map(mission => (
                              <TableRow key={mission.id}>
                                  <TableCell className="font-medium">{mission.title}</TableCell>
                                  <TableCell>{mission.missionDate ? format(new Date(mission.missionDate), 'PPP') : 'N/A'}</TableCell>
                                  <TableCell><ServiceTypeIcons serviceType={mission.serviceType} /></TableCell>
                                  <TableCell><StatusBadge status={mission.status} /></TableCell>
                                  <TableCell>
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                              <Button variant="outline" size="sm">Actions <MoreHorizontal className="ml-2 h-4 w-4" /></Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                              {missionStatuses.map(status => (
                                                  <DropdownMenuItem key={status} onSelect={() => handleStatusChange(mission, status)}>
                                                      {status}
                                                  </DropdownMenuItem>
                                              ))}
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                  </TableCell>
                                  <TableCell>
                                      <Link href={`/missions/edit/${mission.id}`}>
                                          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                                      </Link>
                                  </TableCell>
                                  <TableCell>
                                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                                  </TableCell>
                              </TableRow>
                          ))
                      ) : (
                          <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center">
                                  No missions found.
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
        </Card>
        
        <InviteCodesCard key={refreshInvitesKey} />
      </div>
      <LostReasonDialog
        isOpen={isLostDialogOpen}
        onOpenChange={setIsLostDialogOpen}
        mission={missionToUpdate}
        onConfirm={handleConfirmLost}
      />
    </>
  );
}
