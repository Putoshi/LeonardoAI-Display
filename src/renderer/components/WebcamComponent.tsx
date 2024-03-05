import React, { useRef, useState, useEffect } from 'react';
import { atom, useAtom } from 'jotai';
import { motion } from 'framer-motion';
import InterpolatedFaceAtom from '../states/InterpolatedFaceAtom';
import WebcamAnalysis from './WebcamAnalysis';
import dummy from '../../../assets/people.png';

const mirrorAtom = atom<boolean>(true);
const faceDetectedAtom = atom<boolean>(false);
const detectAlertAtom = atom<string>('');
const logAtom = atom<string>('');

/**
 * ヘッダーに出すアラート文言
 */
const alertMessagesAtom = atom({
  centered: 'Keep your face centered \n in the frame.',
  closer: 'A little closer to the camera.',
  still: 'Please stay still.',
  alone: 'Please be alone on camera.',
  creating: 'Creating Image with generative AI.\n Please wait a moment...',
  complete: 'Image created successfully!',
  error: 'Error...!',
});

const captureVideoFrame = (
  videoInput: HTMLVideoElement | string,
  formatInput: string = 'jpeg',
  qualityInput: number = 0.92,
) => {
  const video: HTMLVideoElement | null =
    typeof videoInput === 'string'
      ? (document.querySelector(videoInput) as HTMLVideoElement)
      : videoInput;

  const format = formatInput || 'jpeg';
  const quality = qualityInput || 0.92;

  if (!video || (format !== 'png' && format !== 'jpeg')) {
    return false;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return false;
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUri = canvas.toDataURL(`image/${format}`, quality);
  const data = dataUri.split(',')[1];
  const mimeType = dataUri.split(';')[0].slice(5);

  const bytes = window.atob(data);
  const buf = new ArrayBuffer(bytes.length);
  const arr = new Uint8Array(buf);

  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }

  const blob = new Blob([arr], { type: mimeType });
  return { blob, dataUri, format };
};

/**
 * WebcamComponentコンポーネント
 * @returns
 */
function WebcamComponent() {
  const [mirror, setMirror] = useAtom(mirrorAtom);
  const [faceDetected, setFaceDetected] = useAtom(faceDetectedAtom);
  const [detectAlert, setDetectAlert] = useAtom(detectAlertAtom);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // eslint-disable-line
  const [alertMessages] = useAtom(alertMessagesAtom);
  const [log, setLog] = useAtom(logAtom);

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState<boolean>(false);
  const [detected, setDetected] = useState<boolean>(false);
  const [age, setAge] = useState<number>(0);
  const [gender, setGender] = useState<string>('');
  const [genderScore, setGenderScore] = useState<number>(0);
  const [faceDistance, setfaceDistance] = useState<number>(0);
  const [faceScore, setfaceScore] = useState<number>(0);

  const [interpolatedFace] = useAtom(InterpolatedFaceAtom);

  const webcamRef = useRef<HTMLVideoElement | null>(null);

  /**
   * Webcamのミラー表示を切り替える関数
   */
  const toggleMirror = () => {
    setMirror(!mirror);
  };

  const handleVideoRef = (videoEl: HTMLVideoElement | null) => {
    // console.log(videoEl);
    if (videoEl) {
      webcamRef.current = videoEl;
    }
  };

  const saveScreenshot = () => {
    if (webcamRef.current) {
      const webcamCurrent = webcamRef.current;

      if (webcamCurrent) {
        console.log(`saveScreenshot`);
        const screenshot = captureVideoFrame(webcamCurrent, 'jpeg', 0.92);
        if (screenshot) {
          // console.log(screenshot.dataUri);
          window.electron.ipcRenderer.sendMessage(
            'save-screenshot',
            screenshot.dataUri,
          );
          setScreenshotUrl(screenshot.dataUri); // スクリーンショットのURLを状態に保存
          setFlash(true); // アニメーション開始
        }
      }
    }
  };

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'generate-complete',
      (data: any) => {
        console.log('generate-completeイベントを受信しました。', data);
        setDetectAlert(alertMessages.complete);
        setScreenshotUrl(null);
        setFlash(false);
      },
    );

    const removeLogListener = window.electron.ipcRenderer.on('log', (data) => {
      setLog((prevLog) => {
        const timestamp = new Date().toLocaleString('ja-JP');
        const newLog = `${prevLog}\n${timestamp}  ${data.txt}`;
        const splitLog = newLog.split('\n');
        if (splitLog.length > 10) {
          return splitLog.slice(-10).join('\n');
        }
        return newLog;
      });
    });

    return () => {
      removeListener();
      removeLogListener();
    };
  }, []);

  // 顔が中央にあるか、顔が大きすぎるか、顔が小さすぎるかを判定
  useEffect(() => {
    if (flash) {
      setDetectAlert(alertMessages.creating);
      return;
    }

    if (interpolatedFace) {
      // console.log(interpolatedFace);

      setAge(interpolatedFace.age);
      setGender(interpolatedFace.gender);
      setGenderScore(interpolatedFace.genderScore);
      setfaceDistance(interpolatedFace.distance);
      setfaceScore(interpolatedFace.score);

      setDetected(true);
      const facecenterX =
        interpolatedFace.boxRaw[0] + interpolatedFace.boxRaw[2] * 0.5;
      const facecenterY =
        interpolatedFace.boxRaw[1] + interpolatedFace.boxRaw[3] * 0.5;

      const isCenteredX = 0.4 < facecenterX && facecenterX < 0.6;
      const isCenteredY = 0.4 < facecenterY && facecenterY < 0.6;

      // console.log(isCenteredX, isCenteredY);

      // 顔が小さい時
      if (!isCenteredX || !isCenteredY) {
        setDetectAlert(alertMessages.centered); // 顔が中央にない場合
      } else if (interpolatedFace.distance > 0.7) {
        setDetectAlert(alertMessages.closer);
      } else {
        setDetectAlert(alertMessages.still);
      }
    } else {
      setDetected(false);
    }
  }, [interpolatedFace, flash]);

  // 顔が検出されたら、1秒後にfaceDetectedをtrueにする
  useEffect(() => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
    // 顔が検出されたら、1秒後にfaceDetectedをtrueにする
    detectionTimeoutRef.current = setTimeout(() => {
      setFaceDetected(detected);
    }, 1000);

    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [detected, setFaceDetected]);

  // 顔が検出され、位置も問題なければ、3秒後にsaveScreenshotを実行
  useEffect(() => {
    if (faceDetected && detectAlert === 'Please stay still.') {
      const timer = setTimeout(() => {
        saveScreenshot();
      }, 3000); // 3秒後にsaveScreenshotを実行

      return () => clearTimeout(timer); // コンポーネントのクリーンアップ時にタイマーをクリア
    }
  }, [faceDetected, detectAlert]);

  // detectAlertの値を改行で分割し、配列として扱う
  const parseAlertMessages = detectAlert
    ? detectAlert.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < detectAlert.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))
    : null;

  // logの値を改行で分割し、配列として扱う
  const parseLog = log
    ? log.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < log.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))
    : null;

  return (
    <div>
      <div>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: '26px',
            letterSpacing: '2px',
            zIndex: 500,
            padding: '20px 0',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
          }}
        >
          <motion.div
            style={{
              color:
                detectAlert === 'Please stay still.' ? '#00ff13' : '#fff600',
            }}
            animate={
              detectAlert === alertMessages.creating
                ? { opacity: [0.4, 1, 0.4] }
                : { opacity: 1 }
            }
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {parseAlertMessages}
          </motion.div>
        </div>

        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }} // キーフレームを設定
              exit={{ opacity: 0 }}
              transition={{
                times: [0, 0.05, 0.4, 1], // 各キーフレームのタイミングを設定
                duration: 1, // アニメーションの全体の長さを設定
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'white',
                zIndex: 20,
              }}
            />
          )}
          {screenshotUrl && (
            <motion.img
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: '0px',
                left: '0px',
                zIndex: 12,
                transform: 'scaleX(-1)',
              }}
              src={screenshotUrl}
              alt="Screenshot"
            />
          )}
          <img
            src={dummy}
            alt="loading"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: '0px',
              left: '0px',
              zIndex: 10,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              // width,
              // height,
              width: '100%',
              height: '100%',
              position: 'relative',
              // transform: mirror ? 'scaleX(-1)' : 'none',
            }}
          >
            <WebcamAnalysis onVideoRef={handleVideoRef} />
          </div>
        </div>
        {/* <p>{`Loading: ${isLoading}`}</p> */}

        <div
          style={{
            boxSizing: 'border-box',
            textAlign: 'left',
            width: '100%',
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: '12px',
            letterSpacing: '1px',
            lineHeight: '0.8',
            zIndex: 500,
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* <p>{`wait: ${flash}`}</p> */}
          <p>faceDetected: {faceDetected ? 'true' : 'false'}</p>
          <p>{`age: ${age}`}</p>
          <p>{`gender: ${gender}`}</p>
          <p>{`genderScore: ${genderScore}`}</p>
          <p>{`faceDistance: ${faceDistance}`}</p>
          <p>{`faceScore: ${faceScore}`}</p>
          {!flash && (
            <>
              {/* <p>{`Number of faces detected: ${facesDetected}`}</p> */}
              {/* {boundingBox.map((box, index) => (
                <p key={index}>
                  {`Face ${index + 1}: (${box.xCenter.toFixed(3)}, ${box.yCenter.toFixed(3)}, width: ${box.width.toFixed(3)}, height: ${box.height.toFixed(3)})`}
                </p>
              ))} */}
            </>
          )}
          <p
            style={{
              marginTop: '10px',
              lineHeight: '1',
              whiteSpace: 'pre-wrap',
            }}
          >
            {parseLog}
          </p>
          {/* <button type="button" onClick={toggleMirror}>
            Toggle Mirror
          ))}
          {/* <button type="button" onClick={toggleMirror}>
            Toggle Mirror
          </button>
          <button type="button" onClick={saveScreenshot}>
            Save Image
          </button> */}

          {/* <button type="button" onClick={saveScreenshot}>
            Save Image
          </button> */}
        </div>
      </div>
    </div>
  );
}

export default WebcamComponent;
