
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useUser } from "@/hooks/use-user"
import { onNotificationsUpdate, markNotificationAsRead, getExpenseReportById } from "@/services/firestore"
import type { Notification, ExpenseReport } from '@/types';
import { UploadInvoiceDialog } from '@/components/missions/upload-invoice-dialog';
import { ScrollArea } from '../ui/scroll-area';
import { format } from 'date-fns';

export function NotificationBell() {
    const { user } = useUser();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [selectedReport, setSelectedReport] = useState<ExpenseReport | null>(null);
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = onNotificationsUpdate(user.id, setNotifications);
        return () => unsubscribe();
    }, [user]);

    const handleNotificationClick = async (notif: Notification) => {
        if (user && !notif.read) {
            markNotificationAsRead(user.id, notif.id);
        }

        if (notif.type === 'expense_approved' && user?.role === 'obc') {
            const report = await getExpenseReportById(notif.relatedId);
            if(report && !report.invoiceUrl) {
                setSelectedReport(report);
                setIsInvoiceDialogOpen(true);
            }
        }
        
        if ((notif.type === 'expense_submitted' || notif.type === 'invoice_submitted') && user?.role === 'admin') {
            router.push('/expense-reports');
        }

        if (notif.type === 'mission_update') {
            router.push('/chat');
        }

        if (notif.type === 'expense_paid' && user?.role === 'obc') {
            router.push('/missions');
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        if ('setAppBadge' in navigator) {
            if (unreadCount > 0) {
                (navigator as any).setAppBadge(unreadCount);
            } else {
                (navigator as any).clearAppBadge();
            }
        }
    }, [unreadCount]);
    
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="relative h-8 w-8">
                        <Bell className="h-4 w-4" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                {unreadCount}
                            </span>
                        )}
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                    <DropdownMenuLabel className="p-2">Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <ScrollArea className="h-80">
                         <div className="p-1">
                            {notifications.length > 0 ? (
                                notifications.map(notif => (
                                    <DropdownMenuItem 
                                        key={notif.id} 
                                        onSelect={() => handleNotificationClick(notif)} 
                                        className={cn("whitespace-normal cursor-pointer flex flex-col items-start gap-1 rounded-md", !notif.read && "bg-muted/50")}
                                    >
                                        <p className={cn("font-medium text-sm", !notif.read && "font-semibold")}>{notif.message}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Just now'}
                                        </p>
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <p className="p-4 text-sm text-muted-foreground text-center">No new notifications.</p>
                            )}
                        </div>
                    </ScrollArea>
                </DropdownMenuContent>
            </DropdownMenu>
            <UploadInvoiceDialog 
                report={selectedReport}
                isOpen={isInvoiceDialogOpen}
                onOpenChange={setIsInvoiceDialogOpen}
                onInvoiceUploaded={() => {}}
            />
        </>
    )
}
