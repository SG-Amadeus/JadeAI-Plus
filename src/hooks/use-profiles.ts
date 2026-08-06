'use client';

import { useState, useCallback } from 'react';

function getHeaders() {
  const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('jade_fingerprint') : null;
  return {
    'Content-Type': 'application/json',
    'x-profile-ui': '1',
    ...(fingerprint ? { 'x-fingerprint': fingerprint } : {}),
  };
}

interface Profile {
  id: string;
  userId: string;
  codename: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface CodenameEntry {
  id: string;
  codename: string;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [codenames, setCodenames] = useState<CodenameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profile', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCodenames = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('jade_fingerprint') : null;
      if (fingerprint) headers['x-fingerprint'] = fingerprint;
      const res = await fetch('/api/profile/codenames', { headers });
      if (res.ok) {
        const data = await res.json();
        setCodenames(data);
        return data as CodenameEntry[];
      }
    } catch (error) {
      console.error('Failed to fetch codenames:', error);
    }
    return [] as CodenameEntry[];
  }, []);

  const createProfile = useCallback(async (data: { codename: string; data: Record<string, unknown> }) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const profile = await res.json();
        setProfiles((prev) => [profile, ...prev]);
        return profile;
      }
      const err = await res.json().catch(() => ({}));
      return { error: (err as any).error || 'Failed to create profile' };
    } catch (error) {
      console.error('Failed to create profile:', error);
      return { error: 'Network error' };
    }
  }, []);

  const updateProfile = useCallback(async (id: string, data: { codename?: string; data?: Record<string, unknown> }) => {
    try {
      const res = await fetch(`/api/profile/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const profile = await res.json();
        setProfiles((prev) => prev.map((p) => p.id === id ? profile : p));
        return profile;
      }
      const err = await res.json().catch(() => ({}));
      return { error: (err as any).error || 'Failed to update profile' };
    } catch (error) {
      console.error('Failed to update profile:', error);
      return { error: 'Network error' };
    }
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/profile/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete profile:', error);
      return false;
    }
  }, []);

  return {
    profiles,
    codenames,
    isLoading,
    fetchProfiles,
    fetchCodenames,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
