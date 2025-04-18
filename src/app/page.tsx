import Link from "next/link";
import { GalleryVerticalEnd } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 items-center text-center">
        <GalleryVerticalEnd className="size-16 mb-4 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Welcome to Project Fireside
        </h1>
        <p className="text-lg text-muted-foreground">
          Your personalized RSS feed aggregator and reader.
        </p>
        <div className="flex gap-4 items-center flex-col sm:flex-row mt-6">
          <Link
            href="/login"
            className="rounded-md transition-colors flex items-center justify-center bg-primary text-primary-foreground gap-2 hover:bg-primary/90 font-medium text-sm h-10 px-5"
          >
            Login
          </Link>
          <Link
            href="/login" // Login page handles toggle to signup
            className="rounded-md border border-solid border-border transition-colors flex items-center justify-center hover:bg-accent hover:text-accent-foreground font-medium text-sm h-10 px-5"
          >
            Sign Up
          </Link>
        </div>
      </main>
      <footer className="absolute bottom-8 text-xs text-muted-foreground">
        Project Fireside - Database Systems Project
      </footer>
    </div>
  );
}
