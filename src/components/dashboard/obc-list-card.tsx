
"use client";

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllOBCs } from "@/services/firestore";
import type { OBC, User } from '@/types';
import { StatusBadge } from "../status-badge";
import { Skeleton } from '../ui/skeleton';
import { Hash } from 'lucide-react';
import { OBCProfileDialog } from '../obc-management/obc-profile-dialog';

export function ObcListCard() {
  const [obcs, setObcs] = useState<(OBC & User)[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOBC, setSelectedOBC] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    getAllOBCs()
        .then(setObcs)
        .finally(() => setLoading(false));
  }, []);

  const handleViewProfile = (obc: User) => {
    setSelectedOBC(obc);
    setIsDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>OBC Status</CardTitle>
          <CardDescription>
            Real-time status of available couriers. Click on a courier to view their full profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {loading ? (
              [...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between space-x-4 p-2">
                      <div className="flex items-center space-x-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-16" />
                          </div>
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
              ))
          ) : (
              obcs.map((obc) => (
                  <button 
                    key={obc.id} 
                    className="flex items-center justify-between space-x-4 w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                    onClick={() => handleViewProfile(obc)}
                  >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                            <AvatarImage src={obc.avatar} data-ai-hint="person portrait" />
                            <AvatarFallback>{getInitials(obc.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium leading-none">{obc.name}</p>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-muted-foreground">{obc.currentLocation}</p>
                                {obc.obcNumber && (
                                    <>
                                        <span className="text-xs text-muted-foreground">&middot;</span>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                                            <Hash className="h-3 w-3" />
                                            {obc.obcNumber}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                      </div>
                      <StatusBadge status={obc.availability || 'Unavailable'} />
                  </button>
              ))
          )}
        </CardContent>
      </Card>
      <OBCProfileDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        obc={selectedOBC}
      />
    </>
  );
}
