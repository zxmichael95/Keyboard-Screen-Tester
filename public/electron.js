const { app, BrowserWindow } = require('electron');
const path = require('path');

// We no longer need electron-is-dev
// const isDev = require('electron-is-dev');

app.commandLine.appendSwitch('disable-gpu-cache');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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

app.whenReady().then(createWindow);

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