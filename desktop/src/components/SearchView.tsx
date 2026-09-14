import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, Trash2, Star, Loader2, Maximize2 } from 'lucide-react';

interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'image';
  timestamp: number;
  isStarred: boolean;
}

const PAGE_SIZE = 20;

const SearchView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClipboardItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const resultsRef = useRef<ClipboardItem[]>([]);
  const queryRef = useRef('');
  const observer = useRef<IntersectionObserver | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchResults = useCallback(async (isInitial = false) => {
    if (isLoadingRef.current || (!hasMoreRef.current && !isInitial)) return;
    if (!queryRef.current.trim()) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    const offset = isInitial ? 0 : resultsRef.current.length;

    try {
      const result = await window.ipcRenderer.invoke('history:search', { query: queryRef.current, offset, limit: PAGE_SIZE });
      
      if (isInitial) {
        setResults(result.items);
      } else {
        setResults(prev => [...prev, ...result.items]);
      }
      hasMoreRef.current = result.hasMore;
      setHasMore(result.hasMore);
      setHasSearched(true);
    } catch (error) {
      console.error('Failed to search history:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const observerTargetRef = useCallback((node: HTMLDivElement | null) => {
    if (observer.current) observer.current.disconnect();

    if (node) {
      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMoreRef.current && !isLoadingRef.current) {
            fetchResults();
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      );
      observer.current.observe(node);
    }
  }, [fetchResults]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setHasMore(true); // Reset hasMore for new search
      setResults([]);   // Clear old results
      fetchResults(true);
    }
  };

  const handleItemClick = (item: ClipboardItem) => {
    window.ipcRenderer.send('clipboard:paste-item', { content: item.content, type: item.type || 'text' });
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await window.ipcRenderer.invoke('history:remove', id);
    setResults(results.filter(item => item.id !== id));
  };

  const handleToggleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await window.ipcRenderer.invoke('history:toggle-star', id);
    setResults(results.map(item => 
      item.id === id ? { ...item, isStarred: !item.isStarred } : item
    ));
  };

  const hoverTimer = useRef<NodeJS.Timeout | null>(null);
  const isManualPreview = useRef(false);

  const handleMouseEnter = (item: ClipboardItem) => {
    handleMouseMove(item);
  };

  const handleMouseMove = (item: ClipboardItem) => {
    if (item.type === 'image' || !item.content || item.content.trim() === '') return;
    
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    } else if (!isManualPreview.current) {
      window.ipcRenderer.send('preview:hide', { id: item.id, isManual: false });
    }
    
    hoverTimer.current = setTimeout(() => {
      if (!isManualPreview.current) {
        window.ipcRenderer.send('preview:show', { id: item.id, content: item.content, isManual: false });
      }
      hoverTimer.current = null;
    }, 1500);
  };

  const handleMouseLeave = (item: ClipboardItem) => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    
    if (!isManualPreview.current) {
      window.ipcRenderer.send('preview:hide', { id: item.id, isManual: false });
    }
  };

  const handleOpenPreview = (e: React.MouseEvent, item: ClipboardItem) => {
    e.stopPropagation();
    isManualPreview.current = true;
    window.ipcRenderer.send('preview:show', { id: item.id, content: item.content, isManual: true });
  };

  useEffect(() => {
    const listener = () => {
      isManualPreview.current = false;
    };
    window.ipcRenderer.on('preview:hidden', listener);
    return () => {
      window.ipcRenderer.off('preview:hidden', listener);
    };
  }, []);

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} mins ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} hours ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex flex-col p-4 animate-in fade-in duration-500">
      <div className="sticky top-0 z-10 -mx-4 mb-6 bg-white dark:bg-zinc-950 px-4 pt-1 pb-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type and press Enter to search..." 
            className="w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 py-3 pl-10 pr-4 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:border-zinc-300 dark:focus:border-zinc-500/50 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500/50"
          />
        </div>
      </div>

      <div className="space-y-3 pb-8">
        {hasSearched && results.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center pt-10 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No matches found for "{query}"</p>
          </div>
        ) : (
          <>
            {results.map((item) => (
              <div 
                key={item.id} 
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => handleMouseEnter(item)}
                onMouseMove={() => handleMouseMove(item)}
                onMouseLeave={() => handleMouseLeave(item)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/50 p-4 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800/80 active:scale-[0.98]"
              >
                {item.type === 'image' ? (
                  <div className="mb-2 max-h-40 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <img 
                      src={item.content} 
                      alt="Clipboard item" 
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-1">{item.content}</p>
                )}
                
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{formatTime(item.timestamp)}</span>
                  
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type !== 'image' && (
                      <button 
                        onClick={(e) => handleOpenPreview(e, item)}
                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                        title="Preview"
                      >
                        <Maximize2 size={14} />
                      </button>
                    )}
                    <button 
                      onClick={(e) => handleToggleStar(e, item.id)}
                      className={`transition-colors ${item.isStarred ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                    >
                      <Star size={14} fill={item.isStarred ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={(e) => handleRemove(e, item.id)}
                      className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Scroll Target & End Indicator */}
            {hasMore ? (
              <div ref={observerTargetRef} className="h-20 flex items-center justify-center">
                {isLoading && <Loader2 className="animate-spin text-zinc-600" size={20} />}
              </div>
            ) : results.length > 0 ? (
              <div className="pt-10 pb-20 flex flex-col items-center justify-center text-center">
                <div className="h-[1px] w-12 bg-zinc-200 dark:bg-zinc-800 mb-4" />
                <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600">
                  End of results
                </p>
              </div>
            ) : null}
          </>
        )}
        
        {!hasSearched && !isLoading && (
          <div className="flex flex-col items-center justify-center pt-10 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">Search through your local clipboard history.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;
