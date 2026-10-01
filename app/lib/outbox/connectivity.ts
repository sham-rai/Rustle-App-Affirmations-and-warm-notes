import * as Network from 'expo-network';

import type { Connectivity } from './types';

// Kept apart from the worker: expo-network is a native module, and the unit tests use a fake.

/** Online unless the OS says otherwise; Android's reachability probe can lag, so unknown counts as online. */
export function isOnlineState(state: Network.NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export const expoNetworkConnectivity: Connectivity = {
  async isOnline() {
    try {
      return isOnlineState(await Network.getNetworkStateAsync());
    } catch {
      return true; // let the request decide; a failure is retried anyway
    }
  },
  subscribe(listener) {
    const subscription = Network.addNetworkStateListener((state) => listener(isOnlineState(state)));
    return () => subscription.remove();
  },
};
