declare module 'clipboard-event' {
  const clipboardWatcher: {
    start(): void;
    stop(): void;
    on(event: 'copy', callback: () => void): void;
  };
  export default clipboardWatcher;
}
