import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { app } from 'electron';
import ImageSaver from './ImageSaver';
import LeonardoAIOptions from './LeonardoAIOptions';
import Segmind from './Segmind';
import ImageSlicer from './ImageSlicer';
import { getTmpFolderPath } from './LocalPath';

// 環境設定をロード
const environmentConfig = require(`../../env/env.${process.env.NODE_ENV}.js`);

interface EnvironmentConfig {
  LEONARDAI_API_KEY: string;
  LEONARDAI_API_URL: string;
}

export default class AIImageFetcher {
  // コンストラクターを削除し、環境設定を直接クラスプロパティに設定
  environmentConfig: EnvironmentConfig = {
    LEONARDAI_API_KEY: '',
    LEONARDAI_API_URL: '',
  };

  // 環境設定を受け取るメソッドを追加
  setEnvironmentConfig(config: EnvironmentConfig) {
    this.environmentConfig = {
      LEONARDAI_API_KEY: config.LEONARDAI_API_KEY,
      LEONARDAI_API_URL: config.LEONARDAI_API_URL,
    };
  }

  async getAIImage(generationId: string): Promise<string> {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.environmentConfig.LEONARDAI_API_KEY}`,
      },
    };
    console.log(`getAIImage: ${generationId}`);

    const outputFolder = path.join(getTmpFolderPath(), `${generationId}`);
    // フォルダが存在しない場合にフォルダを作成
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    // この関数の処理をPromiseでラップ
    return new Promise<string>((resolve, reject) => {
      const fetchImage = async () => {
        try {
          const response = await fetch(
            `${this.environmentConfig.LEONARDAI_API_URL}/generations/${generationId}`,
            options,
          );
          const data = await response.json();
          // data.generations_by_pkが存在し、nullでないことを確認
          if (
            data.generations_by_pk &&
            data.generations_by_pk.status === 'PENDING'
          ) {
            setTimeout(fetchImage, 2000); // 2秒後に再取得
          } else if (data.generations_by_pk) {
            console.log(data.generations_by_pk.generated_images);
            await Promise.all(
              data.generations_by_pk.generated_images.map(
                async (_image: { id: string; url: string }) => {
                  const outputPath = path.join(
                    outputFolder,
                    `${_image.id}.jpg`,
                  );
                  await ImageSaver.saveImage(_image.url, outputPath);
                },
              ),
            );

            // this.onComplete(outputFolder);
            resolve(outputFolder);
          } else {
            // data.generations_by_pkがnullまたは存在しない場合のエラーハンドリング
            console.error(
              'Error: generations_by_pk is null or does not exist.',
            );
            reject(new Error('generations_by_pk is null or does not exist.'));
          }
        } catch (err) {
          console.error(err);
          reject(err);
        }
      };

      fetchImage();
    });
  }

  // AI画像を取得するリクエストを送信
  async getAIImageRequest(): Promise<string> {
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.environmentConfig.LEONARDAI_API_KEY}`,
      },
      body: JSON.stringify(LeonardoAIOptions),
    };

    try {
      const response = await fetch(
        `${this.environmentConfig.LEONARDAI_API_URL}/generations`,
        options,
      );
      const data = await response.json();
      const outputFolder = await this.getAIImage(
        data.sdGenerationJob.generationId,
      );
      return outputFolder;
    } catch (err) {
      console.error(err);
      throw new Error('Failed to fetch AI image.');
    }
  }

  // AI画像を取得する関数
  // async getAIImage(generationId: string) {}

  // async onComplete(srcFolder: string) {
  // const outputPath = path.join(
  //   getTmpFolderPath(),
  //   'outputFaceImage__.jpg',
  // );
  // ImageSlicer.crop(srcPath, outputPath, 100, 100);
  // console.log(outputPath);
  // console.log(this.environmentConfig.LEONARDAI_API_KEY);
  // const segmind = new Segmind();
  // segmind.setEnvironmentConfig(environmentConfig);
  // segmind.getAIImageRequest({
  //   input_face_image: path.join(getTmpFolderPath(),, 'harry.jpg'),
  //   output_face_image: outputPath,
  // });
  // }
}
