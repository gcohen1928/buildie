"use client";

import SignupForm from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen text-foreground font-sans flex flex-col items-center justify-center p-4 
                    bg-black 
                    bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"
    >
      <header className="absolute top-8 left-8">
        <a href="/" className="text-2xl font-bold text-slate-100 hover:text-slate-300 transition-colors">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">Buildie</span>
        </a>
      </header>
      <main className="w-full">
        <SignupForm />
      </main>
    </div>
  );
} 