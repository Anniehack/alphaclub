import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Mission } from "@/types";
import { ArrowRight, MapPin } from "lucide-react";
import { StatusBadge } from "../status-badge";

interface MissionCardProps {
    mission: Mission;
    onViewDetails?: () => void;
}

export function MissionCard({ mission, onViewDetails }: MissionCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-headline">{mission.title}</CardTitle>
                    <StatusBadge status={mission.status} />
                </div>
                <CardDescription>ID: {mission.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
            <CardFooter>
                 <Button variant="outline" size="sm" onClick={onViewDetails}>View Details</Button>
            </CardFooter>
        </Card>
    );
}
