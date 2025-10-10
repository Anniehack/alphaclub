import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4">
      <Logo className="h-20 w-20 mx-auto mb-6" />
      <div className="max-w-2xl space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Welcome to AlphaClub
        </h1>
        <p className="text-lg text-muted-foreground">
          AlphaClub is the mobile application for AlphaJet Logistics, connecting
          administrators and on-board couriers (OBCs) for seamless mission
          management.
        </p>
      </div>
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Button asChild className="bg-slate-50 text-slate-900 hover:bg-slate-200 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
          <Link href="/login/admin">Admin Login</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/login/obc">OBC Login</Link>
        </Button>
      </div>
    </div>
  );
}
