class StateManager {
  private static instance: StateManager;

  /** 生成中かどうか */
  private _generating: boolean = false;

  // コンストラクタを削除し、getInstanceメソッド内でStateManagerのインスタンスを直接初期化
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /** 生成中かどうか */
  get generating(): boolean {
    return this._generating;
  }

  /** 生成中かどうかをセット */
  set generating(value: boolean) {
    this._generating = value;
  }
}

export default StateManager;
