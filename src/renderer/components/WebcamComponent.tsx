import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { CameraOptions, useFaceDetection } from 'react-use-face-detection';
import FaceDetection from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';
import { atom, useAtom } from 'jotai';
import { motion } from 'framer-motion';
import dummy from '../../../assets/people.png';

const mirrorAtom = atom<boolean>(true);
const faceDetectedAtom = atom<boolean>(false);
const detectAlertAtom = atom<string>('');
const logAtom = atom<string>('');

const width = 500;
const height = 500;

const alertMessagesAtom = atom({
  centered: 'Keep your face centered in the frame.',
  closer: 'A little closer to the camera.',
  still: 'Please stay still.',
  alone: 'Please be alone on camera.',
  creating: 'Creating Image with generative AI.\n Please wait a moment...',
  error: 'Error...!',
});

function WebcamComponent() {
  const [mirror, setMirror] = useAtom(mirrorAtom);
  const [faceDetected, setFaceDetected] = useAtom(faceDetectedAtom);
  const [detectAlert, setDetectAlert] = useAtom(detectAlertAtom);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // eslint-disable-line

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState<boolean>(false);
  const [alertMessages, setAlertMessages] = useAtom(alertMessagesAtom);
  const [log, setLog] = useAtom(logAtom);

  const toggleMirror = () => {
    setMirror(!mirror);
  };

  async function getCameraDeviceId() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === 'videoinput',
    );
    console.log('videoDevices', videoDevices);
    if (videoDevices.length > 0) {
      // 例として、最初のデバイスのIDを返します
      return videoDevices[0].deviceId;
    }
    return null;
  }

  const { webcamRef, boundingBox, isLoading, detected, facesDetected } =
    useFaceDetection({
      faceDetectionOptions: {
        model: 'short',
      },
      faceDetection: new FaceDetection.FaceDetection({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
      }),
      camera: ({ mediaSrc, onFrame }: CameraOptions) =>
        new Camera(mediaSrc, {
          onFrame,
          width,
          height,
        }),
    });

  const saveScreenshot = () => {
    if (webcamRef) {
      const webcamCurrent = webcamRef.current;
      if (webcamCurrent && typeof webcamCurrent.getScreenshot === 'function') {
        const screenshot = webcamCurrent.getScreenshot();
        if (screenshot) {
          console.log('screenshot');
          window.electron.ipcRenderer.sendMessage(
            'save-screenshot',
            screenshot,
          );
          setScreenshotUrl(screenshot); // スクリーンショットのURLを状態に保存
          setFlash(true); // アニメーション開始
        }
      }
    }
  };

  useEffect(() => {
    getCameraDeviceId().then((deviceId) => {
      console.log('deviceId', deviceId);
    });
    const removeListener = window.electron.ipcRenderer.on(
      'generate-complete',
      (data) => {
        console.log('generate-completeイベントを受信しました。');
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
    // console.log('X', boundingBox[0]?.xCenter + boundingBox[0]?.width * 0.5);
    // console.log('Y', boundingBox[0]?.yCenter + boundingBox[0]?.height * 0.5);
    const facecenterX = boundingBox[0]?.xCenter + boundingBox[0]?.width * 0.5;
    const facecenterY = boundingBox[0]?.yCenter + boundingBox[0]?.height * 0.5;
    const isCenteredX = 0.35 < facecenterX && facecenterX < 0.65;
    const isCenteredY = 0.35 < facecenterY && facecenterY < 0.65;
    if (boundingBox.length > 0) {
      if (boundingBox.length === 1) {
        if (!isCenteredX || !isCenteredY) {
          setDetectAlert(alertMessages.centered); // 顔が中央にない場合
        } else if (
          boundingBox[0]?.width < 0.3 ||
          boundingBox[0]?.height < 0.3
        ) {
          setDetectAlert(alertMessages.closer); // 顔が小さすぎる場合
        } else {
          setDetectAlert(alertMessages.still); // 顔が中央にあり、大きさも問題ない場合
        }
      } else {
        setDetectAlert(alertMessages.alone); // 顔が複数検出された場合
      }
    }
  }, [boundingBox, flash]);

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
              opacity: 0.4,
            }}
          />
          <div
            style={{
              // width,
              // height,
              width: '100%',
              height: '100%',
              position: 'relative',
              transform: mirror ? 'scaleX(-1)' : 'none',
            }}
          >
            {boundingBox.map((box, index) => (
              <div
                key={`${index + 1}`}
                style={{
                  border:
                    detectAlert === 'Please stay still.'
                      ? '4px solid green'
                      : '4px solid red',
                  position: 'absolute',
                  top: `${box.yCenter * 100}%`,
                  left: `${box.xCenter * 100}%`,
                  width: `${box.width * 100}%`,
                  height: `${box.height * 100}%`,
                  // transform: mirror ? 'scaleX(-1)' : 'none',
                  zIndex: 1,
                }}
              />
            ))}
            <Webcam
              ref={webcamRef}
              forceScreenshotSourceSize
              screenshotFormat="image/jpeg"
              style={{
                width: '100%',
                height: '100%',
              }}
              videoConstraints={{
                deviceId: {
                  exact:
                    'a6f33f89a138520c9652d374425d24966c3deee6038a77fe77ed19896d732dbd',
                },
              }}
            />
          </div>
        </div>
        {/* <p>{`Loading: ${isLoading}`}</p> */}
        <div
          style={{
            position: 'absolute',
            top: '0%',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: '24px',
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
            textAlign: 'left',
            width: '100%',
            fontFamily: 'Helvetica Neue, Arial, sans-serif',
            fontSize: '14px',
            letterSpacing: '2px',
            zIndex: 500,
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <p>{`wait: ${flash}`}</p>
          <p>faceDetected: {faceDetected ? 'true' : 'false'}</p>
          {!flash && (
            <>
              <p>{`Number of faces detected: ${facesDetected}`}</p>
              {boundingBox.map((box, index) => (
                <p key={index}>
                  {`Face ${index + 1}: (${box.xCenter.toFixed(3)}, ${box.yCenter.toFixed(3)}, width: ${box.width.toFixed(3)}, height: ${box.height.toFixed(3)})`}
                </p>
              ))}
            </>
          )}
          <p
            style={{
              marginTop: '20px',
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
        </div>
      </div>
    </div>
  );
}

export default WebcamComponent;
