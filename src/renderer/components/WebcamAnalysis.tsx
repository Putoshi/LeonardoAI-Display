import React, { useEffect, useRef, useState } from 'react';
import { Human, Config } from '@vladmandic/human';

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

function WebcamAnalysis() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const human = new Human(humanConfig);
    human.env.perfadd = false;
    human.draw.options.font = 'small-caps 18px "Segoe UI"';
    human.draw.options.lineHeight = 20;

    const addLog = (message: string) => {
      setLog((prevLog) => [...prevLog, message]);
      console.log(message);
    };

    const initWebCam = async () => {
      setStatus('starting webcam...');
      const options: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: 'user',
          resizeMode: 'none',
          width: { ideal: document.body.clientWidth },
        },
      };
      try {
        const stream = await navigator.mediaDevices.getUserMedia(options);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
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
      if (videoRef.current && !videoRef.current.paused && canvasRef.current) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (videoRef.current) {
          tempCanvas.width = videoRef.current.videoWidth;
          tempCanvas.height = videoRef.current.videoHeight;
          // 映像を反転させて描画
          tempCtx.scale(-1, 1);
          tempCtx.translate(-tempCanvas.width, 0);
          tempCtx.drawImage(
            videoRef.current,
            0,
            0,
            tempCanvas.width,
            tempCanvas.height,
          );
          tempCtx.restore();

          // 反転させた映像を含むtempCanvasを使用して解析
          const interpolated = await human.next(human.result);
          if (interpolated.face.length > 0) {
            console.log('interpolated', interpolated.face[0]);
          }

          await human.draw.canvas(tempCanvas, canvasRef.current); // tempCanvasを使用
          await human.draw.all(canvasRef.current, interpolated);
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
      await initWebCam();
      detectionLoop();
      drawLoop();
    };

    main();
  }, []);

  return (
    <div>
      <video ref={videoRef} style={{ display: 'none' }} />
      <canvas ref={canvasRef} />
      <div>Status: {status}</div>
      <pre>{log.join('\n')}</pre>
    </div>
  );
}

export default WebcamAnalysis;
