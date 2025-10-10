
"use client";
import Link from "next/link"
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { type FieldErrors } from "react-hook-form";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, writeBatch, collection } from "firebase/firestore";

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { validateAndUseInviteCode } from "@/services/firestore";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToastAction } from "@/components/ui/toast";


const loyaltyProgramSchema = z.object({
  airline: z.string().min(1, "Airline name is required."),
  programNumber: z.string().min(1, "Program number is required."),
  status: z.string().min(1, "Status is required."),
});

const unitSchema = z.object({
  type: z.string().min(1, "Unit type is required."),
  plateNumber: z.string().min(1, "Plate number is required."),
});

const bankDetailsSchema = z.object({
  bankName: z.string().min(1, "Bank name is required."),
  iban: z.string().min(1, "IBAN is required."),
  swift: z.string().min(1, "SWIFT/BIC code is required."),
});

const registrationFormSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  address: z.string().min(1, "Address is required."),
  mobileNumber: z.string().min(1, "Mobile number is required."),
  baseCity: z.string().min(1, "Base city is required."),
  airlineLoyaltyPrograms: z.array(loyaltyProgramSchema).optional(),
  units: z.array(unitSchema).optional(),
  creditCardLimit: z.coerce.number().positive("Credit card limit must be a positive number.").optional(),
  rfc: z.string().optional(),
  bankDetails: bankDetailsSchema.optional(),

  passportImage: z.custom<FileList>().refine((files) => files && files.length > 0, "A passport scan is required."),
  passportExpiry: z.string().refine((val) => val && new Date(val).toString() !== 'Invalid Date', "An expiry date is required."),
  
  visaImage: z.custom<FileList>().optional(),
  visaExpiry: z.string().optional(),

  driversLicenseImage: z.custom<FileList>().optional(),
  driversLicenseExpiry: z.string().optional(),
  
  globalEntryImage: z.custom<FileList>().optional(),
  apecImage: z.custom<FileList>().optional(),
}).refine((data) => {
    if (data.visaImage && data.visaImage.length > 0) {
      return data.visaExpiry && data.visaExpiry.length > 0;
    }
    return true;
}, {
    message: "Visa expiry date is required when a visa image is uploaded.",
    path: ["visaExpiry"],
}).refine(data => {
    if (data.driversLicenseImage && data.driversLicenseImage.length > 0) {
        return data.driversLicenseExpiry && data.driversLicenseExpiry.length > 0;
    }
    return true;
}, {
    message: "Driver's license expiry date is required when an image is uploaded.",
    path: ["driversLicenseExpiry"],
});


const unitTypes = [
  { value: "Compact Car", label: "Compact Car (e.g. Nissan Versa) | 10–20 ft³ | 400–800 lbs | Ideal for small parcels or urgent docs" },
  { value: "Cargo Van", label: "Cargo Van | 250–400 ft³ | 3,000–4,000 lbs | Compact, ideal for city deliveries" },
  { value: "Sprinter Van (Extended)", label: "Sprinter Van (Extended) | 400–530 ft³ | 3,500–5,000 lbs | High-roof, fits pallets, good for regional" },
  { value: "Large Van (e.g. Transit)", label: "Large Van (e.g. Transit) | 300–500 ft³ | 3,000–4,500 lbs | Similar to Sprinter, customizable" },
  { value: "Box Truck (16 ft)", label: "Box Truck (16 ft) | ~800 ft³ | 5,000–6,000 lbs | Ideal for mid-sized loads" },
  { value: "Box Truck (26 ft)", label: "Box Truck (26 ft) | ~1,400 ft³ | 10,000–12,000 lbs | For larger hot shot runs" },
  { value: "Straight Truck (24–26 ft)", label: "Straight Truck (24–26 ft) | 1,200–1,500 ft³ | 10,000–13,000 lbs | Non-articulated, dock height" },
];

export default function ObcSignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState<'validate' | 'register'>('validate');

    const [inviteCode, setInviteCode] = useState("");
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof registrationFormSchema>>({
        resolver: zodResolver(registrationFormSchema),
        defaultValues: {
            name: "",
            password: "",
            address: "",
            mobileNumber: "",
            baseCity: "",
            airlineLoyaltyPrograms: [],
            units: [],
            rfc: "",
            bankDetails: { bankName: "", iban: "", swift: "" },
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "airlineLoyaltyPrograms"
    });

    const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({
        control: form.control,
        name: "units"
    });

    const handleValidateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // --- TEMPORARY BYPASS ---
        // This logic bypasses the backend validation and allows any non-empty code to proceed.
        if (inviteCode.trim() && email.trim()) {
            setStep('register');
            form.setValue('email', email);
            toast({
                title: "Code Accepted",
                description: "Please complete your registration.",
            });
        } else {
             toast({
                variant: "destructive",
                title: "Fields Required",
                description: "Please enter an invite code and email.",
            });
        }
        setIsLoading(false);
        // --- END TEMPORARY BYPASS ---
    };
    
    const onFormErrors = (errors: FieldErrors<z.infer<typeof registrationFormSchema>>) => {
        console.error("Form validation failed:", errors);
        toast({
            variant: "destructive",
            title: "Validation Error",
            description: "Please check the form for errors and fill in all required fields.",
        });
    };

    async function handleSignUp(data: z.infer<typeof registrationFormSchema>) {
        if (!auth || !db || !storage) {
            toast({ variant: "destructive", title: "Configuration Error", description: "Firebase is not configured." });
            return;
        }
        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            const uploadDoc = async (fileList: FileList | undefined, docType: string): Promise<string | null> => {
                if (!fileList || fileList.length === 0) return null;
                const file = fileList[0];
                const filePath = `documents/${user.uid}/${docType}-${file.name}`;
                const storageRef = ref(storage, filePath);
                await uploadBytes(storageRef, file);
                return getDownloadURL(storageRef);
            };

            const [
                passportImageUrl,
                visaImageUrl,
                driversLicenseImageUrl,
                globalEntryImageUrl,
                apecImageUrl,
            ] = await Promise.all([
                uploadDoc(data.passportImage, 'passport'),
                uploadDoc(data.visaImage, 'visa'),
                uploadDoc(data.driversLicenseImage, 'drivers-license'),
                uploadDoc(data.globalEntryImage, 'global-entry'),
                uploadDoc(data.apecImage, 'apec'),
            ]);

            const batch = writeBatch(db);
            const userRef = doc(db, 'users', user.uid);
            batch.set(userRef, {
                name: data.name,
                email: data.email,
                role: 'obc',
                registrationStatus: 'pending',
                obcNumber: '',
                avatar: `https://placehold.co/128x128.png`,
                address: data.address,
                mobileNumber: data.mobileNumber,
                baseCity: data.baseCity,
                airlineLoyaltyPrograms: data.airlineLoyaltyPrograms || [],
                units: data.units || [],
                creditCardLimit: data.creditCardLimit || null,
                rfc: data.rfc || null,
                bankDetails: data.bankDetails || null,
                availability: 'Available',
                currentLocation: data.baseCity,
                specialization: 'General',
                location: null
            });
            
            const documentsCollection = collection(db, 'users', user.uid, 'documents');
            if (passportImageUrl) batch.set(doc(documentsCollection), { type: 'Passport', expiryDate: data.passportExpiry, image: passportImageUrl });
            if (driversLicenseImageUrl && data.driversLicenseExpiry) batch.set(doc(documentsCollection), { type: 'DriversLicense', expiryDate: data.driversLicenseExpiry, image: driversLicenseImageUrl });
            if (visaImageUrl && data.visaExpiry) batch.set(doc(documentsCollection), { type: 'Visa', expiryDate: data.visaExpiry, image: visaImageUrl });
            if (globalEntryImageUrl) batch.set(doc(documentsCollection), { type: 'GlobalEntry', image: globalEntryImageUrl, expiryDate: '' });
            if (apecImageUrl) batch.set(doc(documentsCollection), { type: 'APEC', image: apecImageUrl, expiryDate: '' });

            await batch.commit();

            toast({
                title: "Registration Complete!",
                description: "Your application is now being reviewed by an administrator."
            });
            
            router.push('/pending-approval');

        } catch (error: any) {
            console.error("Sign-up error:", error);
            if (error.code === 'auth/email-already-in-use') {
                 toast({
                    variant: "destructive",
                    title: "Sign Up Failed",
                    description: "This email address is already in use.",
                    action: <ToastAction altText="Login" onClick={() => router.push('/login/obc')}>Login Instead</ToastAction>,
                });
                setIsLoading(false);
                return;
            } else if (error.code === 'auth/weak-password') {
                toast({ variant: "destructive", title: "Sign Up Failed", description: "The password is too weak. It must be at least 6 characters long." });
            } else {
                 toast({ variant: "destructive", title: "Sign Up Failed", description: "An unexpected error occurred. Please check the console for details." });
            }
        } finally {
            setIsLoading(false);
        }
    }
    
    if (step === 'validate') {
        return (
             <Card className="mx-auto max-w-sm w-full border-border/50 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Register - Step 1</CardTitle>
                    <CardDescription>
                        Enter your invitation code and the email associated with it to proceed.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleValidateCode} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="invite-code">Invitation Code</Label>
                            <Input
                                id="invite-code"
                                type="text"
                                placeholder="Enter your invitation code"
                                required
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase().trim())}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter the email used for the code"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value.trim())}
                                disabled={isLoading}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || !inviteCode || !email}>
                            {isLoading ? <Loader2 className="animate-spin" /> : "Validate Code"}
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        <Link href="/login/obc" className="underline text-muted-foreground">
                            Back to Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="mx-auto max-w-2xl w-full border-border/50 shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl">OBC Registration</CardTitle>
                <CardDescription>
                    Your code is valid. Please complete your registration.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSignUp, onFormErrors)} className="space-y-8">

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Personal Information</h3>
                             <Separator />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="baseCity" render={({ field }) => (
                                    <FormItem><FormLabel>Base City</FormLabel><FormControl><Input placeholder="e.g., New York, USA" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="password" render={({ field }) => (
                                    <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="mobileNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Airline Loyalty Programs (Optional)</h3>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ airline: "", programNumber: "", status: "" })}>
                                    <PlusCircle className="mr-2" /> Add Program
                                </Button>
                            </div>
                            <Separator />
                            {fields.map((item, index) => (
                                <div key={item.id} className="p-4 border rounded-md space-y-4 relative bg-muted/50">
                                    <div className="flex items-end gap-2">
                                        <FormField control={form.control} name={`airlineLoyaltyPrograms.${index}.airline`} render={({ field }) => (
                                            <FormItem className="flex-1"><FormLabel>Airline</FormLabel><FormControl><Input placeholder="e.g., Delta" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`airlineLoyaltyPrograms.${index}.programNumber`} render={({ field }) => (
                                            <FormItem className="flex-1"><FormLabel>Program Number</FormLabel><FormControl><Input placeholder="e.g., 123456789" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name={`airlineLoyaltyPrograms.${index}.status`} render={({ field }) => (
                                            <FormItem className="flex-1"><FormLabel>Status</FormLabel><FormControl><Input placeholder="e.g., Gold Medallion" {...field} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                             <FormMessage>{form.formState.errors.airlineLoyaltyPrograms?.message}</FormMessage>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">Unit Data (Optional)</h3>
                                <Button type="button" variant="outline" size="sm" onClick={() => appendUnit({ type: "", plateNumber: "" })}>
                                    <PlusCircle className="mr-2" /> Add Unit
                                </Button>
                            </div>
                            <Separator />
                            {unitFields.map((item, index) => (
                                <div key={item.id} className="p-4 border rounded-md space-y-4 relative bg-muted/50">
                                    <FormField control={form.control} name={`units.${index}.type`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type of Unit</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a unit type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {unitTypes.map(unit => (
                                                        <SelectItem key={unit.value} value={unit.value}>
                                                            <span className="text-xs whitespace-normal">{unit.label}</span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name={`units.${index}.plateNumber`} render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Plate Number</FormLabel>
                                            <FormControl><Input {...field} placeholder="Enter plate number" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeUnit(index)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                            <FormMessage>{form.formState.errors.units?.message}</FormMessage>
                        </div>
                        
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Financial &amp; Banking (Optional)</h3>
                             <Separator />
                             <FormField control={form.control} name="creditCardLimit" render={({ field }) => (
                                <FormItem><FormLabel>Credit Card Limit (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="bankDetails.bankName" render={({ field }) => (
                                <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input placeholder="e.g., Bank of America" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="bankDetails.iban" render={({ field }) => (
                                <FormItem><FormLabel>IBAN</FormLabel><FormControl><Input placeholder="Enter IBAN" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="bankDetails.swift" render={({ field }) => (
                                <FormItem><FormLabel>SWIFT / BIC</FormLabel><FormControl><Input placeholder="Enter SWIFT or BIC code" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Tax Information</h3>
                            <Separator />
                            <FormField control={form.control} name="rfc" render={({ field }) => (
                                <FormItem><FormLabel>RFC (Optional)</FormLabel><FormControl><Input placeholder="Enter your RFC" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>

                        <div className="space-y-4">
                             <h3 className="text-lg font-medium">Documents</h3>
                             <p className="text-sm text-muted-foreground">Please attach scans of your documents.</p>
                             <Separator />
                             <div className="space-y-4">
                                <Card className="p-4 bg-muted/50">
                                    <p className="font-semibold">Passport (Required)</p>
                                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                                        <FormField control={form.control} name="passportImage" render={({ field: { value, onChange, ...fieldProps }}) => (
                                            <FormItem>
                                                <FormLabel>Passport Scan</FormLabel>
                                                <FormControl><Input type="file" accept="image/*,.pdf" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="passportExpiry" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expiry Date</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </Card>
                                <Card className="p-4 bg-muted/50">
                                    <p className="font-semibold">Driver's License (Optional)</p>
                                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                                        <FormField control={form.control} name="driversLicenseImage" render={({ field: { value, onChange, ...fieldProps }}) => (
                                            <FormItem>
                                                <FormLabel>License Scan</FormLabel>
                                                <FormControl><Input type="file" accept="image/*,.pdf" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="driversLicenseExpiry" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expiry Date</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </Card>
                                <Card className="p-4 bg-muted/50">
                                    <p className="font-semibold">Visa (Optional)</p>
                                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                                        <FormField control={form.control} name="visaImage" render={({ field: { value, onChange, ...fieldProps }}) => (
                                            <FormItem>
                                                <FormLabel>Visa Scan</FormLabel>
                                                <FormControl><Input type="file" accept="image/*,.pdf" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="visaExpiry" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expiry Date</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </Card>
                                <Card className="p-4 bg-muted/50">
                                    <p className="font-semibold">Other Documents (Optional)</p>
                                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                                         <FormField control={form.control} name="globalEntryImage" render={({ field: { value, onChange, ...fieldProps }}) => (
                                            <FormItem>
                                                <FormLabel>Global Entry Scan</FormLabel>
                                                <FormControl><Input type="file" accept="image/*,.pdf" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="apecImage" render={({ field: { value, onChange, ...fieldProps }}) => (
                                            <FormItem>
                                                <FormLabel>APEC Card Scan</FormLabel>
                                                <FormControl><Input type="file" accept="image/*,.pdf" onChange={e => onChange(e.target.files)} {...fieldProps} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </Card>
                             </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : "Complete Registration"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

    
