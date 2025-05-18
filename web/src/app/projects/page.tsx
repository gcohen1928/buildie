import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

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

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

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
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-50">Projects</h1>
          <Button asChild className="bg-sky-600 hover:bg-sky-700">
            <Link href="/projects/new">New Project</Link>
          </Button>
        </div>
        {projects.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableCaption>A list of your projects.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Project Name</TableHead>
                  {/* <TableHead>Status</TableHead> TODO: Add when status is available */}
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[300px]">Description</TableHead>
                  <TableHead>Repository</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-100">{project.name}</TableCell>
                    {/* <TableCell>{project.status}</TableCell> */}
                    <TableCell className="text-slate-300">{formatDate(project.updated_at)}</TableCell>
                    <TableCell className="text-sm text-slate-400 truncate max-w-xs">
                      {project.description || "N/A"}
                    </TableCell>
                    <TableCell>
                      <a 
                        href={project.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-500 hover:text-sky-400 hover:underline truncate max-w-xs block"
                      >
                        {project.html_url.replace("https://", "")}
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard?projectId=${project.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg border-slate-700 bg-slate-800/30">
            <h2 className="text-xl font-semibold mb-2 text-slate-100">No projects yet!</h2>
            <p className="text-slate-400 mb-4">
              Get started by creating your first project.
            </p>
            <Button asChild className="bg-sky-600 hover:bg-sky-700">
              <Link href="/projects/new">Create New Project</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 