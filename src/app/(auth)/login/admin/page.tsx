
"use client";

import Link from "next/link"
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { useUser } from "@/hooks/use-user";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function AdminLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { isFirebaseReady } = useUser();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "admin@alphaclub.com",
            password: "",
        },
    });

    const handleLogin = async (values: z.infer<typeof formSchema>) => {
        if (!isFirebaseReady) {
            toast({
                variant: "destructive",
                title: "Configuration Error",
                description: "Firebase is not configured. Please add your API keys to the .env file.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().role === 'admin') {
                router.push('/dashboard');
            } else {
                await auth.signOut();
                toast({
                    variant: "destructive",
                    title: "Access Denied",
                    description: "You do not have administrative privileges.",
                });
            }
        } catch (error: any) {
             let description = "Invalid credentials. Please try again.";
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                description = "The email or password you entered is incorrect.";
            } else if (error.code === 'auth/invalid-email') {
                description = "The email format is invalid.";
            }
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: description,
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="mx-auto max-w-sm w-full border-border/50 shadow-xl">
            <CardHeader className="text-center space-y-4">
                <Logo className="mx-auto h-12 w-12 text-primary" />
                 <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Admin <span className="text-primary">Login</span></CardTitle>
                    <CardDescription>
                       Welcome back, Administrator
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleLogin)} className="grid gap-6">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="admin@alphaclub.com" {...field} disabled={isLoading} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                     <div className="flex items-center">
                                        <FormLabel>Password</FormLabel>
                                        <Link
                                            href="#"
                                            className="ml-auto inline-block text-sm text-primary hover:underline"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>
                                    <FormControl>
                                        <Input type="password" {...field} disabled={isLoading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
                        </Button>
                    </form>
                </Form>
                 <div className="mt-6 text-center text-sm">
                    Need an admin account?{" "}
                    <Link href="/signup/admin" className="underline text-primary">
                        Sign up
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
