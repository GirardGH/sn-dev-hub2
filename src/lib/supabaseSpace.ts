import 'server-only';
import { canWrite, canDelete } from '@/features/spaces/space.types';
import { createServerSupabaseClient } from './supabaseServer';
import { getSpaceContext } from '@/features/spaces/space.server';
const scopedTables = new Set(['clients', 'stories', 'developments', 'xml_imports', 'development_attachments']);
/** Add a space filter to every business read/write. RLS independently enforces membership. */
export async function createSpaceSupabaseClient() {
  const [db, { active }] = await Promise.all([createServerSupabaseClient(), getSpaceContext()]);
  return new Proxy(db, {
    get(target, property, receiver) {
      if (property !== 'from') return Reflect.get(target, property, receiver);
      return (table: Parameters<typeof db.from>[0]) => {
        const builder = db.from(table);
        if (!scopedTables.has(table)) return builder;
        return new Proxy(builder, {
          get(query, method, queryReceiver) {
            const fn = Reflect.get(query, method, queryReceiver);
            if (typeof fn !== 'function') return fn;
            return (...args: unknown[]) => {
              if (['insert','upsert','update'].includes(String(method)) && !canWrite(active.role)) throw new Error('This space is read-only.');
              if (method === 'delete' && (table === 'development_attachments' ? !canWrite(active.role) : !canDelete(active.role))) throw new Error('Administrator permission required.');
              if (method === 'insert' || method === 'upsert') {
                const addSpace = (row: unknown) => ({ ...(row as Record<string, unknown>), space_id: active.id });
                args[0] = Array.isArray(args[0]) ? args[0].map(addSpace) : addSpace(args[0]);
              }
              const result = Reflect.apply(fn, query, args);
              return ['select', 'update', 'delete'].includes(String(method)) ? (result as { eq: (column: string, value: string) => unknown }).eq('space_id', active.id) : result;
            };
          },
        });
      };
    },
  });
}
