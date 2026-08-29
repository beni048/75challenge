import React, { Suspense } from 'react';
import JoinClient from './JoinClient';

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>Loading squad invite...</div>}>
      <JoinClient />
    </Suspense>
  );
}
