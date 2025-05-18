"use client";

import LoginForm from '@/components/auth/LoginForm';
import { AuthProvider } from '@/contexts/AuthContext';

export default function LoginPage() {
  return (
    <AuthProvider>
      <div className="min-h-screen text-foreground font-sans flex flex-col items-center justify-center pt-16 md:pt-24 p-4 
                      bg-black 
                      bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"
      >
        <header className="absolute top-8 md:top-12 left-8 md:left-12">
          <a href="/" className="text-2xl font-bold text-slate-100 hover:text-slate-300 transition-colors">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">Buildie</span>
          </a>
        </header>
        <main className="w-full">
          <LoginForm />
        </main>
      </div>
    </AuthProvider>
  );
} 