
"use client";

import Link from "next/link"
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, firebaseInitialized, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export default function ObcLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { isFirebaseReady } = useUser();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const getEmailFromIdentifier = async (id: string): Promise<string | null> => {
        // Simple check if it's likely an email
        if (id.includes('@')) {
            return id;
        }

        // If not an email, assume it's an OBC number and query for the user
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("obcNumber", "==", id), where("role", "==", "obc"), limit(1));
        
        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                return userDoc.data().email as string;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user by OBC number:", error);
            return null;
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
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
            const email = await getEmailFromIdentifier(identifier.trim());

            if (!email) {
                throw new Error("User not found or invalid identifier.");
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists() && userDoc.data().role === 'obc') {
                router.push('/dashboard');
            } else {
                await auth.signOut();
                toast({
                    variant: "destructive",
                    title: "Access Denied",
                    description: "This login is for On-Board Couriers only.",
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Invalid credentials. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="w-full max-w-sm">
             <div className="space-y-2 text-left mb-8">
                <h1 className="text-3xl font-bold">OBC Login</h1>
                <p className="text-muted-foreground">
                   Enter your OBC Number or Email and password.
                </p>
            </div>
            <div>
                <form onSubmit={handleLogin} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="identifier">OBC Number or Email</Label>
                        <Input
                            id="identifier"
                            type="text"
                            placeholder="Enter OBC Number or Email"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" variant="secondary" className="w-full mt-2" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Login"}
                    </Button>
                </form>
                <div className="mt-6 flex items-center justify-between text-sm">
                  <Link href="/signup/obc" className="underline text-muted-foreground hover:text-primary">
                    Register
                  </Link>
                   <Link
                        href="#"
                        className="underline text-muted-foreground hover:text-primary"
                    >
                        Forgot Password?
                    </Link>
                </div>
            </div>
        </div>
    )
}
