// 必要な依存関係のインポート
import fs from 'fs';
import path from 'path';
import { ipcMain } from 'electron';
import axios from 'axios';
import AIImageFetcher from './AIImageFetcher';
import ImageSlicer from './ImageSlicer';
import Segmind from './Segmind';
import { getTmpFolderPath } from './LocalPath';
import ErrorHandler from './ErrorHandler';
import StateManager from './StateManager';
import WindowInstanceManager from './WindowInstanceManager';

/** 環境設定をロード */
const environmentConfig = require(`../../env/env.${process.env.NODE_ENV}.js`); // eslint-disable-line

/** AIFetcherクラスのインスタンス */
const aiImageFetcher = new AIImageFetcher();
aiImageFetcher.setEnvironmentConfig(environmentConfig);

/** StateManagerクラスのインスタンス */
const stateManager = StateManager.getInstance();

/** WindowInstanceManagerクラスのインスタンス */
const windowInstanceManager = WindowInstanceManager.getInstance();

/**
 * AI画像生成開始
 * @returns
 */
const start = async (interpolatedFace: any) => {
  if (stateManager.generating) {
    console.log('既に生成中です。');
    return;
  }
  stateManager.generating = true;

  windowInstanceManager.mainWindow?.webContents.send('generate-start');

  windowInstanceManager.subWindow?.webContents.send('log', {
    txt: 'Start Generating...',
  });

  let outputFolder = '';
  try {
    outputFolder = await aiImageFetcher.getAIImageRequest(interpolatedFace);

    console.log('outputFolder', outputFolder);
  } catch (error) {
    console.error('AI画像取得リクエストでエラーが発生しました:', error);
    windowInstanceManager.subWindow?.webContents.send('log', {
      txt: 'AI画像取得リクエストでエラーが発生しました',
    });
    ErrorHandler.refresh();
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
        windowInstanceManager.subWindow?.webContents.send('log', {
          txt: 'Image Split Done',
        });

        // 分割した画像から人間判定を呼び出し
        await performHumanDetection(outputPath);
      }
    });
  });
};

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
 * 分割された画像の人間判定を行う実行関数
 */
async function detectHumanImage(srcImgPath: string, imagePaths: string[]) {
  const dataUrls = imagePaths.map((imagePath) => {
    const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
    return `data:image/jpeg;base64,${base64Image}`;
  });

  windowInstanceManager.mainWindow?.webContents.send('human-check', {
    srcImgPath,
    dataUrls,
  });
}

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
  try {
    const resizedOverlayBuffer = await require('sharp')(humanPath)
      .resize(bbox[2], bbox[3])
      .toBuffer();

    await require('sharp')(srcPath)
      .composite([
        {
          input: resizedOverlayBuffer,
          left: bbox[0],
          top: bbox[1],
          blend: 'over',
        },
      ])
      .toFile(outputPath);

    console.log('画像がリサイズされ、合成され、保存されました。');
    windowInstanceManager.subWindow?.webContents.send('log', {
      txt: 'Image has been resized, and saved.',
    });
  } catch (error) {
    console.error('画像のリサイズまたは合成中にエラーが発生しました:', error);
    ErrorHandler.refresh();
    windowInstanceManager.subWindow?.webContents.send('log', {
      txt: 'An error occurred while resizing or compositing the image.',
    });
  }
};

/**
 * メインウインドウで人間判定された際に呼び出される関数
 */
ipcMain.on('human-detected', async (event, data) => {
  console.log('human-detected', data);
  windowInstanceManager.subWindow?.webContents.send('log', {
    txt: 'Human Detected',
  });
  // console.log('data.srcImgPath', data.srcImgPath);
  // console.log('data.humanBBox', data.humanBBox);

  const humanImgPath = data.srcImgPath.replace('.jpg', '__human.jpg');

  await sliceHumanImg(data.srcImgPath, humanImgPath, data.humanBBox);
  console.log('human image sliced');
  windowInstanceManager.subWindow?.webContents.send('log', {
    txt: 'Human Image Sliced',
  });

  /** Segmindクラスのインスタンス */
  const segmind = new Segmind();
  segmind.setEnvironmentConfig(environmentConfig);

  windowInstanceManager.subWindow?.webContents.send('log', {
    txt: 'FaceSwap Start',
  });

  try {
    // Segmindの顔SWAPのリクエストを行う
    await segmind.getSwapImageRequest(
      {
        input_face_image:
          stateManager.faceImageURL ??
          path.join(getTmpFolderPath(), 'harry.jpg'),
        output_face_image: data.srcImgPath, // humanImgPath  ここで無理やり元画像を指定している
      },
      data.srcImgPath.replace('.jpg', '__swap.jpg'),
    );
  } catch (error: any) {
    // console.log('FaceSwap Error:', error);
    console.error('SWAP画像取得リクエストでエラーが発生しました:', error.code);
    windowInstanceManager.subWindow?.webContents.send('log', {
      txt: 'AI画像取得リクエストでエラーが発生しました',
    });

    ErrorHandler.refresh();
    return;
  }

  windowInstanceManager.subWindow?.webContents.send('log', {
    txt: 'Image Compositing Start',
  });

  // Swapした画像をリサイズして、元画像に合成する
  // await compositeImg(
  //   data.srcImgPath,
  //   data.srcImgPath.replace('.jpg', '__swap.jpg'),
  //   data.humanBBox,
  //   data.srcImgPath.replace('.jpg', '__output.jpg'),
  // );

  // ここで無理やり元画像を指定している
  fs.copyFileSync(
    data.srcImgPath.replace('.jpg', '__swap.jpg'),
    data.srcImgPath.replace('.jpg', '__output.jpg'),
  );

  console.log('composite image done');

  // 合成した画像をメインウィンドウに送信
  const base64Image = fs.readFileSync(
    data.srcImgPath.replace('.jpg', '__output.jpg'),
    { encoding: 'base64' },
  );

  windowInstanceManager.subWindow?.webContents.send('log', {
    txt: 'Generate Complete',
  });

  windowInstanceManager.mainWindow?.webContents.send('generate-complete', {
    dataUrl: `data:image/jpeg;base64,${base64Image}`,
  });

  try {
    const response = await axios.post(
      environmentConfig.IMAGE_UPLOADER_API_URL,
      {
        image: base64Image,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': environmentConfig.IMAGE_UPLOADER_API_KEY,
        },
      },
    );
    console.log('画像をアップロードしました:', response.data.uploadPath);

    windowInstanceManager.subWindow?.webContents.send('generate-qr', {
      qrUrl: response.data.uploadPath,
    });
  } catch (error) {
    console.error('QRコードの生成に失敗しました:', error);
  }

  windowInstanceManager.subWindow?.webContents.send('generate-complete', {
    dataUrl: `data:image/jpeg;base64,${base64Image}`,
  });

  // 生成中フラグをfalseにする
  stateManager.generating = false;
});
export default { start };
