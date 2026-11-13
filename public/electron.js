const { app, BrowserWindow, ipcMain, screen, powerMonitor, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { getSystemInfo } = require('./systemInfo');

// We no longer need electron-is-dev
// const isDev = require('electron-is-dev');

app.commandLine.appendSwitch('disable-gpu-cache');
// Ensure rendering works reliably on fresh OS installs with generic/missing display drivers
app.commandLine.appendSwitch('disable-gpu');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  // Use the built-in 'isPackaged' property to check for production
  const startUrl = app.isPackaged
    ? `file://${path.join(__dirname, '../build/index.html')}`
    : 'http://localhost:3000';

  win.loadURL(startUrl);
}

app.whenReady().then(() => {
  ipcMain.handle('get-system-info', async () => {
    return await getSystemInfo({ screen, powerMonitor });
  });

  ipcMain.handle('save-report-file', async (_event, { defaultName, content }) => {
    const result = await dialog.showSaveDialog({
      title: 'Save Hardware Report',
      defaultPath: defaultName || 'laptop-hardware-report.txt',
      filters: [
        { name: 'Text Report', extensions: ['txt'] },
        { name: 'JSON File', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) {
      return { saved: false };
    }
    fs.writeFileSync(result.filePath, content, 'utf8');
    return { saved: true, filePath: result.filePath };
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});