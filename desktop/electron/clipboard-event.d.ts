declare module 'clipboard-event' {
  const clipboardWatcher: {
    startListening(): boolean;
    stopListening(): boolean;
    on(event: 'change' | 'copy', callback: () => void): void;
  };
  export default clipboardWatcher;
}
