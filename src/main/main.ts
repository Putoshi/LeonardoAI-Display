/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import fs from 'fs';
import electron, {
  app,
  BrowserWindow,
  globalShortcut,
  shell,
  ipcMain,
  dialog,
  systemPreferences,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import * as util from './util';
import { getTmpFolderPath, getConfigPath } from './LocalPath';
import AppUtils from './AppUtils';
import StateManager from './StateManager';
import WindowInstanceManager from './WindowInstanceManager';
import Generate from './Generate';
import { loadConfig } from './ConfigManager';

/** StateManagerクラスのインスタンス */
const stateManager = StateManager.getInstance();

/** WindowInstanceManagerクラスのインスタンス */
const windowInstanceManager = WindowInstanceManager.getInstance();

/**
 * AppUpdaterクラス
 */
class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

/**
 * ディスプレイ情報を取得する
 * @returns ディスプレイ情報
 */
const getDisplayInfo: any = () => {
  const electronScreen = electron.screen;
  const displays = electronScreen.getAllDisplays();
  for (var i in displays) {
    // if (displays[i].bounds.x != 0 || displays[i].bounds.y != 0) {
    //   externalDisplay = displays[i];
    //   break;
    // }
    console.log(displays[i]);
  }
  return displays;
};

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain?.on('reload-app', () => {
  AppUtils.reloadApp();
});

// AI画像の取得リクエスト
ipcMain.on('get-aiimage', async (event) => {
  Generate.start();
  // event.reply('get-aiimage-reply', 'Image fetch initiated');
});

// AI画像の取得リクエスト リトライ
ipcMain.on('get-aiimage-retry', async (event) => {
  stateManager.generating = false;
  Generate.start();
  windowInstanceManager.subWindow?.webContents.send('log', {
    txt: 'Retry Generating...',
  });
  // event.reply('get-aiimage-reply', 'Image fetch initiated');
});

/**
 * コンソール画面でWebcamから人間判定を受けた際画像を切り出す関数
 */
ipcMain.on('save-screenshot', (event, data) => {
  const defaultPath = path.join(getTmpFolderPath(), `image-${Date.now()}.jpg`);
  console.log('Saving screenshot to', defaultPath);
  fs.writeFileSync(
    defaultPath,
    data.replace(/^data:image\/jpeg;base64,/, ''),
    'base64',
  );

  stateManager.faceImageURL = defaultPath;
  console.log('faceImageURL', stateManager.faceImageURL);

  Generate.start();
  // const filePath = dialog.showSaveDialogSync({
  //   buttonLabel: 'Save image',
  //   defaultPath,
  // });

  // if (filePath) {
  //   console.log('Saving screenshot to', filePath);
  //   fs.writeFileSync(
  //     filePath,
  //     data.replace(/^data:image\/jpeg;base64,/, ''),
  //     'base64',
  //   );
  // }
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  windowInstanceManager.mainWindow = new BrowserWindow({
    show: false,
    width: 1080 / 2,
    height: 1920 / 2,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      // nodeIntegration: true,
      // contextIsolation: false, // nodeIntegration を有効にする場合は、contextIsolation を無効にする必要があります
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  /** メインウィンドウの設定 */
  windowInstanceManager.mainWindow.setAlwaysOnTop(true, 'screen-saver'); // 常に最前面に表示する
  windowInstanceManager.mainWindow.setVisibleOnAllWorkspaces(true); // ワークスペース（デスクトップ）を移動しても表示される
  windowInstanceManager.mainWindow.loadURL(util.resolveHtmlPath('index.html'));

  windowInstanceManager.subWindow = new BrowserWindow({
    // show: false,
    width: 1080 / 2,
    height: 1920 / 2,
    x: getDisplayInfo()[1].bounds.x + 50, // サブディスプレイのX座標 + 50
    y: getDisplayInfo()[1].bounds.y + 2500, // サブディスプレイのY座標 + 50
    icon: getAssetPath('icon.png'),
    webPreferences: {
      // nodeIntegration: true,
      // contextIsolation: false, // nodeIntegration を有効にする場合は、contextIsolation を無効にする必要があります
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  // setTimeout(() => {
  //   const x =
  //     getDisplayInfo()[0].workArea.x + getDisplayInfo()[0].workArea.width;
  //   console.log('x', x);
  //   windowInstanceManager.subWindow.x = x;
  // }, 3000);

  windowInstanceManager.subWindow.loadURL(util.resolveHtmlPath('control.html'));

  windowInstanceManager.mainWindow.on('ready-to-show', () => {
    if (!windowInstanceManager.mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      windowInstanceManager.mainWindow.minimize();
    } else {
      windowInstanceManager.mainWindow.show();
    }
  });

  windowInstanceManager.mainWindow.on('closed', () => {
    windowInstanceManager.mainWindow = null;
    app.quit();
  });

  const menuBuilder = new MenuBuilder(windowInstanceManager.mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  windowInstanceManager.mainWindow?.webContents.setWindowOpenHandler(
    (edata: any) => {
      shell.openExternal(edata.url);
      return { action: 'deny' };
    },
  );

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * グローバルショートカットの登録
 */
const registerGlobalShortcuts = async () => {
  // 設定ファイルを読み込む
  const config = await loadConfig();
  if (!config) {
    console.error('設定ファイルの読み込みに失敗しました');
    return;
  }
  // Option+Mキーでメインウィンドウをメインディスプレイにフルスクリーン表示
  globalShortcut.register('Option+M', () => {
    const displays = electron.screen.getAllDisplays();
    const primaryDisplay = displays[config.primaryDisplayIndex]; // メインディスプレイは通常、配列の最初の要素です
    if (primaryDisplay) {
      const isMainWindowFullScreen =
        windowInstanceManager.mainWindow?.isFullScreen();
      windowInstanceManager.mainWindow?.setBounds(primaryDisplay.bounds);
      windowInstanceManager.mainWindow?.setFullScreen(!isMainWindowFullScreen);
    }
  });

  // Option+Sキーでサブウィンドウをサブディスプレイにフルスクリーン表示
  globalShortcut.register('Option+S', () => {
    const displays = electron.screen.getAllDisplays();
    // サブディスプレイが存在する場合、それは通常配列の2番目の要素です（インデックス1）
    if (displays.length > 1) {
      const secondaryDisplay = displays[config.secondaryDisplayIndex];
      const isSubWindowFullScreen =
        windowInstanceManager.subWindow?.isFullScreen();
      windowInstanceManager.subWindow?.setBounds(secondaryDisplay.bounds);
      windowInstanceManager.subWindow?.setFullScreen(!isSubWindowFullScreen);
    }
  });
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    try {
      const accessGranted = await systemPreferences.askForMediaAccess('camera');
      console.log('success media access', accessGranted);
    } catch (e) {
      console.log('failed media access', e);
    }
    createWindow();
    app.on('activate', () => {
      if (windowInstanceManager.mainWindow === null) createWindow();
    });
  })
  .then(async () => {
    registerGlobalShortcuts();
  })
  .catch(console.log);
