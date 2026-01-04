import { Link, useRouteError, isRouteErrorResponse } from "react-router";
import { ArrowLeft, FileText } from "lucide-react";
import type { Route } from "./+types/terms";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Terms of Service - RipReel" },
    {
      name: "description",
      content: "Terms of Service for RipReel - AI-powered film production platform.",
    },
  ];
}

const lastUpdated = "2025-06-30";

export default function TermsOfService() {
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
            <FileText className="text-[#f5c518]" size={32} />
            <h1 className="font-oswald text-4xl md:text-5xl uppercase font-bold tracking-tight">
              Terms of Service
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
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using RipReel (&ldquo;Service&rdquo;), you agree
              to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you
              disagree with any part of these terms, then you may not access the
              Service.
            </p>
            <p>
              These Terms apply to all visitors, users, and others who access or
              use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              2. Service Description
            </h2>
            <p>
              RipReel is an AI-powered film production platform that helps
              filmmakers create professional video pitch reels. The Service
              includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>AI screenplay parsing and scene extraction</li>
              <li>Automated image generation for scenes</li>
              <li>Video generation with AI models</li>
              <li>Audio generation including voiceover and music</li>
              <li>Final reel assembly and export</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              3. User Content
            </h2>
            <p>
              You retain ownership of any content you input into the Service
              (&quot;User Content&quot;). By using the Service, you grant us a
              license to process your content to provide the Service.
            </p>
            <p>
              You are responsible for your User Content and must ensure you have
              all necessary rights to submit it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              4. API Keys and Third-Party Services
            </h2>
            <p>
              The Service may require you to provide API keys for third-party
              services (such as Anthropic and Kie.ai). You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining the security of your API keys</li>
              <li>Any charges incurred through your use of third-party APIs</li>
              <li>Compliance with third-party terms of service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              5. Intellectual Property
            </h2>
            <p>
              The Service and its original content, features, and functionality
              are owned by RipReel and are protected by international copyright,
              trademark, and other intellectual property laws.
            </p>
            <p>
              AI-generated content created through the Service may be subject to
              the terms of the underlying AI providers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              6. Disclaimers
            </h2>
            <p>
              The Service is provided on an &quot;AS IS&quot; and &quot;AS
              AVAILABLE&quot; basis. We expressly disclaim all warranties of any
              kind, whether express or implied.
            </p>
            <p>
              AI-generated content may contain errors, biases, or inaccuracies.
              You should verify important information independently.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, RipReel shall
              not be liable for any indirect, punitive, incidental, special,
              consequential, or exemplary damages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-oswald text-xl uppercase tracking-wide text-white mb-4">
              8. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms of Service, please
              contact us at:
            </p>
            <div className="bg-[#1c1c1f] border border-[#333] rounded-lg p-4 mt-4">
              <p className="text-white">
                <strong>Email:</strong> legal@ripreel.io
              </p>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-[#333] flex justify-center gap-6">
          <Link
            to="/privacy"
            className="font-courier text-sm text-[#888] hover:text-[#f5c518] transition-colors"
          >
            Privacy Policy
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
