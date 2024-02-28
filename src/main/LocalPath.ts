import path from 'path';
import { app } from 'electron';

/**
 * 一時フォルダのパスを取得する関数
 * @returns 一時フォルダのパス
 */
const getTmpFolderPath: () => string = () => {
  return path.join(app.getPath('downloads'), 'tmp/');
};
export { getTmpFolderPath };
