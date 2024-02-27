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
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  systemPreferences,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import * as util from './util';
import AIImageFetcher from './AIImageFetcher';
import ImageSlicer from './ImageSlicer';
import Segmind from './Segmind';
import { getTmpFolderPath } from './LocalPath';

// 環境設定をロード
const environmentConfig = require(`../../env/env.${process.env.NODE_ENV}.js`); // eslint-disable-line

// AIFetcherクラスのインスタンスを作成
const aiImageFetcher = new AIImageFetcher();
aiImageFetcher.setEnvironmentConfig(environmentConfig);

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let subWindow: BrowserWindow | null = null;
let faceImageURL: string | null = path.join(getTmpFolderPath(), 'harry.jpg');
let generating = false;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// 画像の人間判定を行う実行関数
async function detectImage(srcImgPath: string, imagePaths: string[]) {
  const dataUrls = imagePaths.map((imagePath) => {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    return `data:image/jpeg;base64,${base64Image}`;
  });

  // console.log('mainWindow', mainWindow);

  if (mainWindow) {
    mainWindow.webContents.send('human-check', { srcImgPath, dataUrls });
  }
}

// 画像の人間判定
const performHumanDetection = async (imagePath: string) => {
  // ここにHumanDetectionの人間判定のロジックを実装
  const imagePathsModified = [];

  for (let i = 0; i < 4; i++) {
    imagePathsModified.push(imagePath.replace('.jpg', `_${i + 1}.jpg`));
    console.log(`人間判定を実行: ${imagePathsModified[i]}`);
  }
  detectImage(imagePath.replace('__.jpg', `.jpg`), imagePathsModified);
};

const ErrorHandler = (error: Error) => {
  mainWindow?.webContents.send('generate-complete', {
    dataUrl: ``,
  });
  subWindow?.webContents.send('generate-complete');
  generating = false;
};

// 画像生成開始
const startGenerating = async () => {
  if (generating) {
    console.log('既に生成中です。');
    return;
  }
  generating = true;
  mainWindow?.webContents.send('generate-start');

  let outputFolder = '';
  try {
    outputFolder = await aiImageFetcher.getAIImageRequest();
    console.log('outputFolder', outputFolder);
  } catch (error) {
    console.error('AI画像取得リクエストでエラーが発生しました:', error);
    ErrorHandler(error);
  }

  // 画像を分割して保存
  const sliceImgPartical = async (_srcPath: string, _outputPath: string) => {
    const image = await require('sharp')(_srcPath).metadata();
    const width = image.width * 0.65; // 横幅の65%
    const height = image.height * 0.65; // 縦幅の65%
    const positions = [
      { top: 0, left: 0 }, // 左上
      { top: 0, left: image.width - width }, // 右上
      { top: image.height - height, left: 0 }, // 左下
      { top: image.height - height, left: image.width - width }, // 右下
    ];

    await Promise.all(
      positions.map(async (pos, index) => {
        const outputPathModified = _outputPath.replace(
          '.jpg',
          `_${index + 1}.jpg`,
        );
        return ImageSlicer.crop(
          _srcPath,
          outputPathModified,
          pos.top,
          pos.left,
          width,
          height,
        );
      }),
    );
  };

  // 画像ファイルのリストを取得して、それぞれを分割
  fs.readdir(outputFolder, (err, files) => {
    if (err) {
      console.error('Error fetching files:', err);
      return;
    }
    files.forEach(async (file) => {
      if (file.endsWith('.jpg')) {
        const srcPath = path.join(outputFolder, file);
        const outputPath = srcPath.replace('.jpg', '__.jpg');

        // 画像を分割して保存
        await sliceImgPartical(srcPath, outputPath);
        console.log('分割完了');
        await performHumanDetection(outputPath);
      }
    });
  });
};

// AI画像の取得リクエスト
// IPCイベントリスナー内でAIFetcherを使用
ipcMain.on('get-aiimage', async (event) => {
  startGenerating();
  // event.reply('get-aiimage-reply', 'Image fetch initiated');
});

// AI画像の取得リクエスト
// IPCイベントリスナー内でAIFetcherを使用
ipcMain.on('get-aiimage-retry', async (event) => {
  generating = false;
  startGenerating();
  // event.reply('get-aiimage-reply', 'Image fetch initiated');
});

const sliceHumanImg = async (
  srcPath: string,
  outputPath: string,
  bbox: number[],
) => {
  await ImageSlicer.crop(
    srcPath,
    outputPath,
    bbox[1],
    bbox[0],
    bbox[2],
    bbox[3],
  );
};

const compositeImg = async (
  srcPath: string,
  humanPath: string,
  bbox: number[],
  outputPath: string,
) => {
  // ベース画像に合成する画像を重ねる
  await require('sharp')(humanPath)
    .resize(bbox[2], bbox[3])
    .toBuffer()
    .then((resizedOverlayBuffer) => {
      // リサイズしたオーバーレイ画像をベース画像に合成
      return require('sharp')(srcPath)
        .composite([
          {
            input: resizedOverlayBuffer,
            left: bbox[0],
            top: bbox[1],
            blend: 'over',
          },
        ])
        .toFile(outputPath);
    })
    .then(() => {
      console.log('画像がリサイズされ、合成され、保存されました。');
    })
    .catch((err) => {
      console.error('画像のリサイズまたは合成中にエラーが発生しました:', err);
      ErrorHandler(error as Error);
    });
};

ipcMain.on('human-detected', async (event, data) => {
  console.log('human-detected', data);
  // console.log('data.srcImgPath', data.srcImgPath);
  // console.log('data.humanBBox', data.humanBBox);

  const humanImgPath = data.srcImgPath.replace('.jpg', '__human.jpg');

  await sliceHumanImg(data.srcImgPath, humanImgPath, data.humanBBox);
  console.log('human image sliced');

  const segmind = new Segmind();
  segmind.setEnvironmentConfig(environmentConfig);

  try {
    // ここでawaitを使用して、この処理が完了するまで待機します
    await segmind.getAIImageRequest(
      {
        input_face_image: faceImageURL,
        output_face_image: humanImgPath,
      },
      data.srcImgPath.replace('.jpg', '__swap.jpg'),
    );
  } catch (error) {
    ErrorHandler(error as Error);
  }

  await compositeImg(
    data.srcImgPath,
    data.srcImgPath.replace('.jpg', '__swap.jpg'),
    data.humanBBox,
    data.srcImgPath.replace('.jpg', '__output.jpg'),
  );
  console.log('composite image done');

  const base64Image = fs.readFileSync(
    data.srcImgPath.replace('.jpg', '__output.jpg'),
    { encoding: 'base64' },
  );

  mainWindow?.webContents.send('generate-complete', {
    dataUrl: `data:image/jpeg;base64,${base64Image}`,
  });
  subWindow?.webContents.send('generate-complete');
  generating = false;
});

ipcMain.on('save-screenshot', (event, data) => {
  const defaultPath = path.join(getTmpFolderPath(), `image-${Date.now()}.jpg`);
  console.log('Saving screenshot to', defaultPath);
  fs.writeFileSync(
    defaultPath,
    data.replace(/^data:image\/jpeg;base64,/, ''),
    'base64',
  );

  faceImageURL = defaultPath;
  console.log('faceImageURL', faceImageURL);

  startGenerating();
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

// // LeonardoAIの画像取得後の処理
// ipcMain.on('leonardo-image-fetched', async (event) => {
//   console.log('leonardo-image-fetched');
//   // await aiImageFetcher.getAIImageRequest();
//   // event.reply('get-aiimage-reply', 'Image fetch initiated');
// });

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

  mainWindow = new BrowserWindow({
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

  mainWindow.loadURL(util.resolveHtmlPath('index.html'));

  subWindow = new BrowserWindow({
    // show: false,
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

  subWindow.loadURL(util.resolveHtmlPath('control.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
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
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
