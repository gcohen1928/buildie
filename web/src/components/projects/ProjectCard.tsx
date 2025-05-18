"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Github, ExternalLink, CalendarDays } from "lucide-react"; // For icons

// Type for project data (can be imported from page.tsx or a shared types file later)
type Project = {
  id: string;
  name: string;
  html_url: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

interface ProjectCardProps {
  project: Project;
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

export default function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="bg-slate-800/60 border-slate-700 hover:border-slate-600 transition-all duration-200 ease-in-out shadow-lg hover:shadow-xl flex flex-col h-full">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold text-slate-100 leading-tight">
            {project.name}
          </CardTitle>
          <Button variant="outline" size="sm" asChild className="border-slate-600 hover:border-sky-500 hover:bg-sky-600/20 hover:text-sky-400 transition-colors text-slate-300 ml-2 shrink-0">
            <Link href={`/dashboard?projectId=${project.id}`}>
              <ExternalLink size={16} className="mr-1.5" />
              View
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <CardDescription className="text-sm text-slate-400 line-clamp-3 mb-4">
          {project.description || "No description available."}
        </CardDescription>
        
        <div className="space-y-2 text-sm">
          {project.html_url && (
            <div className="flex items-center text-slate-400">
              <Github size={15} className="mr-2 shrink-0 text-slate-500" />
              <a
                href={project.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-500 hover:text-sky-400 hover:underline truncate block"
                title={project.html_url}
              >
                {project.html_url.replace("https://github.com/", "")}
              </a>
            </div>
          )}
          <div className="flex items-center text-slate-400">
            <CalendarDays size={15} className="mr-2 shrink-0 text-slate-500" />
            <span>Last updated: {formatDate(project.updated_at)}</span>
          </div>
        </div>
      </CardContent>
      {/* CardFooter can be used later for tags, etc. */}
      {/* <CardFooter className="pt-3 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">Footer content if needed</p>
      </CardFooter> */}
    </Card>
  );
} 