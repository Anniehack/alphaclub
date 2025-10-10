import Image from 'next/image';
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
        <Image 
            src="https://firebasestorage.googleapis.com/v0/b/alphaclub-ev7kl.firebasestorage.app/o/logo%2FLogo%20(1).png?alt=media&token=533c6cbd-0524-454e-ad2a-e0dba243b2c1" 
            alt="AlphaClub Logo"
            fill
            priority
            sizes="(max-width: 768px) 20vw, 10vw"
            className="object-contain"
        />
    </div>
  );
}
