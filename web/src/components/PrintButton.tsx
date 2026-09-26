"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-sm font-medium text-accent-ink transition-transform duration-300 ease-out-expo hover:scale-[1.03]"
    >
      Download as PDF
    </button>
  );
}
