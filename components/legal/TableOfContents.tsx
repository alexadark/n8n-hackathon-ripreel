"use client";

import { useState, useEffect } from "react";
import { ChevronRightIcon } from "lucide-react";

interface TOCSection {
  id: string;
  title: string;
  level: number; // 1 for h2, 2 for h3, 3 for h4
}

interface TableOfContentsProps {
  sections: TOCSection[];
  className?: string;
}

export default function TableOfContents({
  sections,
  className = "",
}: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((section) => ({
        id: section.id,
        element: document.getElementById(section.id),
      }));

      // Find the section that's currently in view
      let currentSection = "";
      for (const { id, element } of sectionElements) {
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom >= 100) {
            currentSection = id;
            break;
          }
        }
      }

      // If no section is in the middle, find the closest one above
      if (!currentSection) {
        for (let i = sectionElements.length - 1; i >= 0; i--) {
          const { id, element } = sectionElements[i];
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 100) {
              currentSection = id;
              break;
            }
          }
        }
      }

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Set initial active section

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80; // Account for header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsOpen(false); // Close mobile menu
  };

  const getLevelIndentation = (level: number) => {
    switch (level) {
      case 1:
        return "pl-0";
      case 2:
        return "pl-4";
      case 3:
        return "pl-8";
      default:
        return "pl-0";
    }
  };

  const getLevelStyle = (level: number) => {
    switch (level) {
      case 1:
        return "font-medium text-foreground";
      case 2:
        return "font-normal text-muted-foreground";
      case 3:
        return "font-normal text-muted-foreground text-sm";
      default:
        return "font-normal text-muted-foreground";
    }
  };

  if (sections.length === 0) return null;

  return (
    <>
      {/* Desktop TOC */}
      <div className={`hidden lg:block ${className}`}>
        <div className="sticky top-24 bg-card border rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
            Table of Contents
          </h3>
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`
                  block w-full text-left py-2 px-2 rounded-md transition-colors
                  hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20
                  ${getLevelIndentation(section.level)}
                  ${getLevelStyle(section.level)}
                  ${
                    activeSection === section.id
                      ? "bg-primary/10 text-primary border-l-2 border-primary"
                      : ""
                  }
                `}
              >
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile TOC Toggle Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          aria-label="Toggle table of contents"
        >
          <svg
            className={`w-6 h-6 transition-transform ${
              isOpen ? "rotate-45" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Mobile TOC Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* TOC Panel */}
          <div className="absolute bottom-20 left-4 right-4 bg-card border rounded-lg shadow-xl max-h-96 overflow-y-auto">
            <div className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Table of Contents
              </h3>
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`
                      block w-full text-left py-3 px-3 rounded-md transition-colors
                      hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20
                      ${getLevelIndentation(section.level)}
                      ${getLevelStyle(section.level)}
                      ${
                        activeSection === section.id
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : ""
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      {section.level > 1 && (
                        <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
                      )}
                      {section.title}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
