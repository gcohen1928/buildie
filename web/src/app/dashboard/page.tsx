'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

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
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading dashboard...</p>
        {/* You could add a spinner here */}
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
        className="bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-8 md:p-12 w-full max-w-lg text-center"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Dashboard
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          Welcome, <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user.email}</span>!
        </p>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Your Info</h2>
          <p className="text-md text-gray-600 dark:text-gray-400">User ID: {user.id}</p>
          {/* Add more user details here if available and needed */}
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </button>
      </motion.div>
    </div>
  );
} 