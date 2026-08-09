"use client";

import { useState } from "react";
import { OperationStatusView } from "@/components/operation-status";
import { RestaurantResults } from "@/components/restaurant-results";
import { ScrapingForm } from "@/components/scraping-form";
import {
  isTerminalStatus,
  // useBackendReadiness,
  useCreateScrapingOperation,
  useScrapingOperation,
  useScrapingResults,
} from "@/lib/queries/scraping.queries";
import type { CreateOperationResponse } from "@/lib/types/scraping.types";

export default function Home() {
  const [submission, setSubmission] = useState<CreateOperationResponse>();
  const createOperation = useCreateScrapingOperation();
  const operation = useScrapingOperation(submission?.operationId);
  const resultsEnabled = isTerminalStatus(operation.data?.status);
  const results = useScrapingResults(submission?.operationId, resultsEnabled);
  // const readiness = useBackendReadiness();

  function handleSubmit(urls: string[]) {
    createOperation.mutate(urls, {
      onSuccess: (data) => {
        setSubmission(data);
      },
    });
  }

  function handleReset() {
    setSubmission(undefined);
    createOperation.reset();
  }

  // const backendReady = readiness.isSuccess;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
              Restaurant Scraping Platform
            </h1>
            <p className="mt-2 text-zinc-600">
              Submit restaurant URLs and track scraping results.
            </p>
          </div>
        </header>

        {!submission ? (
          <ScrapingForm onSubmit={handleSubmit} isSubmitting={createOperation.isPending} />
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
            >
              New Scrape
            </button>
          </div>
        )}

        {createOperation.error ? (
          <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
            {createOperation.error.message}
          </p>
        ) : null}

        <OperationStatusView
          submission={submission}
          operation={operation.data}
          isLoading={operation.isFetching}
          error={operation.error}
        />

        {submission && resultsEnabled ? (
          <RestaurantResults
            results={results.data}
            isLoading={results.isFetching}
            error={results.error}
          />
        ) : null}

     
      </div>
    </main>
  );
}
