
"use client";

import { useState } from 'react';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { submitExpenseReport } from '@/services/firestore';
import type { Mission, ExpenseCategory } from '@/types';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';

interface ExpenseReportDialogProps {
    children: React.ReactNode;
    mission: Mission;
}

const categories: ExpenseCategory[] = ['Cart', 'Excess baggage', 'CBP Tax', 'Car Rental', 'Hotel', 'Wrapping fee', 'Taxi/Uber Fee', 'Flight Charges', 'Duty Fees', 'Transfer', 'Other'];

const expenseItemSchema = z.object({
  category: z.string().min(1, "Category is required."),
  amount: z.coerce.number().positive("Amount must be positive."),
  currency: z.enum(["USD", "MXN"]),
  receipt: z.custom<FileList>().refine(files => files && files.length > 0, "A receipt file is required."),
});

const formSchema = z.object({
  items: z.array(expenseItemSchema).min(1, "At least one expense item is required."),
});

type FormValues = z.infer<typeof formSchema>;

export function ExpenseReportDialog({ children, mission }: ExpenseReportDialogProps) {
    const { user } = useUser();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            items: [{ category: '', amount: 0, currency: 'USD', receipt: undefined }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    const watchItems = form.watch('items');
    const totals = watchItems.reduce((acc, item) => {
        const amount = Number(item.amount);
        if(amount > 0 && item.currency) {
            acc[item.currency] = (acc[item.currency] || 0) + amount;
        }
        return acc;
    }, {} as Record<string, number>);

    const onSubmit = async (data: FormValues) => {
        if (!user) {
            toast({ variant: 'destructive', title: "Not Authenticated", description: "You must be logged in to submit a report." });
            return;
        }
        setIsSubmitting(true);
        try {
            await submitExpenseReport(mission, user, data.items);
            toast({ title: "Success!", description: "Your expense report has been submitted." });
            form.reset();
            setIsOpen(false);
        } catch (error) {
            console.error("Expense report submission failed:", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "There was an error submitting your report." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Expense Report for Mission: {mission.title}</DialogTitle>
                    <DialogDescription>
                        Add all expenses for this mission. You can add multiple items.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <ScrollArea className="h-96 pr-4">
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.category`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Category</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.amount`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Amount</FormLabel>
                                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.currency`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Currency</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="USD">USD</SelectItem>
                                                                <SelectItem value="MXN">MXN</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                         <FormField
                                            control={form.control}
                                            name={`items.${index}.receipt`}
                                            render={({ field: { value, onChange, ...fieldProps } }) => (
                                                <FormItem>
                                                    <FormLabel>Receipt</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                          type="file" 
                                                          accept="image/*,application/pdf"
                                                          onChange={(e) => onChange(e.target.files)}
                                                          {...fieldProps}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ category: '', amount: 0, currency: 'USD', receipt: undefined })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </ScrollArea>
                        <Separator />
                        <div className="space-y-2">
                             <h3 className="text-lg font-semibold">Expense Summary</h3>
                              <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Currency</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(totals).length > 0 ? (
                                        Object.entries(totals).map(([currency, total]) => (
                                            <TableRow key={currency}>
                                                <TableCell className="font-medium">{currency}</TableCell>
                                                <TableCell className="text-right font-mono">{total.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="h-24 text-center">
                                                No expenses added yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Report
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
