'use client';

import {
  type ReactNode,
  createContext,
  useContext,
  useState,
} from 'react';

/* ---------- Context ---------- */
interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs composants doivent être dans <Tabs>');
  return ctx;
}

/* ---------- Tabs ---------- */
interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ defaultTab, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ---------- TabList ---------- */
interface TabListProps {
  children: ReactNode;
  className?: string;
}

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div
      role="tablist"
      className={`
        flex gap-1 border-b border-divider
        overflow-x-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/* ---------- Tab ---------- */
interface TabProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function Tab({ id, children, className = '' }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${id}`}
      onClick={() => setActiveTab(id)}
      className={`
        relative px-5 py-3
        text-base font-semibold capitalize
        whitespace-nowrap
        transition-colors duration-300
        cursor-pointer
        ${isActive ? 'text-accent' : 'text-text hover:text-primary'}
        ${className}
      `}
    >
      {children}
      {/* Active indicator */}
      <span
        className={`
          absolute bottom-0 left-0 right-0 h-0.5
          bg-accent
          transition-transform duration-300 origin-left
          ${isActive ? 'scale-x-100' : 'scale-x-0'}
        `}
        aria-hidden="true"
      />
    </button>
  );
}

/* ---------- TabPanel ---------- */
interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ id, children, className = '' }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== id) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      className={`animate-fade-in ${className}`}
    >
      {children}
    </div>
  );
}
