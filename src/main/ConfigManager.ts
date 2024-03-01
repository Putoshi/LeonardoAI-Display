import fs from 'fs';
import { shell } from 'electron';
import { getConfigPath } from './LocalPath';

// 設定ファイルのデフォルト値を定数として定義
const DEFAULT_CONFIG = {
  primaryDisplayIndex: 0,
  secondaryDisplayIndex: 1,
};

// 設定ファイルのデフォルト値を設定する関数
export async function setupDefaultConfig() {
  if (!fs.existsSync(getConfigPath())) {
    fs.writeFileSync(
      getConfigPath(),
      JSON.stringify(DEFAULT_CONFIG, null, 2),
      'utf8',
    );
    shell.showItemInFolder(getConfigPath());
  }
}

// 設定ファイルをロードする関数
export async function loadConfig() {
  await setupDefaultConfig(); // デフォルト設定の確認と設定
  try {
    const data = await fs.promises.readFile(getConfigPath(), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました:', error);
    return null;
  }
}
