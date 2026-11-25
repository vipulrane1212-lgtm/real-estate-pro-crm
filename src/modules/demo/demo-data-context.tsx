'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DemoDataContextType {
  showDemoData: boolean;
  setShowDemoData: (value: boolean) => void;
  toggleDemoData: () => void;
  isDemoLoaded: boolean;
  isLoadingStatus: boolean;
  refreshDemoStatus: () => Promise<void>;
  seedDemoData: () => Promise<boolean>;
  resetDemoData: () => Promise<boolean>;
}

const DemoDataContext = createContext<DemoDataContextType | undefined>(undefined);

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  // Default to true so client showcase works immediately out of the box
  const [showDemoData, setShowDemoDataState] = useState<boolean>(true);
  const [isDemoLoaded, setIsDemoLoaded] = useState<boolean>(true);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);

  // Initialize from localStorage or cookie on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('diksha_show_demo_data');
      if (stored !== null) {
        setShowDemoDataState(stored === 'true');
      } else {
        localStorage.setItem('diksha_show_demo_data', 'true');
        document.cookie = 'diksha_demo_mode=true; path=/; max-age=31536000; SameSite=Lax';
      }
    } catch {
      // ignore SSR/security restrictions
    }
  }, []);

  const refreshDemoStatus = useCallback(async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch('/api/demo/manage');
      if (res.ok) {
        const data = await res.json();
        setIsDemoLoaded(Boolean(data.isDemoLoaded));
      }
    } catch (err) {
      console.warn('Failed to fetch demo status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    refreshDemoStatus();
  }, [refreshDemoStatus]);

  const setShowDemoData = useCallback((val: boolean) => {
    setShowDemoDataState(val);
    try {
      localStorage.setItem('diksha_show_demo_data', String(val));
      document.cookie = `diksha_demo_mode=${val ? 'true' : 'false'}; path=/; max-age=31536000; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent('diksha_demo_toggle', { detail: val }));
    } catch {
      // ignore
    }
  }, []);

  const toggleDemoData = useCallback(() => {
    setShowDemoData(!showDemoData);
  }, [showDemoData, setShowDemoData]);

  const seedDemoData = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/demo/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      if (res.ok) {
        setShowDemoData(true);
        await refreshDemoStatus();
        return true;
      }
    } catch (err) {
      console.error('Failed to seed demo data:', err);
    }
    return false;
  }, [setShowDemoData, refreshDemoStatus]);

  const resetDemoData = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/demo/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      if (res.ok) {
        setShowDemoData(false);
        await refreshDemoStatus();
        return true;
      }
    } catch (err) {
      console.error('Failed to reset demo data:', err);
    }
    return false;
  }, [setShowDemoData, refreshDemoStatus]);

  return (
    <DemoDataContext.Provider
      value={{
        showDemoData,
        setShowDemoData,
        toggleDemoData,
        isDemoLoaded,
        isLoadingStatus,
        refreshDemoStatus,
        seedDemoData,
        resetDemoData,
      }}
    >
      {children}
    </DemoDataContext.Provider>
  );
}

export function useDemoData() {
  const context = useContext(DemoDataContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      showDemoData: true,
      setShowDemoData: () => {},
      toggleDemoData: () => {},
      isDemoLoaded: true,
      isLoadingStatus: false,
      refreshDemoStatus: async () => {},
      seedDemoData: async () => false,
      resetDemoData: async () => false,
    };
  }
  return context;
}
