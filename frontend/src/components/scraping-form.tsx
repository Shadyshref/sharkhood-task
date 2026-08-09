"use client";

import { FormEvent, useState } from "react";

const EXAMPLE_URLS = `https://www.tripadvisor.com/Restaurant_Review-g294201-d2333674-Reviews-Cafe_Riche-Cairo_Cairo_Governorate.html
https://www.openstreetmap.org/node/180403503`;

interface ScrapingFormProps {
  onSubmit: (urls: string[]) => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

export function ScrapingForm({ onSubmit, isSubmitting, disabled }: ScrapingFormProps) {
  const [value, setValue] = useState("");
  const urls = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const canSubmit = urls.length > 0 && !isSubmitting && !disabled;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(urls);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <label htmlFor="urls" className="block text-sm font-medium text-zinc-900">
        Restaurant URLs
      </label>
      <textarea
        id="urls"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={EXAMPLE_URLS}
        className="mt-2 min-h-40 w-full resize-y rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100"
        disabled={isSubmitting || disabled}
      />
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">One URL per line.</p>
        <button
          type="submit"
          disabled={!canSubmit}
          className="min-h-11 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isSubmitting ? "Starting..." : "Start Scraping"}
        </button>
      </div>
    </form>
  );
}
