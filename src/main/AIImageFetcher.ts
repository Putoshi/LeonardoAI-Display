import path from 'path';
import { app } from 'electron';
import ImageSaver from './ImageSaver';
import LeonardoAIOptions from './LeonardoAIOptions';

export default class AIImageFetcher {
  environmentConfig: any;

  // コンストラクターを削除し、環境設定を直接クラスプロパティに設定
  environmentConfig = {};

  async getAIImageRequest() {
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
        if (data.generations_by_pk.status === 'PENDING') {
          setTimeout(fetchImage, 3000); // 3秒後に再取得
        } else {
          console.log(data.generations_by_pk.generated_images);
          data.generations_by_pk.generated_images.forEach((_image) => {
            const defaultPath = path.join(
              app.getPath('downloads'),
              `${_image.id}.jpg`,
            );
            ImageSaver.saveImage(_image.url, defaultPath);
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchImage();
  }
}
