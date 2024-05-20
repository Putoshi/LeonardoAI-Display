import fs from 'fs';
import path from 'path';
// import { v4 as uuidv4 } from 'uuid';
import ImageSaver from './ImageSaver';
import LeonardoAIOptions from './LeonardoAIOptions';
import { editPrompt } from './LeonardoAIPrompts';
import { getTmpFolderPath } from './LocalPath';

/** 環境設定をロード */
const environmentConfig = require(`../../env/env.${process.env.NODE_ENV}.js`); // eslint-disable-line

interface EnvironmentConfig {
  LEONARDAI_API_KEY: string;
  LEONARDAI_API_URL: string;
}

let idx = 0;

/**
 * LeonardoAIで画像を生成するクラス
 */
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

  /**
   * LeonardoAIで生成した画像を取得する関数
   * @param generationId 取得する画像のID
   * @returns 取得した画像のパス
   */
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
      // 画像をフェッチする
      const fetchImage = async () => {
        try {
          const response = await fetch(
            `${this.environmentConfig.LEONARDAI_API_URL}/generations/${generationId}`,
            options,
          );
          const data = await response.json();
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
            resolve(outputFolder);
          } else {
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

  /**
   * AI画像を取得するリクエストを送信
   * @returns
   */
  async getAIImageRequest(interpolatedFace: any): Promise<string> {
    console.log('idx', idx);
    const promptOptions = editPrompt(interpolatedFace, idx); // AI画像生成のためのプロンプトを編集
    idx = (idx + 1) % 4;

    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.environmentConfig.LEONARDAI_API_KEY}`,
      },
      body: JSON.stringify({
        ...LeonardoAIOptions,
        ...promptOptions,
      }),
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
}
