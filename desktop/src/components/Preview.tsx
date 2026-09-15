import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';

const Preview: React.FC = () => {
  const [content, setContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get ID from URL
    const params = new URLSearchParams(window.location.search);
    const windowId = params.get('id');
    const isManualParam = params.get('isManual') === 'true';

    const fetchInitialContent = async () => {
      try {
        const initial = await window.ipcRenderer.invoke('preview:get-content', windowId);
        if (initial) setContent(initial);
      } catch (err) {
        console.error('Failed to fetch initial content:', err);
      }
    };

    fetchInitialContent();

    const listener = (_: unknown, payload: { id: string, content: string }) => {
      if (isManualParam) {
        if (payload.id === windowId) {
          setContent(payload.content);
          setCopied(false);
        }
      } else {
        setContent(payload.content);
        setCopied(false);
      }
    };

    const clearListener = () => {
      if (!isManualParam) setContent(null);
    };

    window.ipcRenderer.on('preview:content', listener);
    window.ipcRenderer.on('preview:clear', clearListener);
    return () => {
      window.ipcRenderer.off('preview:content', listener);
      window.ipcRenderer.off('preview:clear', clearListener);
    };
  }, []);

  // Send content height resize request to main process
  useEffect(() => {
    if (content !== null && content !== undefined) {
      const reportHeight = () => {
        if (!bodyRef.current) return;
        const scrollH = bodyRef.current.scrollHeight;
        // Header height (34px) + body padding/borders (2px) + scrollH
        const totalHeight = 34 + 2 + scrollH;
        const params = new URLSearchParams(window.location.search);
        const windowId = params.get('id');
        window.ipcRenderer.send('preview:resize', { id: windowId, height: totalHeight });
      };

      requestAnimationFrame(reportHeight);
      const timer = setTimeout(reportHeight, 50);
      return () => clearTimeout(timer);
    }
  }, [content]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    const params = new URLSearchParams(window.location.search);
    const windowId = params.get('id');
    const isManual = params.get('isManual') === 'true';
    window.ipcRenderer.send('preview:hide', { id: windowId, isManual });
  };

  return (
    <div className="preview-container">
      {/* Header */}
      <div className="preview-header drag">
        <span className="preview-title">Preview</span>
        <div className="preview-header-actions no-drag">
          <button 
            type="button"
            onClick={handleCopy}
            className="preview-action-btn"
            title="Copy content"
            disabled={!content}
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
          <button 
            type="button"
            onClick={handleClose}
            className="preview-action-btn close"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body with Content and Padding */}
      <div ref={bodyRef} className="preview-body no-drag">
        {content === null ? (
          <div className="flex items-center justify-center h-full text-zinc-400 text-xs animate-pulse">
            Loading preview...
          </div>
        ) : content === '' ? (
          <div className="flex items-center justify-center h-full text-zinc-400 text-xs italic">
            No content to display
          </div>
        ) : content.startsWith('data:image/') ? (
          <div className="preview-image-container">
            <img 
              src={content} 
              alt="Preview" 
              className="preview-image" 
              onLoad={() => {
                if (bodyRef.current) {
                  const scrollH = bodyRef.current.scrollHeight;
                  const totalHeight = 34 + 2 + scrollH;
                  const params = new URLSearchParams(window.location.search);
                  const windowId = params.get('id');
                  window.ipcRenderer.send('preview:resize', { id: windowId, height: totalHeight });
                }
              }}
            />
          </div>
        ) : (
          <pre className="preview-text">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
};

export default Preview;
