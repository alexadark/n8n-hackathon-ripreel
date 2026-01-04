import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import { ArrowLeft, Shield } from "lucide-react";
import type { Route } from "./+types/privacy";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Privacy Policy - RipReel" },
    {
      name: "description",
      content: "Privacy Policy for RipReel - How we collect, use, and protect your information.",
    },
  ];
}

const lastUpdated = "2025-06-30";

export default function PrivacyPolicy() {
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
            <Shield className="text-[#f5c518]" size={32} />
            <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight">
              Privacy Policy
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
              1. Introduction
            </h2>
            <p>
              RipReel (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
              respects your privacy and is committed to protecting your personal
              information. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our AI-powered
              film production platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              2. Information We Collect
            </h2>
            <h3 className="font-oswald text-lg text-[#f5c518] mb-2">
              2.1 Information You Provide
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Screenplay Content:</strong> Text or PDF files you upload
                for processing
              </li>
              <li>
                <strong>Project Data:</strong> Project names, settings, and
                preferences
              </li>
              <li>
                <strong>API Keys:</strong> Third-party API keys stored locally in
                your browser
              </li>
            </ul>

            <h3 className="font-oswald text-lg text-[#f5c518] mb-2 mt-4">
              2.2 Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Device and browser information</li>
              <li>Usage patterns and feature interactions</li>
              <li>Error logs and performance data</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To process your screenplay and generate content</li>
              <li>To improve our AI models and features</li>
              <li>To communicate with you about the Service</li>
              <li>To ensure security and prevent fraud</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              4. Third-Party Services
            </h2>
            <p>Our Service integrates with third-party AI providers:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Anthropic (Claude):</strong> For screenplay parsing and
                AI assistance
              </li>
              <li>
                <strong>Google (Veo 3.1 via Kie.ai):</strong> For video and audio
                generation
              </li>
              <li>
                <strong>Image Generation Providers:</strong> For scene image
                creation
              </li>
            </ul>
            <p className="mt-4">
              These providers may process your content according to their own
              privacy policies. We encourage you to review their policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              5. Data Storage and Security
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>API Keys:</strong> Stored locally in your browser&apos;s
                localStorage, never transmitted to our servers
              </li>
              <li>
                <strong>Screenplay Data:</strong> Stored securely in Supabase with
                encryption at rest
              </li>
              <li>
                <strong>Generated Assets:</strong> Stored in secure cloud storage
                buckets
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              6. Your Rights
            </h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of certain data processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              7. Data Retention
            </h2>
            <p>
              We retain your data for as long as necessary to provide our Service.
              You can request deletion of your projects and associated data at any
              time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              8. Contact Information
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please contact
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
            to="/cookies"
            className="font-courier text-sm text-[#888] hover:text-[#f5c518] transition-colors"
          >
            Cookie Policy
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
