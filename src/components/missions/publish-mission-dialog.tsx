"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createMission } from "@/services/firestore"
import type { MissionTimelineStage } from "@/types"

const serviceTypes = [
  { id: "OBC", label: "OBC" },
  { id: "First Mile", label: "First Mile" },
  { id: "Last Mile", label: "Last Mile" },
] as const

const formSchema = z.object({
  missionName: z.string().min(1, "Mission Name is required."),
  description: z.string().optional(),
  origin: z.string().min(1, "Origin is required"),
  obcAmount: z.coerce.number().int().positive({ message: "Amount must be a positive number." }),
  serviceType: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one service type.",
  }),
  missionDate: z.string().refine((val) => val.length > 0, { message: "An mission date is required." }),
})

const defaultTimeline: MissionTimelineStage[] = [
    { stage: 'On my way to ATO', label: 'On my way to ATO', completed: false, timestamp: null, location: null },
    { stage: 'On my way to PU', label: 'On my way to PU', completed: false, timestamp: null, location: null },
    { stage: 'Arrival in ATO', label: 'Arrival in ATO', completed: false, timestamp: null, location: null },
    { stage: 'Arrival in PU', label: 'Arrival in PU', completed: false, timestamp: null, location:null },
    { stage: 'Received goods', label: 'Received goods', completed: false, timestamp: null, location: null, photoUrls: [], amountOfBoxes: 0 },
    { stage: 'On my way to ATO after PU', label: 'On my way to ATO after PU', completed: false, timestamp: null, location: null },
    { stage: 'Arrival in ATO after PU', label: 'Arrival in ATO after PU', completed: false, timestamp: null, location: null },
    { stage: 'Started Customs Clearance', label: 'Started Customs Clearance', completed: false, timestamp: null, location: null },
    { stage: 'Finished Customs Clearance', label: 'Finished Customs Clearance', completed: false, timestamp: null, location: null },
    { stage: 'On my way to check in goods', label: 'On my way to check in goods', completed: false, timestamp: null, location: null },
    { stage: 'Finished check-in', label: 'Finished check-in', completed: false, timestamp: null, location: null, photoUrls: [], attachmentUrls: [] },
    { stage: 'OBC and goods on board', label: 'OBC and goods on board', completed: false, timestamp: null, location: null, photoUrls: [], attachmentUrls: [] },
    { stage: 'Landing in connecting Hub', label: 'Landing in connecting Hub', completed: false, timestamp: null, location: null },
    { stage: 'On my way to migration', label: 'On my way to migration', completed: false, timestamp: null, location: null },
    { stage: 'On my way to Customs', label: 'On my way to Customs', completed: false, timestamp: null, location: null },
    { stage: 'Finished Customs', label: 'Finished Customs', completed: false, timestamp: null, location: null, photoUrls: [] },
    { stage: 'goods are collected connection Hub', label: 'Goods are collected connection Hub', completed: false, timestamp: null, location: null },
    { stage: 'On my way to connecting flight', label: 'On my way to connecting flight', completed: false, timestamp: null, location: null },
    { stage: 'OBC and goods on board connecting flight', label: 'OBC and goods on board connecting flight', completed: false, timestamp: null, location: null, photoUrls: [], attachmentUrls: [] },
    { stage: 'Landing Final destination', label: 'Landing Final destination', completed: false, timestamp: null, location: null },
    { stage: 'Goods are collected final destination', label: 'Goods are collected final destination', completed: false, timestamp: null, location: null },
    { stage: 'On my way to deliver', label: 'On my way to deliver', completed: false, timestamp: null, location: null, eta: '' },
    { stage: 'Delivered', label: 'Delivered', completed: false, timestamp: null, location: null, photoUrls: [], podUrl: '' },
];

interface PublishMissionDialogProps {
    children: React.ReactNode;
    onMissionPublished: () => void;
}

export function PublishMissionDialog({ children, onMissionPublished }: PublishMissionDialogProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            missionName: "",
            description: "",
            origin: "",
            obcAmount: 1,
            serviceType: [],
            missionDate: "",
        },
    });

    async function onSubmit(data: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await createMission({
                title: data.missionName,
                description: data.description,
                origin: data.origin,
                obcAmount: data.obcAmount,
                missionDate: new Date(data.missionDate).toISOString(),
                serviceType: data.serviceType as Array<'OBC' | 'First Mile' | 'Last Mile'>,
                status: 'Pending',
                timeline: defaultTimeline,
            });
            toast({
                title: "Mission Published!",
                description: "The new mission is now available for assignment.",
            });
            onMissionPublished();
            form.reset();
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to publish mission:", error);
            toast({
                variant: "destructive",
                title: "Publish Failed",
                description: "Could not publish the new mission.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Publish Mission</DialogTitle>
                    <DialogDescription>
                        Create a new mission for OBCs to fulfill.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-8 pt-4">
                            <FormField
                                control={form.control}
                                name="missionName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mission Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Mission to..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Detailed mission description..."
                                                className="resize-none"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="origin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Origin</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. New York, USA" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="obcAmount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>OBC Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="missionDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mission Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="serviceType"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel>Type of Service</FormLabel>
                                        </div>
                                        <div className="flex gap-8">
                                            {serviceTypes.map((item) => (
                                                <FormField
                                                    key={item.id}
                                                    control={form.control}
                                                    name="serviceType"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={item.id}
                                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(item.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...(field.value || []), item.id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== item.id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal">
                                                                    {item.label}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                      </ScrollArea>
                      <DialogFooter className="pt-6">
                          <Button type="submit" disabled={isLoading}>
                              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Publish Mission
                          </Button>
                      </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
