'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

function getHeaders() {
  const fingerprint = typeof window !== 'undefined' ? localStorage.getItem('jade_fingerprint') : null;
  return {
    'Content-Type': 'application/json',
    ...(fingerprint ? { 'x-fingerprint': fingerprint } : {}),
  };
}

export interface ExperienceEntry {
  id: string;
  userId: string;
  type: 'work' | 'project' | 'internship';
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function useExperiences() {
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dirty = useRef<Map<string, { type?: 'work' | 'project' | 'internship'; data?: Record<string, unknown> }>>(new Map());

  const fetchExperiences = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/experience', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setExperiences(data);
      }
    } catch (error) {
      console.error('Failed to fetch experiences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createExperience = useCallback(async (type: 'work' | 'project' | 'internship', data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/experience', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type, data }),
      });
      if (res.ok) {
        const entry = await res.json();
        setExperiences((prev) => [entry, ...prev]);
        return entry as ExperienceEntry;
      }
      return null;
    } catch (error) {
      console.error('Failed to create experience:', error);
      return null;
    }
  }, []);

  const flushSave = useCallback(async (id: string) => {
    const payload = dirty.current.get(id);
    if (!payload) return;
    dirty.current.delete(id);
    timers.current.delete(id);

    setSaveStates((prev) => ({ ...prev, [id]: 'saving' }));
    try {
      const res = await fetch(`/api/experience/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const updated = await res.json();
        setExperiences((prev) => prev.map((e) => e.id === id ? updated : e));
        setSaveStates((prev) => ({ ...prev, [id]: 'saved' }));
      } else {
        setSaveStates((prev) => ({ ...prev, [id]: 'error' }));
      }
    } catch {
      setSaveStates((prev) => ({ ...prev, [id]: 'error' }));
      dirty.current.set(id, payload);
    }
  }, []);

  const updateExperience = useCallback((id: string, data: { type?: 'work' | 'project' | 'internship'; data?: Record<string, unknown> }) => {
    setExperiences((prev) => prev.map((e) => {
      if (e.id !== id) return e;
      const merged = { ...e };
      if (data.type !== undefined) merged.type = data.type;
      if (data.data !== undefined) merged.data = { ...e.data as Record<string, unknown>, ...data.data };
      return merged;
    }));

    const existing = dirty.current.get(id) || {};
    dirty.current.set(id, { ...existing, ...data });

    const existingTimer = timers.current.get(id);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => flushSave(id), 800);
    timers.current.set(id, timer);
  }, [flushSave]);

  const flushNow = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    flushSave(id);
  }, [flushSave]);

  const removeExperience = useCallback(async (id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    dirty.current.delete(id);

    setExperiences((prev) => prev.filter((e) => e.id !== id));
    try {
      await fetch(`/api/experience/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
    } catch (error) {
      console.error('Failed to delete experience:', error);
    }
  }, []);

  // Flush all pending saves on unmount
  useEffect(() => {
    return () => {
      for (const [id] of dirty.current) {
        const payload = dirty.current.get(id);
        if (!payload) continue;
        const headers = getHeaders();
        fetch(`/api/experience/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    experiences,
    isLoading,
    saveStates,
    fetchExperiences,
    createExperience,
    updateExperience,
    flushNow,
    removeExperience,
  };
}
