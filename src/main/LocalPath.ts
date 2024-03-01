import path from 'path';
import { app } from 'electron';

/**
 * 一時フォルダのパスを取得する関数
 * @returns 一時フォルダのパス
 */
const getTmpFolderPath: () => string = () => {
  return path.join(app.getPath('downloads'), 'tmp/');
};

/**
 * 設定ファイルのパスを取得する関数
 * @returns 設定ファイルのパス
 */
const getConfigPath: () => string = () => {
  return path.join(app.getPath('userData'), 'config.json');
};

export { getTmpFolderPath, getConfigPath };
