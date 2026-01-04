import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import { ArrowLeft, Cookie } from "lucide-react";
import type { Route } from "./+types/cookies";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cookie Policy - RipReel" },
    {
      name: "description",
      content: "Cookie Policy for RipReel - Information about cookies and tracking technologies.",
    },
  ];
}

const lastUpdated = "2025-06-30";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white">
      {/* Header */}
      <header className="border-b border-[#333] py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <Link
            to="/"
            className="text-[#888] hover:text-[#f5c518] transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div className="font-oswald text-2xl font-bold tracking-widest">
            ripreel<span className="text-[#f5c518]">.io</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Cookie className="text-[#f5c518]" size={32} />
            <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight">
              Cookie Policy
            </h1>
          </div>
          <p className="font-courier text-[#888] text-sm">
            Last updated: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-lg max-w-none font-courier text-[#ccc] leading-relaxed">
          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              1. What Are Cookies
            </h2>
            <p>
              Cookies are small text files that are stored on your device when you
              visit a website. They help websites remember your preferences and
              improve your browsing experience.
            </p>
            <p>
              RipReel uses cookies and similar technologies to provide essential
              functionality and enhance your experience.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              2. Types of Cookies We Use
            </h2>

            <h3 className="font-oswald text-lg text-[#f5c518] mb-2">
              2.1 Essential Cookies
            </h3>
            <p>
              These cookies are necessary for our website to function properly and
              cannot be disabled:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Session Management:</strong> Maintaining your active
                session
              </li>
              <li>
                <strong>Security:</strong> Protecting against security threats
              </li>
              <li>
                <strong>Authentication:</strong> Keeping you logged in during your
                session
              </li>
            </ul>

            <h3 className="font-oswald text-lg text-[#f5c518] mb-2 mt-4">
              2.2 Preference Cookies
            </h3>
            <p>These cookies remember your choices and preferences:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Theme Preference:</strong> Your selected theme
                (light/dark)
              </li>
              <li>
                <strong>UI Settings:</strong> Layout and display preferences
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              3. Local Storage
            </h2>
            <p>
              In addition to cookies, we use localStorage to store certain data
              locally in your browser:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>API Keys:</strong> Your third-party API keys (Anthropic,
                Kie.ai) are stored only in your browser&apos;s localStorage and are
                never sent to our servers
              </li>
              <li>
                <strong>User Preferences:</strong> Settings and customizations
              </li>
            </ul>
            <div className="bg-[#1c1c1f] border border-[#00f2ea]/30 rounded-lg p-4 mt-4">
              <p className="text-[#00f2ea] text-sm">
                <strong>Security Note:</strong> API keys stored in localStorage are
                only transmitted directly to the respective AI providers when you
                use RipReel features. They are never stored on or transmitted to
                our servers.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              4. Third-Party Cookies
            </h2>
            <p>
              Some cookies may be set by third-party services we use:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Supabase:</strong> Authentication and session management
              </li>
              <li>
                <strong>Analytics:</strong> Anonymous usage statistics
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              5. Managing Cookies
            </h2>
            <p>
              You can control cookies through your browser settings. Here&apos;s
              how to manage cookies in popular browsers:
            </p>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-4">
                <h4 className="font-oswald text-sm uppercase text-white mb-2">
                  Google Chrome
                </h4>
                <p className="text-sm text-[#888]">
                  Settings → Privacy and security → Cookies
                </p>
              </div>
              <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-4">
                <h4 className="font-oswald text-sm uppercase text-white mb-2">
                  Mozilla Firefox
                </h4>
                <p className="text-sm text-[#888]">
                  Settings → Privacy & Security → Cookies
                </p>
              </div>
              <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-4">
                <h4 className="font-oswald text-sm uppercase text-white mb-2">
                  Safari
                </h4>
                <p className="text-sm text-[#888]">
                  Preferences → Privacy → Cookies
                </p>
              </div>
              <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-4">
                <h4 className="font-oswald text-sm uppercase text-white mb-2">
                  Microsoft Edge
                </h4>
                <p className="text-sm text-[#888]">
                  Settings → Cookies and site permissions
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              6. Impact of Disabling Cookies
            </h2>
            <p>
              Disabling essential cookies may prevent you from using our service
              properly. You may not be able to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain your session</li>
              <li>Access core platform features</li>
              <li>Save your preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              7. Contact Information
            </h2>
            <p>
              If you have any questions about our Cookie Policy, please contact
              us:
            </p>
            <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-4 mt-4">
              <p className="text-white">
                <strong>Email:</strong> privacy@ripreel.io
              </p>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-[#333] flex justify-center gap-6">
          <Link
            to="/terms"
            className="font-courier text-sm text-[#888] hover:text-[#f5c518] transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            to="/privacy"
            className="font-courier text-sm text-[#888] hover:text-[#f5c518] transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let message = "An unexpected error occurred";

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : "Error loading page";
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white flex items-center justify-center">
      <div className="bg-[#1c1c1f] border border-[#e02f2f] rounded-lg p-12 text-center max-w-md">
        <h1 className="font-oswald text-3xl uppercase tracking-wide mb-4 text-[#e02f2f]">
          {message}
        </h1>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#f5c518] hover:bg-white text-black font-oswald uppercase tracking-widest px-6 py-3 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
