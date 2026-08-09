import type {
  CreateOperationResponse,
  OperationStatus,
  ScrapingOperation,
  ScrapingTask,
  TaskStatus,
} from "@/lib/types/scraping.types";

const STATUS_STYLES: Record<string, string> = {
  QUEUING: "bg-amber-50 text-amber-800 ring-amber-200",
  QUEUED: "bg-amber-50 text-amber-800 ring-amber-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  PROCESSING: "bg-blue-50 text-blue-800 ring-blue-200",
  SUCCEEDED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  PARTIALLY_SUCCEEDED: "bg-teal-50 text-teal-800 ring-teal-200",
  FAILED: "bg-red-50 text-red-800 ring-red-200",
  DEDUPLICATED: "bg-zinc-50 text-zinc-700 ring-zinc-200",
};

function StatusBadge({ status }: { status: OperationStatus | TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        STATUS_STYLES[status] ?? "bg-zinc-50 text-zinc-700 ring-zinc-200"
      }`}
    >
      {status}
    </span>
  );
}

function CountItem({ label, value }: { label: string; value?: number }) {
  if (value === undefined) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-zinc-900">{value}</dd>
    </div>
  );
}

function TaskCard({ task }: { task: ScrapingTask }) {
  return (
    <li className="rounded-xl border border-zinc-200 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900">{task.platform}</p>
          <p className="mt-1 break-words text-sm text-zinc-600">{task.originalUrl}</p>
        </div>
        <StatusBadge status={task.status} />
      </div>
      <p className="mt-3 text-sm text-zinc-500">Attempts: {task.attempts}</p>

      {task.error ? (
        <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-medium">{task.error.code}</p>
          <p className="mt-1">{task.error.message}</p>
          {task.error.upstreamStatus !== undefined ? (
            <p className="mt-1 text-red-700">Upstream status: {task.error.upstreamStatus}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

interface OperationStatusProps {
  submission?: CreateOperationResponse;
  operation?: ScrapingOperation;
  isLoading: boolean;
  error?: Error | null;
}

export function OperationStatusView({
  submission,
  operation,
  isLoading,
  error,
}: OperationStatusProps) {
  if (!submission) {
    return null;
  }

  const counts = operation?.counts ?? {};

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Operation</h2>
          <p className="mt-1 break-all text-sm text-zinc-500">ID: {submission.operationId}</p>
        </div>
        <StatusBadge status={operation?.status ?? submission.status} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CountItem label="Requested" value={submission.requestedCount} />
        <CountItem label="Accepted" value={submission.acceptedCount} />
        <CountItem label="Rejected" value={submission.rejected?.length ?? operation?.rejectedCount} />
        <CountItem label="Duplicates" value={submission.duplicates?.length} />
        <CountItem label="Queued" value={counts.QUEUED ?? counts.PENDING} />
        <CountItem label="Processing" value={counts.PROCESSING} />
        <CountItem label="Succeeded" value={counts.SUCCEEDED} />
        <CountItem label="Failed" value={counts.FAILED} />
      </dl>

      {submission.rejected && submission.rejected.length > 0 ? (
        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <h3 className="text-sm font-medium text-amber-950">Rejected URLs</h3>
          <ul className="mt-2 space-y-2 text-sm text-amber-900">
            {submission.rejected.map((item) => (
              <li key={item.url} className="break-words">
                <span className="font-medium">{item.code}</span>: {item.message} — {item.url}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isLoading ? <p className="mt-5 text-sm text-zinc-500">Loading latest status...</p> : null}
      {error ? <p className="mt-5 text-sm text-red-700">{error.message}</p> : null}

      {operation?.tasks && operation.tasks.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-900">Tasks</h3>
          <ul className="mt-3 space-y-3">
            {operation.tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
