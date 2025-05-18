'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback or if the redirect hasn't happened yet:
    return null; // Or a minimal loading/redirecting state
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold">Dashboard</CardTitle>
            <CardDescription className="text-lg pt-2">
              Welcome, <span className="font-semibold text-primary">{user.email}</span>!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-t border-border pt-6">
              <h2 className="text-2xl font-semibold text-center mb-4">Your Info</h2>
              <p className="text-md text-muted-foreground text-center">User ID: {user.id}</p>
              {/* Add more user details here if available and needed */}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={logout}
              variant="destructive"
              className="w-full"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Logout
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
} 