import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { clearAgeBlockedForTests, markAgeBlocked } from '../../../features/consent/block-flag';
import { getSupabase } from '../../supabase';
import { useAuthBootstrap } from '../useAuthBootstrap';

// The client is never reached on a blocked install; a call to it would mean an account was made.
jest.mock('../../supabase', () => ({ getSupabase: jest.fn(() => null) }));
jest.mock('../../secure-storage/refresh-token-store', () => ({ getRefreshTokenStore: jest.fn(() => ({})) }));

let appStateListener: ((state: AppStateStatus) => void) | undefined;

beforeEach(() => {
  jest.mocked(getSupabase).mockClear();
  clearAgeBlockedForTests();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => jest.restoreAllMocks());

describe('useAuthBootstrap on an install the 18+ gate blocked (M1-09)', () => {
  it('creates no account and never retries', async () => {
    markAgeBlocked();
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => {});

    expect(result.current).toEqual({ status: 'failed', reason: 'blocked' });
    expect(getSupabase).not.toHaveBeenCalled();

    await act(async () => {
      appStateListener?.('active');
    });
    expect(getSupabase).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'failed', reason: 'blocked' });
  });

  it('runs the normal bootstrap otherwise', async () => {
    const { result } = renderHook(() => useAuthBootstrap());
    await act(async () => {});
    expect(getSupabase).toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'not_configured' });
  });
});
