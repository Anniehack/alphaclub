"use client"

import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { OBCDashboard } from "@/components/dashboard/obc-dashboard";
import { useUser } from "@/hooks/use-user";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardLoading() {
    return (
        <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-1/4" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="h-96 rounded-lg lg:col-span-2" />
                <Skeleton className="h-96 rounded-lg" />
            </div>
        </div>
    )
}

export default function DashboardPage() {
  const { user } = useUser();

  if (!user) return <DashboardLoading />;

  return (
    <Suspense fallback={<DashboardLoading />}>
        {user.role === 'admin' ? <AdminDashboard /> : <OBCDashboard />}
    </Suspense>
  )
}
