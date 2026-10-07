import React from 'react';
import { Clock, Star, Search, Settings } from 'lucide-react';

export type TabId = 'history' | 'starred' | 'search' | 'settings';

interface TabItem {
  id: TabId;
  icon: React.ElementType;
  label: string;
}

const tabs: TabItem[] = [
  { id: 'history', icon: Clock, label: 'History' },
  { id: 'starred', icon: Star, label: 'Starred' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

interface NavbarProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-50 flex h-12 w-full items-center justify-center border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 drag select-none">
      <nav className="flex w-full items-center justify-around no-drag">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center py-2 px-4 transition-colors no-drag ${
                isActive
                  ? 'text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
              }`}
              title={tab.label}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-zinc-900 dark:bg-zinc-100 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

export default Navbar;

