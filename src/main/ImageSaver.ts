import https from 'https';
import fs from 'fs';

/**
 * 画像を保存するクラス
 */
export default class ImageSaver {
  /**
   * 画像をURLからGETして保存する関数
   * @param url 画像のURL
   * @param path 保存するパス
   * @returns Promise<void>
   */
  static saveImage(url: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          const stream = fs.createWriteStream(path);
          res.pipe(stream);

          stream.on('finish', () => {
            stream.close();
            console.log('Image saved:', path);
            resolve();
          });
        })
        .on('error', (err) => {
          console.error('Error saving image:', err);
          reject(err);
        });
    });
  }

  /**
   * Base64文字列から画像を保存する関数
   * @param arraybuffer
   * @param path
   * @returns
   */
  static saveImageFromArrayBuffer(
    arraybuffer: string,
    path: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        fs.writeFileSync(path, arraybuffer, 'base64');
        resolve();
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  }
}
