import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createScrapingOperation,
  getScrapingOperation,
  getScrapingResults,
} from "@/lib/api/scraping.api";
import type { OperationStatus } from "@/lib/types/scraping.types";

const ACTIVE_STATUSES: OperationStatus[] = ["QUEUING", "QUEUED", "PROCESSING"];
const TERMINAL_STATUSES: OperationStatus[] = [
  "SUCCEEDED",
  "PARTIALLY_SUCCEEDED",
  "FAILED",
];

export function isTerminalStatus(status?: OperationStatus) {
  return status ? TERMINAL_STATUSES.includes(status) : false;
}

export function useCreateScrapingOperation() {
  return useMutation({
    mutationFn: createScrapingOperation,
  });
}

export function useScrapingOperation(operationId?: string) {
  return useQuery({
    queryKey: ["scraping-operation", operationId],
    queryFn: () => getScrapingOperation(operationId ?? ""),
    enabled: Boolean(operationId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_STATUSES.includes(status) ? 1000 : false;
    },
  });
}

export function useScrapingResults(operationId?: string, enabled = false) {
  return useQuery({
    queryKey: ["scraping-results", operationId],
    queryFn: () => getScrapingResults(operationId ?? ""),
    enabled: Boolean(operationId) && enabled,
  });
}

// export function useBackendReadiness() {
//   return useQuery({
//     queryKey: ["backend-readiness"],
//     queryFn: getBackendReadiness,
//     retry: false,
//     refetchInterval: 15000,
//   });
// }
