

"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

import { useUser } from "@/hooks/use-user"
import { getOBCProfile, getExpenseReportForMission } from "@/services/firestore"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StatusBadge } from "../status-badge"
import type { Mission, MissionTimelineStage, OBC, ExpenseReport } from "@/types"
import { cn } from "@/lib/utils"

import { format } from "date-fns"
import {
  CheckCircle, Circle, MapPin, ArrowRight, Download, Users, Calendar as CalendarIcon, Info, Loader2,
  Plane, Truck, Luggage, FileText, Clock, Camera, PackageCheck, DollarSign, Receipt
} from "lucide-react"
import { Badge } from "../ui/badge"

interface MissionDetailsDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mission: Mission | null
}

const getInitials = (name: string = '') => name ? name.split(' ').map(n => n[0]).join('') : '';

const InfoItem = ({ icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div className="text-sm">
            <p className="text-muted-foreground text-xs flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</p>
            <p className="font-medium">{children || "N/A"}</p>
        </div>
    )
}

const ObcViewTimelineItem = ({ stage, isLast }: { stage: MissionTimelineStage, isLast: boolean }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            {stage.completed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            {!isLast && <div className="w-px flex-grow bg-border mt-2" />}
        </div>
        <div>
            <p className="font-medium">{stage.label}</p>
            {stage.completed && stage.timestamp && (
                <p className="text-xs text-muted-foreground">{format(new Date(stage.timestamp), "PPP p")}</p>
            )}
        </div>
    </div>
)

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
                  <Image src={url} alt={`Photo ${i}`} width={64} height={64} className="rounded-md object-cover aspect-square" />
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


export function MissionDetailsDialog({ isOpen, onOpenChange, mission }: MissionDetailsDialogProps) {
  const { user } = useUser();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [obcDetails, setObcDetails] = useState<OBC[]>([]);
  const [loadingObcs, setLoadingObcs] = useState(false);
  const [expenseReport, setExpenseReport] = useState<ExpenseReport | null>(null);
  const [loadingExpenseReport, setLoadingExpenseReport] = useState(false);

  useEffect(() => {
    if (isOpen && mission && user) {
        if (user.role === 'admin' && mission.obcIds && mission.obcIds.length > 0) {
            setLoadingObcs(true);
            Promise.all(mission.obcIds!.map(id => getOBCProfile(id)))
                .then(profiles => setObcDetails(profiles.filter(Boolean) as OBC[]))
                .finally(() => setLoadingObcs(false));
        }
        if (user.role === 'obc') {
            setLoadingExpenseReport(true);
            getExpenseReportForMission(mission.id, user.id)
                .then(setExpenseReport)
                .finally(() => setLoadingExpenseReport(false));
        }
    } else {
        setObcDetails([]);
        setExpenseReport(null);
    }
  }, [isOpen, mission, user]);

  const handleSavePdf = async () => {
    if (!contentRef.current || !mission) return;
    setIsSavingPdf(true);
    try {
        const canvas = await html2canvas(contentRef.current, { 
            scale: 2,
            useCORS: true, 
            backgroundColor: null,
            onclone: (document) => {
                document.getElementById('pdf-content-area')?.style.setProperty('overflow', 'visible');
            }
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        let heightLeft = pdfHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();

        while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }

        pdf.save(`mission-report-${mission.id}.pdf`);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
    } finally {
        setIsSavingPdf(false);
    }
  };


  if (!mission) return null;

  const renderOBCView = () => {
    return (
        <ScrollArea className="max-h-[70vh] pr-4">
        <div className="space-y-4">
            <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Status</p>
            <StatusBadge status={mission.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{mission.origin}</span>
            {mission.destination && (
                <>
                <ArrowRight className="h-4 w-4 mx-2 text-primary" />
                <span>{mission.destination}</span>
                </>
            )}
            </div>
            {mission.description && (
            <p className="text-sm text-muted-foreground pt-2">{mission.description}</p>
            )}
            
            <Separator />
            <h4 className="font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Expense Report</h4>
            {loadingExpenseReport ? <Skeleton className="h-24 w-full" /> : (
                expenseReport ? (
                    <div className="p-3 rounded-md border bg-muted/50 space-y-4">
                        <div className="flex justify-between items-start">
                           <div>
                             <p className="text-xs text-muted-foreground">Status</p>
                             <Badge variant={expenseReport.status === 'Approved' || expenseReport.status === 'Paid' ? 'default' : 'outline'} className="capitalize">{expenseReport.status}</Badge>
                           </div>
                           {expenseReport.finalAmount && (
                               <div className="text-right">
                                 <p className="text-xs text-muted-foreground">Approved Amount</p>
                                 <p className="text-lg font-bold font-mono">{expenseReport.finalAmount.toFixed(2)} {expenseReport.finalCurrency}</p>
                               </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Submitted Items:</p>
                            {expenseReport.items.map((item, index) => (
                                <div key={index} className="flex justify-between items-center text-sm p-2 bg-background rounded-md">
                                    <div>
                                        <p className="font-medium">{item.category}</p>
                                        <p className="font-mono text-xs">{item.amount.toFixed(2)} {item.currency}</p>
                                    </div>
                                    <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="link" size="sm" className="p-0 h-auto">View Receipt</Button>
                                    </a>
                                </div>
                            ))}
                        </div>

                        {expenseReport.invoiceUrl && (
                            <a href={expenseReport.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="secondary" className="w-full">
                                    View Submitted Invoice
                                </Button>
                            </a>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No expense report submitted for this mission.</p>
                )
            )}
            
            <Separator />
            <h4 className="font-semibold">Mission History</h4>
            <div className="space-y-2">
            {mission.timeline && mission.timeline.length > 0 ? (
                mission.timeline.map((stage, index) => (
                <ObcViewTimelineItem key={stage.stage} stage={stage} isLast={index === mission.timeline.length - 1} />
                ))
            ) : (
                <p className="text-sm text-muted-foreground">No timeline history available.</p>
            )}
            </div>
        </div>
        </ScrollArea>
    );
  };

  const renderAdminView = () => (
    <>
      <ScrollArea className="max-h-[70vh]">
          <div ref={contentRef} id="pdf-content-area" className="space-y-6 p-1 pr-6 bg-background">
             {/* General Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem icon={Info} label="Mission ID">{mission.id}</InfoItem>
                <InfoItem icon={CalendarIcon} label="Date">{mission.missionDate ? format(new Date(mission.missionDate), 'PPP') : 'N/A'}</InfoItem>
                <InfoItem icon={Info} label="Status"><StatusBadge status={mission.status} /></InfoItem>
                {mission.status === 'Lost' && <InfoItem icon={Info} label="Lost Reason">{mission.lostReason}</InfoItem>}
            </div>
            {mission.description && <p className="text-sm text-muted-foreground">{mission.description}</p>}
            <Separator />

             {/* OBCs */}
            <div>
              <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><Users className="h-5 w-5" /> Assigned OBC(s)</h4>
              {loadingObcs ? <Skeleton className="h-16 w-full" /> : obcDetails.length > 0 ? (
                <div className="space-y-2">
                  {obcDetails.map(obc => (
                     <div key={obc.id} className="flex items-center gap-3 p-2 rounded-md border">
                        <Avatar>
                            <AvatarImage src={obc.avatar} />
                            <AvatarFallback>{getInitials(obc.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{obc.name}</p>
                            <p className="text-xs text-muted-foreground">{obc.obcNumber}</p>
                        </div>
                     </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No OBCs assigned.</p>}
            </div>
            <Separator />
             {/* Timeline */}
            <div>
                <h4 className="font-semibold text-lg mb-2">Mission Timeline</h4>
                {mission.timeline && mission.timeline.length > 0 ? (
                    mission.timeline.map((stage, index) => (
                        <AdminViewTimelineItem key={stage.stage} stage={stage} isLast={index === mission.timeline!.length - 1} />
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No timeline history available.</p>
                )}
            </div>
          </div>
      </ScrollArea>
       <DialogFooter>
            <Button onClick={handleSavePdf} disabled={isSavingPdf}>
              {isSavingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Save as PDF
            </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={user?.role === 'admin' ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>{mission.title}</DialogTitle>
          <DialogDescription>
            {user?.role === 'admin' ? `Full report for mission ${mission.id}` : `Details for mission ${mission.id}`}
          </DialogDescription>
        </DialogHeader>
        {user?.role === 'admin' ? renderAdminView() : renderOBCView()}
      </DialogContent>
    </Dialog>
  )
}
