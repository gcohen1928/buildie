// import {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle, FolderPlus, Inbox } from "lucide-react";
import ProjectCard from "@/components/projects/ProjectCard";

// Updated Project type to match backend schema
type Project = {
  id: string; // uuid.UUID will be a string
  name: string;
  html_url: string; // This is the GitHub URL
  description?: string | null;
  created_at?: string | null; // ISO date string
  updated_at?: string | null; // ISO date string
  // Add status if/when it becomes available from the API
};

async function getProjects(): Promise<Project[]> {
  try {
    // Ensure your API is running and accessible at this URL
    // localhost:8000 is typical for a local FastAPI dev server
    const response = await fetch("http://localhost:8000/projects/", {
      cache: "no-store", // For server components, ensures fresh data on each request
    });

    if (!response.ok) {
      // Log more detailed error information on the server
      const errorText = await response.text();
      console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to fetch projects. Status: ${response.status}`);
    }
    const projects = await response.json();
    return projects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    // Re-throw or return empty array/error object to be handled by the component
    // For a page component, throwing will lead to Next.js error page handling
    throw error;
  }
}

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let fetchError: string | null = null;

  try {
    projects = await getProjects();
  } catch (error) {
    if (error instanceof Error) {
      fetchError = error.message;
    } else {
      fetchError = "An unknown error occurred while fetching projects.";
    }
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 text-center bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] pt-16 md:pt-24">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h1 className="mt-4 text-2xl font-bold text-red-400">Error Loading Projects</h1>
        <p className="mt-2 text-slate-300">{fetchError}</p>
        <p className="mt-1 text-sm text-slate-400">
          Please ensure the backend API server is running and accessible at http://localhost:8000/projects/.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground font-sans flex flex-col items-center p-4 md:p-8 bg-black bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] pt-16 md:pt-24">
      <div className="w-full max-w-7xl">
        <div className="flex justify-between items-center my-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50">Your Projects</h1>
          <Button asChild className="bg-sky-600 hover:bg-sky-700 text-white py-2.5 px-5 rounded-lg text-sm font-semibold">
            <Link href="/projects/new">
              <FolderPlus size={18} className="mr-2"/>
              New Project
            </Link>
          </Button>
        </div>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30 flex flex-col items-center justify-center min-h-[400px]">
            <Inbox size={56} className="text-slate-500 mb-6" />
            <h2 className="text-2xl font-semibold mb-3 text-slate-100">No Projects Found</h2>
            <p className="text-slate-400 mb-6 max-w-md">
              It looks like you haven't created any projects yet. 
              Get started by adding your first one!
            </p>
            <Button asChild className="bg-sky-600 hover:bg-sky-700 text-white py-3 px-6 rounded-lg text-base font-semibold">
              <Link href="/projects/new">
                <FolderPlus size={20} className="mr-2.5"/>
                Create Your First Project
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 