'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
// import { useRouter } from 'next/navigation'; // Uncomment if you want to redirect after signup
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

const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState(''); // Optional: if you want a confirm password field
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // const router = useRouter(); // Uncomment for redirection

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    // Optional: Password confirmation check
    // if (password !== confirmPassword) {
    //   setError('Passwords do not match.');
    //   setLoading(false);
    //   return;
    // }

    try {
      const response = await fetch('http://127.0.0.1:8000/auth/signup', { // Or use full backend URL for local dev: http://localhost:8000/auth/signup
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Signup failed');
      }

      setSuccessMessage('Signup successful! Please check your email to confirm your account (if email confirmation is enabled). You can now try logging in.');
      console.log('Signup successful:', data);
      // Optionally, clear form or redirect
      // setEmail('');
      // setPassword('');
      // router.push('/login');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div // Keep motion.div for animations if desired, or apply to Card
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto" // Centering the card
    >
      <Card>
        <CardHeader className="space-y-1 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary" /> {/* Use theme color */}
          <CardTitle className="text-3xl font-bold">Create your Account</CardTitle>
          <CardDescription>
            Get started with Build-in-Public Autopilot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-signup">
                <Mail className="mr-2 h-4 w-4 inline-block" /> Email address
              </Label>
              <Input
                id="email-signup"
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
              <Label htmlFor="password-signup">
                <Lock className="mr-2 h-4 w-4 inline-block" /> Password (min. 8 characters)
              </Label>
              <Input
                id="password-signup"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Optional: Confirm Password Field - Add if needed, similar to above */}
            {/*
            <div className=\"space-y-2\">
              <Label htmlFor=\"confirm-password-signup\">
                <Lock className=\"mr-2 h-4 w-4 inline-block\" /> Confirm Password
              </Label>
              <Input
                id=\"confirm-password-signup\"
                name=\"confirmPassword\"
                type=\"password\"
                autoComplete=\"new-password\"
                placeholder=\"••••••••\"
                required
                // value={confirmPassword} 
                // onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            */}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/30"
              >
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-3 rounded-md border border-green-300 dark:border-green-700"
                // Consider using a success variant if you add Alert component from shadcn
              >
                <UserPlus className="h-5 w-5" /> {/* Or CheckCircleIcon */}
                <span>{successMessage}</span>
              </motion.div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-center">
          Already have an account?{' '}
          <Button variant="link" asChild className="p-0 h-auto">
            <a href="/login">Log in</a>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default SignupForm; 