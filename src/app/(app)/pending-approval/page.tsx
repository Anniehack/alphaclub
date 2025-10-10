import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Hourglass } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <div className="flex items-center justify-center h-full">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="items-center">
          <Hourglass className="h-12 w-12 text-primary" />
          <CardTitle>Account Pending Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Your registration is complete, but your account is awaiting approval from an administrator. You will be notified via email once your account is active. Thank you for your patience.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
