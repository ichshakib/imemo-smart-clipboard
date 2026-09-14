import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Trash2, Loader2, Maximize2 } from 'lucide-react';

interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'image';
  timestamp: number;
  isStarred: boolean;
}

const PAGE_SIZE = 20;

const StarredView: React.FC = () => {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const itemsRef = useRef<ClipboardItem[]>([]);
  const observer = useRef<IntersectionObserver | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const fetchItems = useCallback(async (isInitial = false) => {
    if (isLoadingRef.current || (!hasMoreRef.current && !isInitial)) return;
    
    isLoadingRef.current = true;
    setIsLoading(true);
    const offset = isInitial ? 0 : itemsRef.current.length;
    
    try {
      // Note: We're still using history:get but we'll paginate and filter for efficiency
      // Ideally we'd have a dedicated starred IPC, but this works for the 100-item limit
      const result = await window.ipcRenderer.invoke('history:get', { offset: 0, limit: 100 });
      const starred = result.items.filter((item: ClipboardItem) => item.isStarred);
      
      const newBatch = starred.slice(offset, offset + PAGE_SIZE);
      
      if (isInitial) {
        setItems(newBatch);
      } else {
        setItems(prev => {
          const merged = [...prev, ...newBatch];
          const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
          return unique.sort((a, b) => b.timestamp - a.timestamp);
        });
      }
      const more = offset + PAGE_SIZE < starred.length;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (error) {
      console.error('Failed to fetch starred items:', error);
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
            fetchItems();
          }
        },
        { threshold: 0.1, rootMargin: '100px' }
      );
      observer.current.observe(node);
    }
  }, [fetchItems]);

  useEffect(() => {
    fetchItems(true);
  }, [fetchItems]);

  const handleItemClick = (item: ClipboardItem) => {
    window.ipcRenderer.send('clipboard:paste-item', { content: item.content, type: item.type || 'text' });
  };

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await window.ipcRenderer.invoke('history:remove', id);
    setItems(items.filter(item => item.id !== id));
  };

  const handleToggleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await window.ipcRenderer.invoke('history:toggle-star', id);
    setItems(items.filter(item => item.id !== id));
  };

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return 'Just now';
    return `${diff} mins ago`;
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

  return (
    <div className="flex flex-col p-4 animate-in fade-in duration-500">
      {items.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center p-10 h-[400px] text-center">
          <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-4 mb-4">
            <Star size={32} className="text-zinc-400 dark:text-zinc-600" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-2 border-none">No Favorites Yet</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-[200px]">
            Star important clipboard items to quickly access them here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {items.map((item) => (
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
                    className="text-zinc-900 dark:text-zinc-100 transition-colors"
                  >
                    <Star size={14} fill="currentColor" />
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
          ) : items.length > 0 ? (
            <div className="pt-10 pb-20 flex flex-col items-center justify-center text-center">
              <div className="h-[1px] w-12 bg-zinc-200 dark:bg-zinc-800 mb-4" />
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600">
                End of starred items
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default StarredView;
