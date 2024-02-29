import { BrowserWindow } from 'electron';

class WindowInstanceManager {
  private static instance: WindowInstanceManager;

  /** AI画像生成ウィンドウ */
  private _mainWindow: BrowserWindow | null = null;

  /** コントロールウィンドウ */
  private _subWindow: BrowserWindow | null = null;

  // コンストラクタを削除し、getInstanceメソッド内でWindowInstanceManagerのインスタンスを直接初期化
  public static getInstance(): WindowInstanceManager {
    if (!WindowInstanceManager.instance) {
      WindowInstanceManager.instance = new WindowInstanceManager();
    }
    return WindowInstanceManager.instance;
  }

  /** AI画像生成ウィンドウ */
  get mainWindow(): BrowserWindow | null {
    return this._mainWindow;
  }

  /** AI画像生成ウィンドウをセット */
  set mainWindow(value: BrowserWindow | null) {
    this._mainWindow = value;
  }

  /** コントロールウィンドウ */
  get subWindow(): BrowserWindow | null {
    return this._subWindow;
  }

  /** コントロールウィンドウをセット */
  set subWindow(value: BrowserWindow | null) {
    this._subWindow = value;
  }
}

export default WindowInstanceManager;
