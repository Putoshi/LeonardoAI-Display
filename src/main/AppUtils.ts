import { BrowserWindow } from 'electron';
/**
 * アプリをリロードする関数
 */
const reloadApp = () => {
  const allWindows = BrowserWindow.getAllWindows();
  allWindows.forEach((window) => {
    window.reload();
  });
};
export default { reloadApp };
