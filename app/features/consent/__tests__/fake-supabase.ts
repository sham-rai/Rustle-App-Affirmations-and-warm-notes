// A stand-in for app/lib/supabase in the consent tests: records what the screens write, with no
// network. Use with
//   jest.mock('../../../lib/supabase', () => jest.requireActual('./fake-supabase').fakeSupabaseModule);
// and inspect `fake` from this module.

export type Write = { table: string; op: 'insert' | 'update'; row: Record<string, unknown>; filter?: [string, unknown] };

export const USER_ID = '00000000-0000-4000-8000-000000000001';

export const fake = {
  writes: [] as Write[],
  session: true,
  failWrites: false,
  deleteAnonymousAccount: jest.fn(async () => ({ serverDeleted: true, signedOut: true, localCleared: true as const })),
  reset() {
    this.writes = [];
    this.session = true;
    this.failWrites = false;
    this.deleteAnonymousAccount.mockClear();
  },
};

const error = () => (fake.failWrites ? { message: 'failed', code: '500' } : null);

export const fakeClient = {
  auth: {
    getSession: jest.fn(async () => ({
      data: { session: fake.session ? { user: { id: USER_ID, is_anonymous: true } } : null },
      error: null,
    })),
  },
  from: jest.fn((table: string) => ({
    insert: async (row: Record<string, unknown>) => {
      fake.writes.push({ table, op: 'insert', row });
      return { data: null, error: error() };
    },
    update: (row: Record<string, unknown>) => ({
      eq: (column: string, value: unknown) => ({
        select: async () => {
          fake.writes.push({ table, op: 'update', row, filter: [column, value] });
          return fake.failWrites ? { data: null, error: error() } : { data: [{ id: USER_ID }], error: null };
        },
      }),
    }),
  })),
};

export const fakeSupabaseModule = {
  getSupabase: () => fakeClient,
  isSupabaseConfigured: () => false,
  deleteAnonymousAccount: () => fake.deleteAnonymousAccount(),
};
