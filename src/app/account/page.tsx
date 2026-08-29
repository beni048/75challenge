import { Suspense } from 'react';
import AccountClient from './AccountClient';

export default function AccountPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <AccountClient />
    </Suspense>
  );
}
