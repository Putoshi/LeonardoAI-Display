import fs from 'fs';
const sharp = require('sharp');

export default class ImageSlicer {
  static async crop(
    src: string,
    dest: string,
    top: number,
    left: number,
    width: number,
    height: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        sharp(src)
          .extract({ top, left, width, height }) // クロップのパラメータ
          .toFile(dest)
          .then((newFileInfo: any) => {
            console.log('Image cropped and saved:', newFileInfo);
            resolve();
            return null;
          })
          .catch((err: any) => {
            // エラーが発生した場合の処理
            console.log('Error occurred:', err);
            reject(err);
          });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  }
}
