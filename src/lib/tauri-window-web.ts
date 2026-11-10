export function getCurrentWindow() {
  return {
    setTitle: async (title: string) => {
      document.title = title;
    },
    hide: async () => {},
    show: async () => {},
    close: async () => {},
    minimize: async () => {},
    maximize: async () => {},
    unmaximize: async () => {},
    isMaximized: async () => false,
  };
}
