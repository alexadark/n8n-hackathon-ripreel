"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEYS = {
  anthropic: "ripreel_anthropic_key",
  kie: "ripreel_kie_key",
} as const;

export type ApiKeyProvider = keyof typeof STORAGE_KEYS;

export interface ApiKeys {
  anthropic: string | null;
  kie: string | null;
}

export interface UseApiKeysReturn {
  keys: ApiKeys;
  isLoading: boolean;
  hasAllKeys: boolean;
  hasKey: (provider: ApiKeyProvider) => boolean;
  setKey: (provider: ApiKeyProvider, key: string) => void;
  clearKey: (provider: ApiKeyProvider) => void;
  clearAllKeys: () => void;
  getKeys: () => ApiKeys;
  getMaskedKey: (provider: ApiKeyProvider) => string | null;
}

/**
 * Hook for managing API keys in localStorage
 * Keys are required for all users - no fallback to default credentials
 */
export function useApiKeys(): UseApiKeysReturn {
  const [keys, setKeys] = useState<ApiKeys>({ anthropic: null, kie: null });
  const [isLoading, setIsLoading] = useState(true);

  // Load keys from localStorage on mount
  useEffect(() => {
    const loadKeys = () => {
      console.log("🔄 Loading API keys from localStorage...");
      const anthropic = localStorage.getItem(STORAGE_KEYS.anthropic);
      const kie = localStorage.getItem(STORAGE_KEYS.kie);
      console.log("🔑 Loaded keys:", {
        anthropic: anthropic ? `${anthropic.slice(0, 8)}... (${anthropic.length} chars)` : null,
        kie: kie ? `${kie.slice(0, 8)}... (${kie.length} chars)` : null
      });
      setKeys({ anthropic, kie });
      setIsLoading(false);
    };

    loadKeys();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.anthropic || e.key === STORAGE_KEYS.kie) {
        loadKeys();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setKey = useCallback((provider: ApiKeyProvider, key: string) => {
    const trimmedKey = key.trim();
    console.log(`🔑 setKey called for ${provider}:`, {
      keyLength: trimmedKey.length,
      storageKey: STORAGE_KEYS[provider]
    });
    if (trimmedKey) {
      try {
        localStorage.setItem(STORAGE_KEYS[provider], trimmedKey);
        console.log(`✅ localStorage.setItem successful for ${provider}`);
        // Verify it was saved
        const verified = localStorage.getItem(STORAGE_KEYS[provider]);
        console.log(`🔍 Verification - key saved:`, !!verified, `length:`, verified?.length);
        setKeys((prev) => ({ ...prev, [provider]: trimmedKey }));
      } catch (error) {
        console.error(`❌ Failed to save ${provider} key:`, error);
      }
    }
  }, []);

  const clearKey = useCallback((provider: ApiKeyProvider) => {
    localStorage.removeItem(STORAGE_KEYS[provider]);
    setKeys((prev) => ({ ...prev, [provider]: null }));
  }, []);

  const clearAllKeys = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.anthropic);
    localStorage.removeItem(STORAGE_KEYS.kie);
    setKeys({ anthropic: null, kie: null });
  }, []);

  const hasKey = useCallback(
    (provider: ApiKeyProvider) => {
      return !!keys[provider];
    },
    [keys]
  );

  const getKeys = useCallback(() => {
    return {
      anthropic: localStorage.getItem(STORAGE_KEYS.anthropic),
      kie: localStorage.getItem(STORAGE_KEYS.kie),
    };
  }, []);

  const getMaskedKey = useCallback(
    (provider: ApiKeyProvider) => {
      const key = keys[provider];
      if (!key) return null;
      if (key.length <= 8) return "****";
      return `${key.slice(0, 4)}...${key.slice(-4)}`;
    },
    [keys]
  );

  const hasAllKeys = !!keys.anthropic && !!keys.kie;

  return {
    keys,
    isLoading,
    hasAllKeys,
    hasKey,
    setKey,
    clearKey,
    clearAllKeys,
    getKeys,
    getMaskedKey,
  };
}

/**
 * Get API keys directly from localStorage (for use in non-hook contexts)
 * Use this when you need to get keys synchronously, e.g., before a server action
 */
export function getApiKeysFromStorage(): ApiKeys {
  if (typeof window === "undefined") {
    return { anthropic: null, kie: null };
  }
  return {
    anthropic: localStorage.getItem(STORAGE_KEYS.anthropic),
    kie: localStorage.getItem(STORAGE_KEYS.kie),
  };
}
