# Web Frontend (Next.js)

This directory contains the Next.js frontend application for the Build-in-Public Autopilot project.

## Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js) or yarn
*   A running instance of the FastAPI backend (see `../api/README.md`)
*   A running local Supabase instance (see `../supabase/README.md` or project root README for instructions on `supabase start`)

## Getting Started

1.  **Navigate to the web directory:**
    ```bash
    cd web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in this directory (`web/.env.local`) by copying `web/.env.example` (if it exists) or by creating it manually. Add the following variables:

    ```env
    # URL for your local Supabase instance (from supabase start output)
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 
    # Anon key for your local Supabase instance (from supabase start output)
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-from-cli
    
    # URL for your FastAPI backend
    NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
    ```
    Replace `your-supabase-anon-key-from-cli` with the actual anon key provided when you run `supabase start` in the project root.

4.  **Ensure the FastAPI backend is running:**
    Navigate to the `api` directory in a separate terminal and follow its README to start the backend server (usually `poetry run uvicorn app.main:app --reload`). It typically runs on `http://127.0.0.1:8000`.

5.  **Run the Next.js development server:**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Key Technologies

*   Next.js (App Router)
*   React & TypeScript
*   Tailwind CSS
*   Supabase Client (`@supabase/supabase-js`)
*   Framer Motion (for animations)
*   Lucide React (for icons)
*   Radix UI (for unstyled, accessible UI primitives - installed as needed, e.g., `@radix-ui/react-label`)

## Project Structure

*   `src/app/`: Main application pages (App Router) and global layout (`layout.tsx`).
*   `src/components/`: Reusable UI components (e.g., `auth/LoginForm.tsx`).
*   `src/contexts/`: React Context providers (e.g., `AuthContext.tsx`).
*   `src/services/`: Logic for API interactions and other services (e.g., `supabase/client.ts` for direct Supabase client if used, though current auth calls backend API).
*   `src/styles/`: Global styles (`globals.css`) and Tailwind CSS configuration.
*   `public/`: Static assets.

## Available Scripts

In the `web` directory, you can run:

*   `npm run dev`: Runs the app in development mode.
*   `npm run build`: Builds the app for production.
*   `npm run start`: Starts a production server (after building).
*   `npm run lint`: Lints the codebase using ESLint.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
