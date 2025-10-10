
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { getAllInviteCodes } from '@/services/firestore';
import type { InviteCode } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { RefreshCw, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { Input } from '../ui/input';

const CODES_PER_PAGE = 10;

export function InviteCodesCard() {
  const [allCodes, setAllCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCodes = useCallback(() => {
    setLoading(true);
    getAllInviteCodes()
        .then(setAllCodes)
        .finally(() => setLoading(false));
  }, []);
  
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const filteredCodes = useMemo(() => {
    if (!searchTerm) {
        return allCodes;
    }
    return allCodes.filter(code => 
        code.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        code.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allCodes, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredCodes.length / CODES_PER_PAGE);
  const paginatedCodes = useMemo(() => {
    const startIndex = (currentPage - 1) * CODES_PER_PAGE;
    return filteredCodes.slice(startIndex, startIndex + CODES_PER_PAGE);
  }, [filteredCodes, currentPage]);

  return (
    <Card>
      <CardHeader className="flex flex-col lg:flex-row lg:items-center justify-between">
        <div>
            <CardTitle>Invite Codes</CardTitle>
            <CardDescription>
            List of generated one-time invite codes. Newest codes are on top.
            </CardDescription>
        </div>
        <div className="flex items-center gap-2 pt-4 lg:pt-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Search code or email..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={fetchCodes} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        [...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                            </TableRow>
                        ))
                    ) : paginatedCodes.length > 0 ? (
                        paginatedCodes.map((invite) => (
                            <TableRow key={invite.code}>
                                <TableCell className="font-medium">{invite.email}</TableCell>
                                <TableCell className="font-mono text-xs">{invite.code}</TableCell>
                                <TableCell>
                                    <Badge variant={invite.isUsed ? "destructive" : "default"} className={cn(invite.isUsed && "bg-muted text-muted-foreground border-transparent")}>
                                        {invite.isUsed ? 'Used' : 'Active'}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                                {searchTerm ? "No codes match your search." : "No invite codes generated yet."}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                    <ArrowLeft /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                    Next <ArrowRight />
                </Button>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
