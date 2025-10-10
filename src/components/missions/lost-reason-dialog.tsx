
"use client"

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2 } from 'lucide-react';
import type { Mission } from '@/types';

interface LostReasonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mission: Mission | null;
  onConfirm: (missionId: string, reason: string) => Promise<void>;
}

const lostReasons = ["Pricing", "Timing", "Routing", "No Feedback"];

export function LostReasonDialog({ isOpen, onOpenChange, mission, onConfirm }: LostReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleConfirm = async () => {
    if (!mission || !reason) return;
    setIsUpdating(true);
    await onConfirm(mission.id, reason);
    setIsUpdating(false);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setReason("");
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Mission as Lost</DialogTitle>
          <DialogDescription>
            Select the reason for marking mission "{mission?.title}" as lost.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger id="reason">
              <SelectValue placeholder="Select reason..." />
            </SelectTrigger>
            <SelectContent>
              {lostReasons.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!reason || isUpdating}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
