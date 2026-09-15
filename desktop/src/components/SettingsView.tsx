import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Keyboard, Zap, Loader2, Bell, Rocket } from 'lucide-react';

interface AppSettings {
  instantPaste: boolean;
  globalHotkey: string;
  startOnStartup: boolean;
  showNotifications: boolean;
  theme?: 'light' | 'dark' | 'system';
}

const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [version, setVersion] = useState<string>('0.0.0');

  useEffect(() => {
    const fetchSettings = async () => {
      const s = await window.ipcRenderer.invoke('settings:get');
      setSettings(s);
    };
    
    const fetchVersion = async () => {
      const v = await window.ipcRenderer.invoke('app:version');
      setVersion(v);
    };

    fetchSettings();
    fetchVersion();
  }, []);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    const saved = await window.ipcRenderer.invoke('settings:update', newSettings);
    setSettings(saved);
  }, [settings]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();

    const modifiers = [];
    if (e.ctrlKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    if (e.metaKey) modifiers.push('Cmd');

    // If it's just a modifier key, keep waiting
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const key = e.key.toUpperCase();
    const shortcut = [...modifiers, key].join('+');
    
    updateSetting('globalHotkey', shortcut);
    setIsRecording(false);
  }, [isRecording, updateSetting]);

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, handleKeyDown]);

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin text-zinc-500" size={32} />
      </div>
    );
  }

  return (
    <div className="settings-view animate-in fade-in duration-500">
      <h2 className="settings-header">Settings</h2>

      <div className="settings-section-title">General</div>
      <div className="settings-card-group">
        {/* Instant Paste */}
        <div 
          onClick={() => updateSetting('instantPaste', !settings.instantPaste)}
          className="settings-item-row clickable"
        >
          <div className="settings-item-left">
            <div className="settings-item-icon">
              <Zap size={16} />
            </div>
            <div className="settings-item-texts">
              <span className="settings-item-title">Instant Paste</span>
              <span className="settings-item-desc">Paste snippet immediately after selection</span>
            </div>
          </div>
          <div className={`switch-track ${settings.instantPaste ? 'active' : ''}`}>
            <div className="switch-thumb" />
          </div>
        </div>

        {/* Start on Startup */}
        <div 
          onClick={() => updateSetting('startOnStartup', !settings.startOnStartup)}
          className="settings-item-row clickable"
        >
          <div className="settings-item-left">
            <div className="settings-item-icon">
              <Rocket size={16} />
            </div>
            <div className="settings-item-texts">
              <span className="settings-item-title">Launch at Startup</span>
              <span className="settings-item-desc">Start iMemo when you log into Windows</span>
            </div>
          </div>
          <div className={`switch-track ${settings.startOnStartup ? 'active' : ''}`}>
            <div className="switch-thumb" />
          </div>
        </div>

        {/* Notifications */}
        <div 
          onClick={() => updateSetting('showNotifications', !settings.showNotifications)}
          className="settings-item-row clickable"
        >
          <div className="settings-item-left">
            <div className="settings-item-icon">
              <Bell size={16} />
            </div>
            <div className="settings-item-texts">
              <span className="settings-item-title">Desktop Notifications</span>
              <span className="settings-item-desc">Show alert banner when an item is copied</span>
            </div>
          </div>
          <div className={`switch-track ${settings.showNotifications ? 'active' : ''}`}>
            <div className="switch-thumb" />
          </div>
        </div>
      </div>

      <div className="settings-section-title">Shortcuts & Security</div>
      <div className="settings-card-group">
        {/* Hotkeys */}
        <div className="settings-item-row">
          <div className="settings-item-left">
            <div className="settings-item-icon">
              <Keyboard size={16} />
            </div>
            <div className="settings-item-texts">
              <span className="settings-item-title">Global Shortcut</span>
              <span className="settings-item-desc">Hotkey to toggle clipboard HUD</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`settings-shortcut-badge ${isRecording ? 'recording' : ''}`}>
              {isRecording ? 'Press keys...' : settings.globalHotkey}
            </span>
            <button 
              type="button"
              onClick={() => setIsRecording(!isRecording)}
              className="settings-btn"
            >
              {isRecording ? 'Cancel' : 'Change'}
            </button>
          </div>
        </div>

        {/* Privacy */}
        <div className="settings-item-row">
          <div className="settings-item-left">
            <div className="settings-item-icon">
              <Shield size={16} />
            </div>
            <div className="settings-item-texts">
              <span className="settings-item-title">Privacy Mode</span>
              <span className="settings-item-desc">Exclude sensitive password managers</span>
            </div>
          </div>
          <button 
            type="button"
            className="settings-btn"
          >
            Manage
          </button>
        </div>
      </div>

      <div className="settings-footer">
        iMemo Smart Clipboard v{version}
      </div>
    </div>
  );
};

export default SettingsView;
