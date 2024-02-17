import path from 'path';
import { app } from 'electron';
import ImageSaver from './ImageSaver';
import LeonardoAIOptions from './LeonardoAIOptions';
import Segmind from './Segmind';

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

  // AI画像を取得するリクエストを送信
  async getAIImageRequest() {
    // this.onComplete(
    //   '/Users/xxxxx.jpg',
    // );
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.environmentConfig.LEONARDAI_API_KEY}`,
      },
      body: JSON.stringify(LeonardoAIOptions),
    };

    fetch(`${this.environmentConfig.LEONARDAI_API_URL}/generations`, options)
      .then((response) => response.json())
      .then((response) => {
        console.log(response.sdGenerationJob.generationId);
        return this.getAIImage(response.sdGenerationJob.generationId);
      })
      .catch((err) => console.error(err));
  }

  // AI画像を取得する関数
  async getAIImage(generationId: string) {
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.environmentConfig.LEONARDAI_API_KEY}`,
      },
    };
    console.log(`getAIImage: ${generationId}`);

    const fetchImage = async () => {
      try {
        const response = await fetch(
          `${this.environmentConfig.LEONARDAI_API_URL}/generations/${generationId}`,
          options,
        );
        const data = await response.json();
        if (data.generations_by_pk.status) {
          if (data.generations_by_pk.status === 'PENDING') {
            setTimeout(fetchImage, 2000); // 2秒後に再取得
          } else {
            console.log(data.generations_by_pk.generated_images);
            let outputPath = '';
            await Promise.all(
              data.generations_by_pk.generated_images.map(
                async (_image: { id: string; url: string }) => {
                  outputPath = path.join(
                    app.getPath('downloads'),
                    `${_image.id}.jpg`,
                  );
                  await ImageSaver.saveImage(_image.url, outputPath);
                },
              ),
            );

            this.onComplete(outputPath);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchImage();
  }

  async onComplete(outputPath: string) {
    console.log(outputPath);
    console.log(this.environmentConfig.LEONARDAI_API_KEY);

    const segmind = new Segmind();
    segmind.setEnvironmentConfig(environmentConfig);
    segmind.getAIImageRequest({
      input_face_image: path.join(app.getPath('downloads'), 'harry.jpg'),
      output_face_image: outputPath,
    });
  }
}
