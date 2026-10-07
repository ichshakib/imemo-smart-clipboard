import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2, Star, Loader2, Maximize2, Clock } from 'lucide-react';

interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'image';
  timestamp: number;
  isStarred: boolean;
}

const PAGE_SIZE = 20;

const HistoryView: React.FC = () => {
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
      const result = await window.ipcRenderer.invoke('history:get', { offset, limit: PAGE_SIZE });
      
      if (isInitial) {
        setItems(result.items);
      } else {
        setItems(prev => {
          const merged = [...prev, ...result.items];
          const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
          return unique.sort((a, b) => b.timestamp - a.timestamp);
        });
      }
      hasMoreRef.current = result.hasMore;
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []); // Stable fetchItems

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
    // After removal, it's safer to just update the local state than refetch everything
    setItems(items.filter(item => item.id !== id));
  };

  const handleToggleStar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await window.ipcRenderer.invoke('history:toggle-star', id);
    setItems(items.map(item => item.id === id ? { ...item, isStarred: !item.isStarred } : item));
  };

  const getSnippet = (text: string) => {
    if (!text) return '';
    const singleLine = text.replace(/[\r\n\t]+/g, ' ').trim();
    return singleLine.length > 140 ? singleLine.slice(0, 140) + '…' : singleLine;
  };

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
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

  // Fetch initial history on mount and listen for real-time updates & window events
  useEffect(() => {
    fetchItems(true);

    const hidePreviewListener = () => {
      isManualPreview.current = false;
    };
    
    const windowShownListener = () => {
      fetchItems(true);
    };

    const historyUpdatedListener = (_event: unknown, updatedHistory?: ClipboardItem[]) => {
      if (Array.isArray(updatedHistory)) {
        setItems(updatedHistory.slice(0, PAGE_SIZE));
        hasMoreRef.current = updatedHistory.length > PAGE_SIZE;
        setHasMore(updatedHistory.length > PAGE_SIZE);
      } else {
        fetchItems(true);
      }
    };

    window.ipcRenderer.on('preview:hidden', hidePreviewListener);
    window.ipcRenderer.on('window:shown', windowShownListener);
    window.ipcRenderer.on('history:updated', historyUpdatedListener);
    
    return () => {
      window.ipcRenderer.off('preview:hidden', hidePreviewListener);
      window.ipcRenderer.off('window:shown', windowShownListener);
      window.ipcRenderer.off('history:updated', historyUpdatedListener);
    };
  }, [fetchItems]);

  return (
    <div className="flex flex-col">
      {items.length === 0 && !isLoading ? (
        <div className="empty-state-box">
          <Clock size={22} className="empty-state-icon" />
          <p className="empty-state-title">History is empty</p>
          <p className="empty-state-desc">Copied items will appear here</p>
        </div>
      ) : (
        <div className="clipboard-list-container">
          {items.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => handleMouseEnter(item)}
              onMouseMove={() => handleMouseMove(item)}
              onMouseLeave={() => handleMouseLeave(item)}
              className="clipboard-card"
            >
              {item.type === 'image' ? (
                <div className="clipboard-card-image">
                  <img 
                    src={item.content} 
                    alt="Clipboard item" 
                    className="w-full object-contain"
                  />
                </div>
              ) : (
                <p className="clipboard-card-text">
                  {getSnippet(item.content)}
                </p>
              )}
              
              <div className="clipboard-card-footer">
                <span className="timestamp-text">{formatTime(item.timestamp)}</span>
                
                <div className="clipboard-card-actions">
                  {item.type !== 'image' && (
                    <button 
                      type="button"
                      onClick={(e) => handleOpenPreview(e, item)}
                      className="clipboard-action-btn"
                      title="Preview"
                    >
                      <Maximize2 size={13} />
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={(e) => handleToggleStar(e, item.id)}
                    className={`clipboard-action-btn ${item.isStarred ? 'starred' : ''}`}
                    title={item.isStarred ? "Starred" : "Star"}
                  >
                    <Star size={13} fill={item.isStarred ? "currentColor" : "none"} />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => handleRemove(e, item.id)}
                    className="clipboard-action-btn delete"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Scroll Target & End Indicator */}
          {hasMore ? (
            <div ref={observerTargetRef} className="loading-indicator">
              {isLoading && <Loader2 className="animate-spin" size={16} />}
            </div>
          ) : items.length > 0 ? (
            <div className="end-indicator">
              <span>End of history</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default HistoryView;
