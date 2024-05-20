import { useEffect, useRef, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Human, Config, DrawOptions } from '@vladmandic/human';
import InterpolatedFaceAtom from '../states/InterpolatedFaceAtom';

const squareSize = 300; // 正方形のサイズを300pxに設定

const humanConfig: Partial<Config> = {
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
  filter: { enabled: true, flip: true },
  face: {
    enabled: true,
    detector: { rotation: false },
    mesh: { enabled: true },
    iris: { enabled: true },
    description: { enabled: true },
    emotion: { enabled: true },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: true },
};

const drawConfig: Partial<DrawOptions> = {
  alpha: 0.2,
  // drawLabels: false,
  drawAttention: false,
  drawBoxes: false,
  drawGestures: false,
};

function WebcamAnalysis({
  onVideoRef,
}: {
  onVideoRef: (instance: HTMLVideoElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [interpolatedFace, setInterpolatedFace] = useAtom(InterpolatedFaceAtom);

  /**
   * カメラデバイスのIDを取得する関数
   */
  const getCameraDeviceIds = useCallback(async () => {
    console.log('getCameraDeviceIds');

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === 'videoinput',
    );
    console.log('videoDevices', videoDevices);
    // videoDevices.forEach((device, index) => {
    //   console.log('device', device);
    // });

    const storedIdx: number =
      parseInt(localStorage.getItem('cameraDeviceIdx') as string, 10) || 0;

    // storedIdxがvideoDevicesの範囲内にあるか確認し、範囲外の場合は0を使用
    const safeIdx =
      storedIdx >= 0 && storedIdx < videoDevices.length ? storedIdx : 0;

    // cameraDeviceIdxで指定されたデバイスのIDを返す
    return videoDevices.length > 0 ? videoDevices[safeIdx]?.deviceId : null;
  }, []);

  useEffect(() => {
    const fetchDeviceId = async () => {
      try {
        const id = await getCameraDeviceIds();
        setDeviceId(id);
      } catch (error) {
        console.error('Error getting camera device ID:', error);
      }
    };

    fetchDeviceId();
  }, []);

  useEffect(() => {
    // onVideoRefが関数であるかどうかを確認
    if (typeof onVideoRef === 'function') {
      if (videoRef.current) {
        onVideoRef(videoRef.current);
      }
      // コンポーネントのアンマウント時にnullを渡してクリーンアップ
      return () => onVideoRef(null);
    }
  }, [onVideoRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '0' && event.key <= '9') {
        const newIdx = parseInt(event.key, 10);
        localStorage.setItem('cameraDeviceIdx', newIdx.toString());
        console.log('cameraDeviceIdx:', newIdx);
        reloadApp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [getCameraDeviceIds]); // 依存配列にgetCameraDeviceIdsを追加

  const reloadApp = () => {
    window.electron.ipcRenderer.sendMessage('reload-app');
  };

  useEffect(() => {
    const human = new Human(humanConfig);
    human.env.perfadd = false;
    human.draw.options.font = 'small-caps 18px "Segoe UI"';
    human.draw.options.lineHeight = 20;

    const addLog = (message: string) => {
      setLog((prevLog) => [...prevLog, message]);
      console.log(message);
    };

    const initWebCam = async (deviceId: string | null) => {
      setStatus('starting webcam...');
      console.log('initWebCam', deviceId);

      const options: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? {
              deviceId,
              facingMode: 'user',
              resizeMode: 'none',
              width: { ideal: document.body.clientWidth },
            }
          : {
              facingMode: 'user',
              resizeMode: 'none',
              width: { ideal: document.body.clientWidth },
            },
      };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(options);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current
            .play()
            .catch((error) => console.log('Video play error:', error));
          await new Promise((resolve) => {
            videoRef.current!.onloadeddata = () => {
              resolve(true);
              // videoのサイズを正方形に設定
              videoRef.current!.style.width = `${squareSize}px`;
              videoRef.current!.style.height = `${squareSize}px`;
            };
          });
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        }
      } catch (error) {
        addLog(`Webcam Error: ${error}`);
      }
    };

    const detectionLoop = async () => {
      if (videoRef.current && !videoRef.current.paused) {
        await human.detect(videoRef.current);
      }
      requestAnimationFrame(detectionLoop);
    };

    const drawLoop = async () => {
      if (videoRef.current?.videoWidth === 0) return;

      if (videoRef.current && !videoRef.current.paused && canvasRef.current) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (videoRef.current) {
          tempCanvas.width = videoRef.current.videoWidth;
          tempCanvas.height = videoRef.current.videoHeight;
          // 映像を反転させて描画
          tempCtx?.scale(-1, 1);
          tempCtx?.translate(-tempCanvas.width, 0);
          tempCtx?.drawImage(
            videoRef.current,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height,
          );
          tempCtx?.restore();

          // 反転させた映像を含むtempCanvasを使用して解析
          const interpolated = await human.next(human.result);

          // drawLoop関数内でinterpolated.face[0]を取得した後に状態を更新
          if (interpolated.face.length > 0) {
            // console.log('interpolated', interpolated.face[0]);
            setInterpolatedFace(interpolated.face[0]);
          } else {
            setInterpolatedFace(null);
          }

          await human.draw.canvas(tempCanvas, canvasRef.current); // tempCanvasを使用
          await human.draw.all(canvasRef.current, interpolated, drawConfig);
        }
      }
      setTimeout(drawLoop, 30);
    };

    const main = async () => {
      setStatus('init...');
      await human.init();
      setStatus('load...');
      await human.load();
      setStatus('warmup...');
      await human.warmup();
      await initWebCam(deviceId);
      detectionLoop();
      drawLoop();
    };

    main();
  }, [deviceId]);

  return (
    <div>
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas style={{ width: '100%' }} ref={canvasRef} />
      <div>Status: {status}</div>
      <pre>{log.join('\n')}</pre>
    </div>
  );
}

export default WebcamAnalysis;
