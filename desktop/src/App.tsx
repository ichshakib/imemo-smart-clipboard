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
    const applySystemTheme = () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
      }
    }

    applySystemTheme()
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', applySystemTheme)
    return () => mql.removeEventListener('change', applySystemTheme)
  }, [])

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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 font-sans">
      {!isPreviewMode && <Navbar activeTab={activeTab} onTabChange={setActiveTab} />}
      
      <main className="flex-1 overflow-y-auto no-drag">
        <div className={isPreviewMode ? "h-full" : "w-full"}>
          {renderView()}
        </div>
      </main>
    </div>
  )
}

export default App
