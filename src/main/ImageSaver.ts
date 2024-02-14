import https from 'https';
import fs from 'fs';

export default class ImageSaver {
  static saveImage(url: string, path: string): void {
    https
      .get(url, (res) => {
        const stream = fs.createWriteStream(path);
        res.pipe(stream);

        stream.on('finish', () => {
          stream.close();
          console.log('Image saved:', path);
        });
      })
      .on('error', (err) => {
        console.error('Error saving image:', err);
      });
  }
}
