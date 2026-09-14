import React from 'react';
import { Clock, Star, Search, Settings } from 'lucide-react';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}

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
    <nav className="sticky top-0 z-50 flex h-14 w-full items-center justify-around border-b border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-950 px-4 drag">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative flex h-full items-center px-4 transition-colors",
              isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
            title={tab.label}
          >
            <Icon size={20} />
            
            {isActive && (
              <span className="absolute bottom-0 left-0 h-[2px] w-full bg-zinc-900 dark:bg-zinc-100" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default Navbar;
