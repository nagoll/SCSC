/**
 * fake-supabase.js — an in-memory stand-in for the Supabase client, used only
 * in tests. Implements just the query-builder calls this codebase actually
 * issues (select/upsert/insert/delete + lt/not/order filters), not a general
 * Postgres emulator.
 */

function makeFakeSupabase(initialTables = {}) {
  const tables = {};
  for (const [name, rows] of Object.entries(initialTables)) {
    tables[name] = rows.map((r) => ({ ...r }));
  }

  function builder(tableName) {
    if (!tables[tableName]) tables[tableName] = [];
    let op = null;
    let payload = null;
    const filters = [];

    const api = {
      select() {
        if (op === null) op = 'select';
        return api;
      },
      upsert(rows) {
        op = 'upsert';
        payload = rows;
        return api;
      },
      insert(rows) {
        op = 'insert';
        payload = rows;
        return api;
      },
      delete() {
        op = 'delete';
        return api;
      },
      lt(field, value) {
        filters.push((row) => row[field] < value);
        return api;
      },
      not() {
        filters.push(() => true); // only used as "not id is null", i.e. matches every row here
        return api;
      },
      order() {
        return api;
      },
      then(resolve, reject) {
        try {
          const rows = tables[tableName];
          if (op === 'select') {
            resolve({ data: rows.filter((r) => filters.every((f) => f(r))), error: null });
          } else if (op === 'upsert') {
            for (const incoming of payload) {
              const idx = rows.findIndex((r) => r.id === incoming.id);
              if (idx >= 0) rows[idx] = { ...incoming };
              else rows.push({ ...incoming });
            }
            resolve({ data: payload, error: null });
          } else if (op === 'insert') {
            rows.push(...payload.map((r) => ({ ...r })));
            resolve({ data: payload, error: null });
          } else if (op === 'delete') {
            const kept = rows.filter((r) => !filters.every((f) => f(r)));
            const removed = rows.filter((r) => filters.every((f) => f(r)));
            tables[tableName] = kept;
            resolve({ data: removed, error: null });
          } else {
            resolve({ data: [], error: null });
          }
        } catch (err) {
          reject ? reject(err) : resolve({ data: null, error: err });
        }
      },
    };
    return api;
  }

  return {
    tables,
    from(tableName) {
      return builder(tableName);
    },
  };
}

module.exports = { makeFakeSupabase };
