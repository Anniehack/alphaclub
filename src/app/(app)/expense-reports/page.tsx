

"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getExpenseReports, updateExpenseReportStatus } from '@/services/firestore';
import type { ExpenseReport, Currency } from '@/types';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Eye, Paperclip, Loader2, FileCheck, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


function ViewExpenseReportDialog({ 
    report, 
    isOpen, 
    onOpenChange,
    onStatusUpdate,
    isUpdating
}: { 
    report: ExpenseReport | null, 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void,
    onStatusUpdate: (reportId: string, status: 'Approved' | 'Rejected' | 'Paid', finalAmount?: number, finalCurrency?: Currency) => void,
    isUpdating: boolean
}) {
    const [finalAmount, setFinalAmount] = useState<string>('');
    const [finalCurrency, setFinalCurrency] = useState<Currency>('USD');
    const { toast } = useToast();

    const totals = report?.items.reduce((acc, item) => {
        acc[item.currency] = (acc[item.currency] || 0) + item.amount;
        return acc;
    }, {} as Record<string, number>) || {};

    useEffect(() => {
        if (report) {
            // Pre-fill with existing final amount if present, otherwise calculate from totals.
            if (report.finalAmount) {
                setFinalAmount(report.finalAmount.toString());
                setFinalCurrency(report.finalCurrency || 'USD');
            } else {
                // Assuming USD is the primary currency or only one currency is present.
                // A more complex logic would be needed for multi-currency reports.
                const prefillAmount = totals['USD'] || totals[Object.keys(totals)[0]] || '';
                setFinalAmount(prefillAmount.toString());
                setFinalCurrency('USD');
            }
        }
    }, [report, totals]);

    const handleApprove = () => {
        if (!report) return;
        const amount = parseFloat(finalAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: 'destructive', title: "Invalid Amount", description: "Please enter a valid, positive final amount." });
            return;
        }
        onStatusUpdate(report.id, 'Approved', amount, finalCurrency);
    };

    const handleReject = () => {
        if (!report) return;
        onStatusUpdate(report.id, 'Rejected');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                {!report ? (
                     <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Expense Report Details</DialogTitle>
                            <DialogDescription>
                                Mission: {report.missionTitle} | Submitted by: {report.obcName}
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="space-y-4">
                                {report.items.map((item, index) => (
                                    <div key={index} className="p-3 rounded-md bg-muted/50 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">{item.category}</p>
                                            <p className="font-mono text-sm">{item.amount.toFixed(2)} {item.currency}</p>
                                        </div>
                                        <a href={item.receiptUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Paperclip className="mr-2" /> View Receipt
                                            </Button>
                                        </a>
                                    </div>
                                ))}
                                <Separator className="my-4" />
                                <div>
                                     <h4 className="font-semibold text-lg mb-2">Totals Submitted</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Currency</TableHead>
                                                <TableHead className="text-right">Total Amount</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(totals).map(([currency, total]) => (
                                                <TableRow key={currency}>
                                                    <TableCell className="font-medium">{currency}</TableCell>
                                                    <TableCell className="text-right font-bold">{Number(total).toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <Separator className="my-4" />
                                <div>
                                    <h4 className="font-semibold text-lg mb-2">Invoice Status</h4>
                                    {report.invoiceUrl ? (
                                        <a href={report.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="secondary" className="w-full">
                                                <FileCheck className="mr-2" /> View Submitted Invoice
                                            </Button>
                                        </a>
                                    ) : report.status === 'Approved' ? (
                                        <p className="text-sm text-muted-foreground text-center p-4 bg-muted rounded-md">
                                            Awaiting invoice submission from OBC.
                                        </p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center p-4 bg-muted rounded-md">
                                            Report must be approved before an invoice can be submitted.
                                        </p>
                                    )}
                                </div>

                                {report.status === 'Pending' && (
                                    <>
                                        <Separator className="my-4" />
                                        <div>
                                            <h4 className="font-semibold text-lg mb-2">Admin Approval</h4>
                                            <div className="p-4 rounded-md bg-muted/50 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label htmlFor="finalAmount">Final Approved Amount</Label>
                                                        <Input 
                                                            id="finalAmount"
                                                            type="number"
                                                            placeholder="Enter final amount"
                                                            value={finalAmount}
                                                            onChange={(e) => setFinalAmount(e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="finalCurrency">Currency</Label>
                                                        <Select value={finalCurrency} onValueChange={(v) => setFinalCurrency(v as Currency)}>
                                                            <SelectTrigger id="finalCurrency">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="USD">USD</SelectItem>
                                                                <SelectItem value="MXN">MXN</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                                
                                {report.status !== 'Pending' && report.finalAmount && (
                                    <>
                                        <Separator className="my-4" />
                                        <div>
                                            <h4 className="font-semibold text-lg mb-2">Final Approved Amount</h4>
                                            <p className="text-2xl font-bold font-mono">{report.finalAmount.toFixed(2)} {report.finalCurrency}</p>
                                        </div>
                                    </>
                                )}

                            </div>
                        </ScrollArea>
                         <DialogFooter>
                            {report.status === 'Pending' ? (
                                <>
                                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Close</Button>
                                    <Button variant="destructive" onClick={handleReject} disabled={isUpdating}>
                                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                                        Reject
                                    </Button>
                                    <Button onClick={handleApprove} disabled={isUpdating || !finalAmount}>
                                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                        Approve
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                            )}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function ExpenseReportsPage() {
    const [reports, setReports] = useState<ExpenseReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchReports = useCallback(() => {
        setLoading(true);
        getExpenseReports()
            .then(setReports)
            .catch(() => toast({ variant: 'destructive', title: "Error", description: "Could not fetch expense reports." }))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const handleStatusUpdate = async (reportId: string, status: 'Approved' | 'Rejected' | 'Paid', finalAmount?: number, finalCurrency?: Currency) => {
        setUpdatingId(reportId);
        try {
            await updateExpenseReportStatus(reportId, status, finalAmount, finalCurrency);
            toast({ title: "Success", description: `Report status updated to ${status}.` });
            fetchReports();
            if (status === 'Approved' || status === 'Rejected') {
                setIsViewOpen(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not update the report status." });
        } finally {
            setUpdatingId(null);
        }
    };

    const handleViewReport = (report: ExpenseReport) => {
        setSelectedReport(report);
        setIsViewOpen(true);
    };

    const statusBadgeVariant = (status: ExpenseReport['status']) => {
        switch (status) {
            case 'Approved': return 'default';
            case 'Rejected': return 'destructive';
            case 'Paid': return 'outline';
            case 'Pending':
            default:
                return 'outline';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold font-headline">Expense Reports</h1>
                <p className="text-muted-foreground">Review and manage submitted expense reports from OBCs.</p>
            </div>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mission</TableHead>
                                <TableHead>OBC Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : reports.length > 0 ? (
                                reports.map(report => (
                                    <TableRow key={report.id}>
                                        <TableCell className="font-medium">{report.missionTitle}</TableCell>
                                        <TableCell>{report.obcName}</TableCell>
                                        <TableCell>{format(new Date(report.submittedAt), 'PPP')}</TableCell>
                                        <TableCell><Badge variant={statusBadgeVariant(report.status)} className={cn("capitalize", report.status === 'Paid' && "text-green-700 dark:text-green-400 border-green-500/50 bg-green-500/10")}>{report.status}</Badge></TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleViewReport(report)}><Eye className="h-4 w-4" /></Button>
                                            {report.status === 'Approved' && (
                                                <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(report.id, 'Paid')} disabled={updatingId === report.id} title="Mark as Paid">
                                                    {updatingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4 text-green-600" />}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No expense reports submitted yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <ViewExpenseReportDialog 
                report={selectedReport} 
                isOpen={isViewOpen} 
                onOpenChange={setIsViewOpen}
                onStatusUpdate={handleStatusUpdate}
                isUpdating={!!updatingId}
            />
        </div>
    );
}
