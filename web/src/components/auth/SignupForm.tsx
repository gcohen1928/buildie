'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';
// import { useRouter } from 'next/navigation'; // Uncomment if you want to redirect after signup

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
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="space-y-6 max-w-md mx-auto p-8 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <div className="text-center">
        <UserPlus className="mx-auto h-12 w-12 text-indigo-600 dark:text-indigo-400" />
        <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Create your Account</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Get started with Build-in-Public Autopilot.
        </p>
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id="email-signup"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="you@example.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Password (min. 8 characters)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
          <input
            id="password-signup"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="••••••••"
          />
        </div>
      </div>

      {/* Optional: Confirm Password Field */}
      {/* <div> ... مشابه 필드 ... </div> */}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md border border-red-300 dark:border-red-700"
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
        >
          <UserPlus className="h-5 w-5" />
          <span>{successMessage}</span>
        </motion.div>
      )}

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </div>
      <div className="text-sm text-center text-gray-600 dark:text-gray-400">
        Already have an account? <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">Log in</a>
      </div>
    </motion.form>
  );
};

export default SignupForm; 