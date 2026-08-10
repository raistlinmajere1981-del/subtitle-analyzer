import { BrowserWindow, shell } from 'electron';

export interface MainWindowOptions {
  preloadPath: string;
  rendererEntry: string | undefined;
  rendererHtmlPath: string;
}

export function createMainWindow(options: MainWindowOptions): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1120,
    minHeight: 720,
    title: 'Subtitle Analyzer',
    backgroundColor: '#f5f3ee',
    show: false,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setMenu(null);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  if (options.rendererEntry) {
    void mainWindow.loadURL(options.rendererEntry);
  } else {
    void mainWindow.loadFile(options.rendererHtmlPath);
  }
}
