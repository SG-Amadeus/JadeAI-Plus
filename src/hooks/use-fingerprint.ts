'use client';

import { useEffect, useState } from 'react';
import { useRuntimeConfig } from '@/components/providers/runtime-config-provider';

const DEMO_FP = 'demo-fingerprint';

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { authEnabled } = useRuntimeConfig();

  useEffect(() => {
    if (authEnabled) {
      setIsLoading(false);
      return;
    }

    // When auth is disabled, always use demo-fingerprint so CLI and browser share the same user.
    // Overwrite any stale stored fingerprint from previous sessions.
    localStorage.setItem('jade_fingerprint', DEMO_FP);
    setFingerprint(DEMO_FP);
    setIsLoading(false);
  }, [authEnabled]);

  return { fingerprint, isLoading };
}
