import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search as SearchIcon, Trash2, Star, Loader2, Maximize2, X } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(false);
  const resultsRef = useRef<ClipboardItem[]>([]);
  const queryRef = useRef('');
  const observer = useRef<IntersectionObserver | null>(null);

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
    const trimmed = queryRef.current.trim();
    if (!trimmed) {
      setResults([]);
      setHasMore(false);
      return;
    }

    if (isLoadingRef.current || (!hasMoreRef.current && !isInitial)) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    const offset = isInitial ? 0 : resultsRef.current.length;

    try {
      const result = await window.ipcRenderer.invoke('history:search', { 
        query: trimmed, 
        offset, 
        limit: PAGE_SIZE 
      });
      
      if (isInitial) {
        setResults(result.items || []);
      } else {
        setResults(prev => [...prev, ...(result.items || [])]);
      }
      hasMoreRef.current = !!result.hasMore;
      setHasMore(!!result.hasMore);
    } catch (error) {
      console.error('Failed to search history:', error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  // Debounced live search only when typing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchResults(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

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

  const getSnippet = (text: string) => {
    if (!text) return '';
    return text.replace(/[\r\n\t]+/g, ' ').trim();
  };

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="flex flex-col">
      {/* Search Bar Container */}
      <div className="search-header-bar">
        <div className="search-input-box">
          <div className="search-input-icon-svg">
            <SearchIcon size={14} />
          </div>
          <input 
            type="text" 
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clipboard..." 
            className="search-field-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="search-clear-btn"
              title="Clear"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {!query.trim() ? (
        <div className="empty-state-box">
          <SearchIcon size={24} className="empty-state-icon" />
          <p className="empty-state-title">Search Clipboard</p>
          <p className="empty-state-desc">Type keywords to find text or images in your history</p>
        </div>
      ) : results.length === 0 && !isLoading ? (
        <div className="empty-state-box">
          <p className="empty-state-title">No matches found</p>
          <p className="empty-state-desc">No items matched &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="clipboard-list-container">
          {results.map((item) => (
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
          ) : results.length > 0 ? (
            <div className="end-indicator">
              <span>End of results</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchView;
