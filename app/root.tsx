import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "@/components/ui/sonner";
import type { Route } from "./+types/root";

import "./globals.css";

/**
 * Root layout for the application
 * Replaces Next.js app/layout.tsx with React Router 7 conventions
 */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="font-sans antialiased bg-[#0a0a0b] text-white min-h-screen">
        {children}
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <div className="max-w-md mx-auto text-center p-8 bg-[#1c1c1f] rounded-lg border border-[#333]">
        <h1 className="text-6xl font-oswald font-bold text-[#f5c518] mb-4">
          {message}
        </h1>
        <p className="text-[#888] font-courier mb-6">{details}</p>
        {stack && (
          <pre className="text-left text-xs text-red-400 bg-[#0a0a0b] p-4 rounded overflow-auto max-h-48">
            {stack}
          </pre>
        )}
        <a
          href="/"
          className="inline-block mt-6 px-6 py-3 bg-[#f5c518] text-black font-oswald font-bold uppercase tracking-wide rounded hover:bg-[#d4a917] transition-colors"
        >
          Return Home
        </a>
      </div>
    </main>
  );
}

export function HydrateFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
      <div className="animate-pulse">
        <div className="h-12 w-48 bg-[#1c1c1f] rounded mb-4" />
        <div className="h-4 w-64 bg-[#1c1c1f] rounded" />
      </div>
    </div>
  );
}
