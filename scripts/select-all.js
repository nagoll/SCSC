/**
 * select-all.js — read every row of a query, a page at a time.
 *
 * Supabase returns at most 1000 rows per request, so a plain select('*') on
 * the events table silently stops at 1000. `query` builds a fresh, ordered
 * query each call (a builder can only be awaited once); this pages through it
 * with range() until a short page comes back.
 */

const PAGE_SIZE = 1000;

async function selectAll(query) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query().range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...data);
    if (data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}

module.exports = { selectAll, PAGE_SIZE };
