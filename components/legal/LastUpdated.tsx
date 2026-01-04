interface LastUpdatedProps {
  date: string;
  className?: string;
}

export default function LastUpdated({
  date,
  className = "",
}: LastUpdatedProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString; // Return original string if parsing fails
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-2 text-sm text-muted-foreground ${className}`}
    >
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
      <span>
        Last updated: <time dateTime={date}>{formatDate(date)}</time>
      </span>
    </div>
  );
}
