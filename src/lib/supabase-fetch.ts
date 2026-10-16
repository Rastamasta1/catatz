type RangeQuery = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>;
};

/**
 * Mengambil seluruh baris data dari query Supabase / PostgREST secara bertahap
 * (chunking) untuk melewati batas default 1.000 data per request.
 */
export async function fetchAllRows<T = unknown>(
  query: RangeQuery,
  pageSize = 1000,
): Promise<T[]> {
  let from = 0;
  const allRows: T[] = [];

  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      throw new Error(error.message);
    }
    if (!data || (Array.isArray(data) && data.length === 0)) {
      break;
    }
    allRows.push(...(data as T[]));
    if (Array.isArray(data) && data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return allRows;
}
