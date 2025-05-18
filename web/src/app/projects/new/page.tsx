"use client";

import { NewProjectForm } from "@/components/projects/new-project-form";

export default function NewProjectPage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4 md:px-6 
                    bg-black 
                    bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <div className="w-full max-w-2xl">
        <NewProjectForm />
      </div>
    </div>
  );
} 