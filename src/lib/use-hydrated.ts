'use client';

import { useSyncExternalStore } from 'react';

const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * True once the component has hydrated on the client.
 *
 * Used to gate anything that depends on browser-only state (localStorage, the
 * DOM, `matchMedia`) so the server and first client render agree. Built on
 * `useSyncExternalStore` rather than a mount effect, which keeps it out of the
 * cascading-render path.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, onClient, onServer);
}
