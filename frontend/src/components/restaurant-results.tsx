import type { Restaurant, ScrapingResultsResponse } from "@/lib/types/scraping.types";

function formatDate(value?: string) {
  if (!value) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ListSection({ label, values }: { label: string; values?: string[] }) {
  if (!values || values.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</h4>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const scrapedAt = formatDate(restaurant.lastScrapedAt);
  const imageUrl = restaurant.imageUrls?.[0];

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={restaurant.name ?? "Restaurant"}
          className="h-48 w-full object-cover"
        />
      ) : null}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {restaurant.platform ?? "Unknown platform"}
        </p>
        <h3 className="text-lg font-semibold text-zinc-900">
          {restaurant.name ?? "Unnamed restaurant"}
        </h3>
        {restaurant.canonicalUrl ? (
          <a
            href={restaurant.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="break-words text-sm text-blue-700 hover:underline"
          >
            {restaurant.canonicalUrl}
          </a>
        ) : null}
      </div>

      <div className="mt-5 space-y-4">
        <ListSection label="Cuisines" values={restaurant.cuisines} />
        <ListSection label="Features" values={restaurant.features} />

        {restaurant.openingHours && restaurant.openingHours.length > 0 ? (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Opening hours
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              {restaurant.openingHours.map((item) => (
                <li key={`${item.day}-${item.opens}-${item.closes}`}>
                  {item.day}: {item.opens}–{item.closes}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {scrapedAt ? <p className="text-sm text-zinc-500">Last scraped: {scrapedAt}</p> : null}
      </div>
    </article>
  );
}

interface RestaurantResultsProps {
  results?: ScrapingResultsResponse;
  isLoading: boolean;
  error?: Error | null;
}

export function RestaurantResults({ results, isLoading, error }: RestaurantResultsProps) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Results</h2>
        {isLoading ? <span className="text-sm text-zinc-500">Loading...</span> : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error.message}</p> : null}

      {!isLoading && results?.data.length === 0 ? (
        <p className="mt-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">
          No successfully scraped restaurants were returned for this operation.
        </p>
      ) : null}

      {results && results.data.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {results.data.map((restaurant) => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
