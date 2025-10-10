
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { submitInvoice } from '@/services/firestore';
import { Loader2 } from 'lucide-react';
import type { ExpenseReport } from '@/types';

interface UploadInvoiceDialogProps {
  report: ExpenseReport | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceUploaded: () => void;
}

export function UploadInvoiceDialog({ report, isOpen, onOpenChange, onInvoiceUploaded }: UploadInvoiceDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!report || !user || !file) {
      toast({ variant: 'destructive', title: "Missing details", description: "Please select a file to upload." });
      return;
    }
    setIsSubmitting(true);
    try {
      await submitInvoice(report.id, user.id, file);
      toast({ title: "Invoice Uploaded!", description: "Your invoice has been successfully submitted." });
      onInvoiceUploaded();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to submit invoice:", error);
      toast({ variant: 'destructive', title: "Upload Failed", description: "There was an error submitting your invoice." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setFile(null);
    }
    onOpenChange(open);
  }

  if (!report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Invoice</DialogTitle>
          <DialogDescription>
            Upload your invoice for the approved expense report for mission: {report.missionTitle}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="invoice-file">Invoice File (PDF, IMG)</Label>
          <Input id="invoice-file" type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !file}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
