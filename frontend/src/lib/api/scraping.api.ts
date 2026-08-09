import type {
  CreateOperationResponse,
  ScrapingOperation,
  ScrapingResultsResponse,
} from "@/lib/types/scraping.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null) {
    const data = payload as { code?: unknown; message?: unknown; details?: unknown };
    const parts = [
      typeof data.code === "string" ? data.code : undefined,
      typeof data.message === "string" ? data.message : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(": ");
    }
  }

  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Request failed with ${response.status}`));
  }

  return payload as T;
}

export function createScrapingOperation(urls: string[]) {
  return request<CreateOperationResponse>("/v1/scraping-operations", {
    method: "POST",
    body: JSON.stringify({ urls }),
  });
}

export function getScrapingOperation(operationId: string) {
  return request<ScrapingOperation>(`/v1/scraping-operations/${operationId}`);
}

export function getScrapingResults(operationId: string) {
  return request<ScrapingResultsResponse>(
    `/v1/scraping-operations/${operationId}/results`,
  );
}
