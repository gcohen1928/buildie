'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation'; // For redirecting after login
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, authError, clearAuthError, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Clear any previous auth errors when component mounts or email/password changes
    clearAuthError();
  }, [email, password, clearAuthError]);

  useEffect(() => {
    if (user) {
      router.push('/dashboard'); // Or any other protected route
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await login(email, password);
    // Navigation is handled by the useEffect hook watching the user state
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto"
    >
      <Card>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">Welcome Back to Buildie</CardTitle>
          <CardDescription>
            Log in to continue building in public, on autopilot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="mr-2 h-4 w-4 inline-block" /> Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="password" className="flex-grow">
                  <Lock className="mr-2 h-4 w-4 inline-block" /> Password
                </Label>
                <Button variant="link" size="sm" asChild className="p-0 h-auto">
                  <a href="#" className="text-xs">
                    Forgot your password?
                  </a>
                </Button>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/30"
              >
                <AlertCircle className="h-5 w-5" />
                <span>{authError}</span>
              </motion.div>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm">
           <div className="text-center">
            Don't have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto">
                <a href="/signup">Sign up</a>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default LoginForm; 