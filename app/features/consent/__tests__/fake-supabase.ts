// A stand-in for app/lib/supabase in the consent tests: an in-memory `users` row and `consents`
// table behind just the PostgREST calls the screens make, with no network. Use with
//   jest.mock('../../../lib/supabase', () => jest.requireActual('./fake-supabase').fakeSupabaseModule);
// and inspect or seed `fake` from this module.

export type Write = { table: string; op: 'insert' | 'update'; row: Record<string, unknown>; filter?: [string, unknown] };
type ConsentRow = { kind: string; withdrawn_at: string | null };

export const USER_ID = '00000000-0000-4000-8000-000000000001';

export const fake = {
  writes: [] as Write[],
  session: true,
  failWrites: false,
  failReads: false,
  ageConfirmedAt: null as string | null,
  consents: [] as ConsentRow[],
  deleteAnonymousAccount: jest.fn(async () => ({ serverDeleted: true, signedOut: true, localCleared: true as const })),
  reset() {
    this.writes = [];
    this.session = true;
    this.failWrites = false;
    this.failReads = false;
    this.ageConfirmedAt = null;
    this.consents = [];
    this.deleteAnonymousAccount.mockReset();
    this.deleteAnonymousAccount.mockImplementation(async () => ({ serverDeleted: true, signedOut: true, localCleared: true }));
  },
  /** Seeds an onboarding that stopped somewhere: age confirmed or not, some consents given. */
  seed(ageConfirmed: boolean, kinds: string[]) {
    this.ageConfirmedAt = ageConfirmed ? '2026-09-30T12:00:00.000Z' : null;
    this.consents = kinds.map((kind) => ({ kind, withdrawn_at: null }));
  },
};

const failure = { message: 'failed', code: '500' };

/** A thenable select: collects eq / is filters, resolves against the in-memory tables. */
class Select implements PromiseLike<{ data: unknown; error: unknown }> {
  private readonly filters: [string, unknown][] = [];
  private single = false;
  constructor(private readonly table: string) {}
  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }
  private run(): { data: unknown; error: unknown } {
    if (fake.failReads) return { data: null, error: failure };
    if (this.table === 'users') {
      const row = { id: USER_ID, age_confirmed_at: fake.ageConfirmedAt };
      return { data: this.single ? row : [row], error: null };
    }
    const rows = fake.consents
      .map((row) => ({ ...row, user_id: USER_ID }))
      .filter((row) => this.filters.every(([column, value]) => (row as Record<string, unknown>)[column] === value));
    return { data: rows, error: null };
  }
  then<A = { data: unknown; error: unknown }, B = never>(
    onFulfilled?: ((value: { data: unknown; error: unknown }) => A | PromiseLike<A>) | null,
    onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(onFulfilled, onRejected);
  }
}

export const fakeClient = {
  auth: {
    getSession: jest.fn(async () => ({
      data: { session: fake.session ? { user: { id: USER_ID, is_anonymous: true } } : null },
      error: null,
    })),
  },
  from: jest.fn((table: string) => ({
    select: () => new Select(table),
    insert: async (row: Record<string, unknown>) => {
      fake.writes.push({ table, op: 'insert', row });
      if (fake.failWrites) return { data: null, error: failure };
      if (table === 'consents') fake.consents.push({ kind: String(row.kind), withdrawn_at: null });
      return { data: null, error: null };
    },
    update: (row: Record<string, unknown>) => ({
      eq: (column: string, value: unknown) => ({
        select: async () => {
          fake.writes.push({ table, op: 'update', row, filter: [column, value] });
          if (fake.failWrites) return { data: null, error: failure };
          if (table === 'users' && typeof row.age_confirmed_at === 'string') fake.ageConfirmedAt = row.age_confirmed_at;
          return { data: [{ id: USER_ID }], error: null };
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
