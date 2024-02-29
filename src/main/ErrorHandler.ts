import WindowInstanceManager from './WindowInstanceManager';
import StateManager from './StateManager';
import AppUtils from './AppUtils';

/** WindowInstanceManagerクラスのインスタンス */
const windowInstanceManager = WindowInstanceManager.getInstance();

/** StateManagerクラスのインスタンス */
const stateManager = StateManager.getInstance();

/**
 * 生成中にエラーが発生した場合の処理
 */
const refresh = () => {
  windowInstanceManager.mainWindow?.webContents.send('generate-complete', {
    dataUrl: ``,
  });
  windowInstanceManager.subWindow?.webContents.send('generate-complete');
  stateManager.generating = false;

  AppUtils.reloadApp();
};

export default { refresh };
