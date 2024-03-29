import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { app } from 'electron';
import ImageSaver from './ImageSaver';
import { Faceswap, FaceswapType } from 'segmind-npm';
import { getTmpFolderPath } from './LocalPath';

interface EnvironmentConfig {
  SEGMINF_API_KEY: string;
  SEGMINF_API_URL: string;
}

export default class Segmind {
  // コンストラクターを削除し、環境設定を直接クラスプロパティに設定
  environmentConfig: EnvironmentConfig = {
    SEGMINF_API_KEY: '',
    SEGMINF_API_URL: '',
  };

  convertToBase64(imgPath: string): string {
    const data = fs.readFileSync(path.resolve(imgPath));
    return Buffer.from(data).toString('base64');
  }

  // 環境設定を受け取るメソッドを追加
  setEnvironmentConfig(config: EnvironmentConfig): void {
    this.environmentConfig = {
      SEGMINF_API_KEY: config.SEGMINF_API_KEY,
      SEGMINF_API_URL: config.SEGMINF_API_URL,
    };
  }

  // Base64文字列をテキストファイルとして保存する関数
  saveBase64AsFile(base64String: string, filePath: string) {
    fs.writeFileSync(filePath, base64String);
  }

  // AI画像を取得するリクエストを送信
  getSwapImageRequest(data: FaceswapType, outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const config = {
        input_face_image: this.convertToBase64(data.input_face_image),
        target_face_image: this.convertToBase64(data.output_face_image),
        file_type: 'jpg',
        face_restore: true,
      };

      const apiKey = this.environmentConfig.SEGMINF_API_KEY;
      const url = this.environmentConfig.SEGMINF_API_URL;
      console.log('apiKey: ', apiKey);
      console.log('url: ', url);

      try {
        const headers = {
          'X-API-KEY': apiKey,
        };
        console.log({ headers });

        const response = await axios.post(url, config, {
          headers,
          responseType: 'arraybuffer',
        });

        await ImageSaver.saveImageFromArrayBuffer(response.data, outputPath);
        console.log('FaceSwap完了');
        resolve();
      } catch (error: any) {
        console.error('Error:', error.response.data);
        reject(error);
      }
    });
  }
}
