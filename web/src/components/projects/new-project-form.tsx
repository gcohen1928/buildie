"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// TODO: Create an apiClient for backend calls
// For now, define a placeholder type for the API response
type ProjectApiResponse = {
  id: string;
  name: string;
  html_url: string;
  description?: string;
};

const projectFormSchema = z.object({
  name: z.string().min(2, {
    message: "Project name must be at least 2 characters.",
  }).max(100, {
    message: "Project name must not exceed 100 characters."
  }),
  html_url: z.string().url({
    message: "Please enter a valid GitHub repository URL."
  }).regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+$/, {
    message: "Must be a valid GitHub repository URL (e.g., https://github.com/user/repo)."
  }),
  description: z.string().max(500, {
    message: "Description must not exceed 500 characters."
  }).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export function NewProjectForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      html_url: "",
      description: "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:8000/projects/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "An unknown error occurred." }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json() as ProjectApiResponse;
      toast.success("Project Created!", {
        description: `Successfully created project: ${result.name}. Indexing repository...`,
      });
      router.push(`/dashboard?projectId=${result.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast.error("Error Creating Project", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full bg-slate-900/80 border-slate-700 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold tracking-tight text-slate-50">Create a New Project</CardTitle>
        <CardDescription className="mt-2 text-slate-400">
          Link your GitHub repository to start generating insights and content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Project Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My Awesome App" 
                      {...field} 
                      className="bg-slate-800 border-slate-600 text-slate-50 placeholder:text-slate-500 focus:border-sky-500" 
                    />
                  </FormControl>
                  <FormDescription className="text-slate-500">
                    A memorable name for your project.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="html_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300 flex items-center">
                    <Github className="w-4 h-4 mr-2 text-slate-400" />
                    GitHub Repository URL
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://github.com/username/repository" 
                      {...field} 
                      className="bg-slate-800 border-slate-600 text-slate-50 placeholder:text-slate-500 focus:border-sky-500"
                    />
                  </FormControl>
                  <FormDescription className="text-slate-500">
                    The full URL of the GitHub repository you want to analyze.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your project and its goals..."
                      className="resize-none bg-slate-800 border-slate-600 text-slate-50 placeholder:text-slate-500 focus:border-sky-500 min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-slate-500">
                    Provide a short summary of what this project is about.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CardFooter className="flex justify-end p-0 pt-6">
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full md:w-auto bg-sky-600 hover:bg-sky-700 text-white text-base py-3 px-6 font-semibold"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating & Indexing...</>
                ) : (
                  "Create Project"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 