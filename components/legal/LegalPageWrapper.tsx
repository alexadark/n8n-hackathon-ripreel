"use client";

import { ReactNode } from "react";

interface LegalPageWrapperProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
  description?: string;
}

export default function LegalPageWrapper({
  title,
  lastUpdated,
  children,
  description,
}: LegalPageWrapperProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-background to-muted/20 border-b">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
                {description}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-full px-4 py-2 inline-flex">
              <span className="inline-flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Last updated: {lastUpdated}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div
            className="prose prose-lg prose-slate dark:prose-invert max-w-none
                         [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-16 [&_h2]:mb-8 [&_h2]:pb-4 [&_h2]:border-b-2 [&_h2]:border-border [&_h2]:leading-tight
                         [&_h3]:text-2xl [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mt-12 [&_h3]:mb-6 [&_h3]:leading-snug
                         [&_h4]:text-xl [&_h4]:font-medium [&_h4]:text-foreground [&_h4]:mt-8 [&_h4]:mb-4 [&_h4]:leading-normal
                         [&_p]:text-foreground [&_p]:leading-loose [&_p]:mb-6 [&_p]:text-lg
                         [&_ul]:text-foreground [&_ul]:space-y-3 [&_ul]:mb-8 [&_ul]:ml-6 [&_ul]:text-lg [&_ul]:list-disc
                         [&_ol]:text-foreground [&_ol]:space-y-3 [&_ol]:mb-8 [&_ol]:ml-6 [&_ol]:text-lg [&_ol]:list-decimal
                         [&_li]:leading-loose [&_li]:pl-2
                         [&_strong]:font-semibold [&_strong]:text-foreground
                         [&_a]:text-primary [&_a]:hover:underline [&_a]:font-medium
                         [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-8 [&_blockquote]:bg-muted/20 [&_blockquote]:py-4 [&_blockquote]:rounded-r-lg
                         [&_section]:mb-12
                         [&_.section-divider]:my-16 [&_.section-divider]:border-t-2 [&_.section-divider]:border-border
                         [&_.bg-muted\\/30]:p-6 [&_.bg-muted\\/30]:rounded-lg [&_.bg-muted\\/30]:border
                         [&_.bg-primary\\/5]:p-8 [&_.bg-primary\\/5]:rounded-xl
                         [&_.grid]:gap-6
                         max-sm:[&_h2]:text-2xl max-sm:[&_h2]:mt-12 max-sm:[&_h2]:mb-6
                         max-sm:[&_h3]:text-xl max-sm:[&_h3]:mt-8 max-sm:[&_h3]:mb-4
                         max-sm:[&_h4]:text-lg max-sm:[&_h4]:mt-6 max-sm:[&_h4]:mb-3
                         max-sm:[&_p]:text-base
                         max-sm:[&_ul]:text-base max-sm:[&_ul]:ml-4
                         max-sm:[&_ol]:text-base max-sm:[&_ol]:ml-4"
          >
            {children}
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="border-t bg-muted/30 mb-16">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-base text-muted-foreground">
              If you have any questions about this document, please contact us
              at{" "}
              <a
                href="mailto:legal@shipkit.ai"
                className="text-primary hover:underline font-medium"
              >
                legal@shipkit.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
