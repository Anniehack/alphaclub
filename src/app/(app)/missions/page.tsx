

"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getAllMissions, getMissionsForOBC, updateMission, getAllOBCs, getOBCProfile } from '@/services/firestore';
import type { Mission, MissionStatus, OBC } from '@/types';
import { useUser } from '@/hooks/use-user';
import { MissionCard } from '@/components/dashboard/mission-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, Plane, Truck, Luggage, Pencil, Trash2, MoreHorizontal, Calendar as CalendarIcon, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { type DateRange } from "react-day-picker"
import { StatusBadge } from '@/components/status-badge';
import { useToast } from '@/hooks/use-toast';
import { LostReasonDialog } from '@/components/missions/lost-reason-dialog';
import { MissionDetailsDialog } from '@/components/missions/mission-details-dialog';
import { PublishMissionDialog } from '@/components/missions/publish-mission-dialog';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Funnel, FunnelChart, LabelList, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, XAxis, YAxis, Bar } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';


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


function AdminMissionsView() {
    const [allMissions, setAllMissions] = useState<Mission[]>([]);
    const [filteredMissions, setFilteredMissions] = useState<Mission[]>([]);
    const [obcs, setObcs] = useState<OBC[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
    const [missionToUpdate, setMissionToUpdate] = useState<Mission | null>(null);
    const { toast } = useToast();
    
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Filters state
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [selectedObcId, setSelectedObcId] = useState<string>('all');
    const [selectedLostReason, setSelectedLostReason] = useState<string>('all');

    const missionStatuses: MissionStatus[] = ['Booked', 'Canceled', 'Completed', 'Lost', 'Pending', 'Postponed'];
    const lostReasons = ["Pricing", "Timing", "Routing", "No Feedback"];


    const fetchMissionsAndOBCs = useCallback(() => {
        setLoading(true);
        Promise.all([
            getAllMissions(),
            getAllOBCs()
        ]).then(([missionData, obcData]) => {
            setAllMissions(missionData);
            setFilteredMissions(missionData);
            setObcs(obcData);
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchMissionsAndOBCs();
    }, [fetchMissionsAndOBCs]);

    const obcMap = useMemo(() => new Map(obcs.map(obc => [obc.id, obc.name])), [obcs]);

    const handleApplyFilters = useCallback(() => {
        let missions = [...allMissions];

        if (selectedStatuses.length > 0) {
            missions = missions.filter(m => selectedStatuses.includes(m.status));
        }

        if (selectedStatuses.includes('Lost') && selectedLostReason && selectedLostReason !== 'all') {
            missions = missions.filter(m => m.lostReason === selectedLostReason);
        }

        if (selectedObcId !== 'all') {
            missions = missions.filter(m => m.obcIds?.includes(selectedObcId));
        }

        if (dateRange?.from) {
            missions = missions.filter(m => {
                if (!m.missionDate) return false;
                const missionDate = new Date(m.missionDate);
                missionDate.setHours(0, 0, 0, 0);
                return missionDate >= dateRange.from!;
            });
        }
        if (dateRange?.to) {
            missions = missions.filter(m => {
                if (!m.missionDate) return false;
                const missionDate = new Date(m.missionDate);
                missionDate.setHours(0, 0, 0, 0);
                return missionDate <= dateRange.to!;
            });
        }
        
        setFilteredMissions(missions);
    }, [allMissions, dateRange, selectedObcId, selectedStatuses, selectedLostReason]);
    
    const handleResetFilters = () => {
        setDateRange(undefined);
        setSelectedStatuses([]);
        setSelectedObcId('all');
        setSelectedLostReason('all');
        setFilteredMissions(allMissions);
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
            fetchMissionsAndOBCs();
        } catch (error) {
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the mission status." });
            console.error(error);
        }
    };
    
    const handleConfirmLost = async (missionId: string, reason: string) => {
        try {
            await updateMission(missionId, { status: 'Lost', lostReason: reason });
            toast({ title: "Mission Status Updated", description: `Mission has been set to Lost.` });
            fetchMissionsAndOBCs();
        } catch (error) {
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update the mission status." });
            console.error(error);
        }
    };

    const handleViewDetails = (mission: Mission) => {
        setSelectedMission(mission);
        setIsDetailsOpen(true);
    };

    const handleExportExcel = () => {
        const worksheetData = filteredMissions.map(m => ({
            'Mission Title': m.title,
            'Mission Date': m.missionDate ? format(new Date(m.missionDate), 'PPP') : 'N/A',
            'Status': m.status,
            'Assigned OBCs': m.obcIds?.map(id => obcMap.get(id)).filter(Boolean).join(', ') || 'N/A',
            'Lost Reason': m.lostReason || '',
            'Service Type': m.serviceType?.join(', ') || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Missions Report');
        XLSX.writeFile(workbook, 'missions_report.xlsx');
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        (doc as any).autoTable({
            head: [['Title', 'Date', 'Status', 'Assigned OBCs', 'Lost Reason']],
            body: filteredMissions.map(m => [
                m.title,
                m.missionDate ? format(new Date(m.missionDate), 'PPP') : 'N/A',
                m.status,
                m.obcIds?.map(id => obcMap.get(id)).filter(Boolean).join(', ') || 'N/A',
                m.lostReason || '',
            ]),
        });
        doc.save('missions_report.pdf');
    };

    const chartData = useMemo(() => {
        const statusCounts = filteredMissions.reduce((acc, mission) => {
            acc[mission.status] = (acc[mission.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(statusCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    }, [filteredMissions]);

    const chartConfig = {
        value: { label: 'Missions' },
        ...missionStatuses.reduce((acc, status) => {
            acc[status] = { label: status };
            return acc;
        }, {} as Record<string, { label: string }>)
    } satisfies ChartConfig;

    return (
        <>
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Missions List</h1>
                        <p className="text-muted-foreground">Browse and manage all company missions.</p>
                    </div>
                    <PublishMissionDialog onMissionPublished={fetchMissionsAndOBCs}>
                        <Button><PlusCircle /> Publish Mission</Button>
                    </PublishMissionDialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Queries & Reports</CardTitle>
                        <CardDescription>Filter missions to generate reports.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        <div className="space-y-2">
                             <Label htmlFor="date">Date range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start font-normal">
                                        {selectedStatuses.length > 0 ? `${selectedStatuses.length} selected` : "Select status"}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                    <DropdownMenuLabel>Mission Status</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {missionStatuses.map(status => (
                                         <DropdownMenuCheckboxItem
                                            key={status}
                                            checked={selectedStatuses.includes(status)}
                                            onSelect={(e) => e.preventDefault()}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? setSelectedStatuses([...selectedStatuses, status])
                                                : setSelectedStatuses(selectedStatuses.filter(s => s !== status))
                                            }}
                                         >
                                            {status}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {selectedStatuses.includes('Lost') && (
                             <div className="space-y-2">
                                <Label>Lost Reason</Label>
                                <Select value={selectedLostReason} onValueChange={setSelectedLostReason}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Reasons</SelectItem>
                                        {lostReasons.map(reason => (
                                            <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>OBC</Label>
                            <Select value={selectedObcId} onValueChange={setSelectedObcId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select OBC" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All OBCs</SelectItem>
                                    {obcs.map(obc => (
                                        <SelectItem key={obc.id} value={obc.id}>{obc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter className="gap-2 flex-wrap">
                        <Button onClick={handleApplyFilters}>Apply Filters</Button>
                        <Button variant="ghost" onClick={handleResetFilters}>Reset</Button>
                        <div className="flex-grow" />
                        <Button variant="outline" onClick={handleExportPdf} disabled={filteredMissions.length === 0}><FileDown/>Save PDF</Button>
                        <Button variant="outline" onClick={handleExportExcel} disabled={filteredMissions.length === 0}><FileDown/>Save Excel</Button>
                    </CardFooter>
                </Card>

                {filteredMissions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Report Funnel</CardTitle>
                            <CardDescription>Visual summary of the filtered missions.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-col md:flex-row flex gap-4 items-center">
                            <div className="w-full md:w-1/2">
                                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <FunnelChart layout="vertical">
                                            <RechartsTooltip cursor={{fill: "hsl(var(--muted))"}} content={<ChartTooltipContent hideLabel />} />
                                            <Funnel dataKey="value" data={chartData} isAnimationActive>
                                                <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                                            </Funnel>
                                        </FunnelChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                             <div className="w-full md:w-1/2">
                                <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--foreground))" }} />
                                            <RechartsTooltip cursor={{fill: "hsl(var(--muted))"}} content={<ChartTooltipContent hideLabel />} />
                                            <Bar dataKey="value" layout="vertical" radius={5}>
                                                {chartData.map((entry, index) => (
                                                    <rect key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
                

                <Card className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mission Reference</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Service Type</TableHead>
                                <TableHead>Assigned OBC(s)</TableHead>
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
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredMissions.length > 0 ? (
                                filteredMissions.map(mission => (
                                    <TableRow key={mission.id}>
                                        <TableCell className="font-medium">
                                            <Button variant="link" onClick={() => handleViewDetails(mission)} className="p-0 h-auto font-medium">
                                                {mission.title}
                                            </Button>
                                        </TableCell>
                                        <TableCell>{mission.missionDate ? format(new Date(mission.missionDate), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell><ServiceTypeIcons serviceType={mission.serviceType} /></TableCell>
                                        <TableCell className="text-xs">
                                            {mission.obcIds?.map(id => obcMap.get(id)).filter(Boolean).join(', ') || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <StatusBadge status={mission.status} />
                                                    </TooltipTrigger>
                                                    {mission.status === 'Lost' && mission.lostReason && (
                                                        <TooltipContent>
                                                            <p>Reason: {mission.lostReason}</p>
                                                        </TooltipContent>
                                                    )}
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
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
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No missions found for the selected filters.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
            <LostReasonDialog
                isOpen={isLostDialogOpen}
                onOpenChange={setIsLostDialogOpen}
                mission={missionToUpdate}
                onConfirm={handleConfirmLost}
            />
            <MissionDetailsDialog
                isOpen={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                mission={selectedMission}
            />
        </>
    );
}

function OBCMissionsView() {
    const { user } = useUser();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (user) {
            setLoading(true);
            getMissionsForOBC(user.id)
                .then(setMissions)
                .finally(() => setLoading(false));
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleViewDetails = (mission: Mission) => {
        setSelectedMission(mission);
        setIsDetailsOpen(true);
    };
    
    return (
        <>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold font-headline">My Missions</h1>
                    <p className="text-muted-foreground">View your active and past mission history.</p>
                </div>
                
                 {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
                    </div>
                ) : missions.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {missions.map(mission => (
                            <MissionCard key={mission.id} mission={mission} onViewDetails={() => handleViewDetails(mission)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground">
                        <p>You have not been assigned any missions.</p>
                    </div>
                )}
            </div>
             <MissionDetailsDialog
                isOpen={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                mission={selectedMission}
            />
        </>
    );
}

export default function MissionsPage() {
    const { user, loading } = useUser();

    if (loading || !user) {
        return (
            <div className="flex flex-col gap-6">
                <Skeleton className="h-10 w-1/3" />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
                </div>
            </div>
        )
    }

    return user.role === 'admin' ? <AdminMissionsView /> : <OBCMissionsView />;
}
