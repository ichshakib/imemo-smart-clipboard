import { useState, useEffect } from 'react'
import Navbar, { TabId } from './components/Navbar'
import HistoryView from './components/HistoryView'
import StarredView from './components/StarredView'
import SearchView from './components/SearchView'
import SettingsView from './components/SettingsView'

import Preview from './components/Preview'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('history')
  const isPreviewMode = window.location.search.includes('mode=preview')

  useEffect(() => {
    const fetchTheme = async () => {
      const s = await window.ipcRenderer.invoke('settings:get');
      if (s?.theme) applyTheme(s.theme);
    };
    fetchTheme();

    const listener = (_event: Electron.IpcRendererEvent, newSettings: { theme?: 'light' | 'dark' | 'system' }) => {
      if (newSettings?.theme) {
        applyTheme(newSettings.theme);
      }
    };
    
    window.ipcRenderer.on('settings:updated', listener);
    return () => {
      window.ipcRenderer.off('settings:updated', listener);
    };
  }, []);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };


  const renderView = () => {
    if (isPreviewMode) return <Preview />
    
    switch (activeTab) {
      case 'history':
        return <HistoryView />
      case 'starred':
        return <StarredView />
      case 'search':
        return <SearchView />
      case 'settings':
        return <SettingsView />
      default:
        return <HistoryView />
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans transition-colors duration-300">
      {!isPreviewMode && <Navbar activeTab={activeTab} onTabChange={setActiveTab} />}
      
      <main className="flex-1 overflow-y-auto no-drag">
        <div className={isPreviewMode ? "h-full" : "mx-auto h-full max-w-lg"}>
          {renderView()}
        </div>
      </main>
      
      {!isPreviewMode && (
        <div className="pointer-events-none fixed bottom-0 left-0 h-12 w-full bg-gradient-to-t from-white dark:from-zinc-950 to-transparent opacity-60" />
      )}
    </div>
  )
}

export default App
