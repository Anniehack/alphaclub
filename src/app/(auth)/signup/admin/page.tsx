
"use client";

import Link from "next/link"
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { setDoc, doc } from "firebase/firestore";

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";

export default function AdminSignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.endsWith('@alphajetlogistics.com')) {
            toast({
                variant: "destructive",
                title: "Invalid Email Domain",
                description: "Admin accounts must use an @alphajetlogistics.com email.",
            });
            return;
        }

        if (!auth || !db) {
            toast({
                variant: "destructive",
                title: "Configuration Error",
                description: "Firebase is not configured.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Add user to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name: name,
                email: user.email,
                role: 'admin',
                avatar: `https://placehold.co/128x128.png`,
                availability: 'Unavailable'
            });

            router.push('/dashboard');
        } catch (error: any) {
            console.error("Sign-up error:", error);
            let description = "An unexpected error occurred. Please check the console for details.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email address is already in use.";
            } else if (error.code === 'auth/weak-password') {
                description = "The password is too weak. It must be at least 6 characters long.";
            } else if (error.code === 'auth/operation-not-allowed') {
                description = "Email/Password sign-in is not enabled in your Firebase project. Please enable it in the Authentication > Sign-in method tab of the Firebase console.";
            }
            toast({
                variant: "destructive",
                title: "Sign Up Failed",
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
                    <CardTitle className="text-2xl font-bold">Create Admin <span className="text-primary">Account</span></CardTitle>
                    <CardDescription>
                       Enter your details to create an administrator account
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSignUp} className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="admin@alphajetlogistics.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full bg-foreground text-background hover:bg-foreground/90" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Create Account"}
                    </Button>
                </form>
                 <div className="mt-6 text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/login/admin" className="underline text-primary">
                        Login
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
