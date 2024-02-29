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

/** 環境設定をロード */
const environmentConfig = require(`../../env/env.${process.env.NODE_ENV}.js`); // eslint-disable-line

/** AIFetcherクラスのインスタンス */
const aiImageFetcher = new AIImageFetcher();
aiImageFetcher.setEnvironmentConfig(environmentConfig);

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

/** AI画像生成ウィンドウ */
let mainWindow: BrowserWindow | null = null;
/** コントロールウィンドウ */
let subWindow: BrowserWindow | null = null;

/** 顔画像のURL */
let faceImageURL: string | null = null;

/** 画像生成中かどうかのフラグ */
let generating = false;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

/**
 * アプリをリロードする関数
 */
const reloadApp = () => {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((window) => {
    window.reload();
  });
};

ipcMain?.on('reload-app', () => {
  reloadApp();
});

/**
 * 分割された画像の人間判定を行う実行関数
 */
async function detectHumanImage(srcImgPath: string, imagePaths: string[]) {
  const dataUrls = imagePaths.map((imagePath) => {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    return `data:image/jpeg;base64,${base64Image}`;
  });

  mainWindow?.webContents.send('human-check', { srcImgPath, dataUrls });
}

/**
 *  画像の人間判定
 * @param imagePath
 */
const performHumanDetection = async (imagePath: string) => {
  /** 判定用に分割した画像のパスを格納する配列 */
  const imagePathsModified = [];

  for (let i = 0; i < 4; ++i) {
    imagePathsModified.push(imagePath.replace('.jpg', `_${i + 1}.jpg`));
    // console.log(`人間判定を実行: ${imagePathsModified[i]}`);
  }

  // 分割した画像の人間判定を実行
  detectHumanImage(imagePath.replace('__.jpg', `.jpg`), imagePathsModified);
};

/**
 * 生成中にエラーが発生した場合の処理
 */
const ErrorHandler = () => {
  mainWindow?.webContents.send('generate-complete', {
    dataUrl: ``,
  });
  subWindow?.webContents.send('generate-complete');
  generating = false;

  reloadApp();
};

/**
 * AI画像生成開始
 * @returns
 */
const startGenerating = async () => {
  if (generating) {
    console.log('既に生成中です。');
    return;
  }
  generating = true;

  mainWindow?.webContents.send('generate-start');

  subWindow?.webContents.send('log', { txt: 'Start Generating...' });

  let outputFolder = '';
  try {
    outputFolder = await aiImageFetcher.getAIImageRequest();
    console.log('outputFolder', outputFolder);
  } catch (error) {
    console.error('AI画像取得リクエストでエラーが発生しました:', error);
    subWindow?.webContents.send('log', {
      txt: 'AI画像取得リクエストでエラーが発生しました',
    });
    ErrorHandler();
  }

  /**
   * 画像を4分割して保存
   * @param _srcPath 元画像のパス
   * @param _outputPath 保存先のパス
   */
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

        // 画像分割する関数を呼び出し
        await sliceImgPartical(srcPath, outputPath);
        console.log('分割完了');
        subWindow?.webContents.send('log', {
          txt: 'Image Split Done',
        });

        // 分割した画像から人間判定を呼び出し
        await performHumanDetection(outputPath);
      }
    });
  });
};

// AI画像の取得リクエスト
ipcMain.on('get-aiimage', async (event) => {
  startGenerating();
  // event.reply('get-aiimage-reply', 'Image fetch initiated');
});

// AI画像の取得リクエスト リトライ
ipcMain.on('get-aiimage-retry', async (event) => {
  generating = false;
  startGenerating();
  subWindow?.webContents.send('log', {
    txt: 'Retry Generating...',
  });
  // event.reply('get-aiimage-reply', 'Image fetch initiated');
});

/**
 * 画像から人間の部分を切り抜く関数
 * @param srcPath 元画像のパス
 * @param outputPath 保存先のパス
 * @param bbox 切り抜く範囲
 */
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

/**
 * Swapした画像をリサイズして、元画像に合成する
 * @param srcPath
 * @param humanPath
 * @param bbox
 * @param outputPath
 */
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
    .then((resizedOverlayBuffer: any) => {
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
      subWindow?.webContents.send('log', {
        txt: 'Image has been resized, and saved.',
      });
    })
    .catch((error: Error) => {
      console.error('画像のリサイズまたは合成中にエラーが発生しました:', error);
      ErrorHandler();
      subWindow?.webContents.send('log', {
        txt: 'An error occurred while resizing or compositing the image.',
      });
    });
};

/**
 * メインウインドウで人間判定された際に呼び出される関数
 */
ipcMain.on('human-detected', async (event, data) => {
  console.log('human-detected', data);
  subWindow?.webContents.send('log', {
    txt: 'Human Detected',
  });
  // console.log('data.srcImgPath', data.srcImgPath);
  // console.log('data.humanBBox', data.humanBBox);

  const humanImgPath = data.srcImgPath.replace('.jpg', '__human.jpg');

  await sliceHumanImg(data.srcImgPath, humanImgPath, data.humanBBox);
  console.log('human image sliced');
  subWindow?.webContents.send('log', {
    txt: 'Human Image Sliced',
  });

  /** Segmindクラスのインスタンス */
  const segmind = new Segmind();
  segmind.setEnvironmentConfig(environmentConfig);

  subWindow?.webContents.send('log', {
    txt: 'FaceSwap Start',
  });

  try {
    // Segmindの顔SWAPのリクエストを行う
    await segmind.getSwapImageRequest(
      {
        input_face_image:
          faceImageURL ?? path.join(getTmpFolderPath(), 'harry.jpg'),
        output_face_image: humanImgPath,
      },
      data.srcImgPath.replace('.jpg', '__swap.jpg'),
    );
  } catch (error) {
    // console.log('FaceSwap Error:', error);
    console.error('SWAP画像取得リクエストでエラーが発生しました:', error.code);
    subWindow?.webContents.send('log', {
      txt: 'AI画像取得リクエストでエラーが発生しました',
    });

    ErrorHandler();
    return;
  }

  subWindow?.webContents.send('log', {
    txt: 'Image Compositing Start',
  });

  // Swapした画像をリサイズして、元画像に合成する
  await compositeImg(
    data.srcImgPath,
    data.srcImgPath.replace('.jpg', '__swap.jpg'),
    data.humanBBox,
    data.srcImgPath.replace('.jpg', '__output.jpg'),
  );
  console.log('composite image done');

  // 合成した画像をメインウィンドウに送信
  const base64Image = fs.readFileSync(
    data.srcImgPath.replace('.jpg', '__output.jpg'),
    { encoding: 'base64' },
  );

  subWindow?.webContents.send('log', {
    txt: 'Generate Complete',
  });

  mainWindow?.webContents.send('generate-complete', {
    dataUrl: `data:image/jpeg;base64,${base64Image}`,
  });
  subWindow?.webContents.send('generate-complete');

  // 生成中フラグをfalseにする
  generating = false;
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
    subWindow?.close();
    subWindow = null;
    app.quit();
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
