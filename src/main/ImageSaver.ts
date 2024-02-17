import https from 'https';
import fs from 'fs';

export default class ImageSaver {
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

  static saveImageFromArrayBuffer(
    arraybuffer: string,
    path: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFileSync(path, arraybuffer, 'base64', (err) => {
        console.log(err);
        reject(err);
      });

      resolve();
    });
  }
}
