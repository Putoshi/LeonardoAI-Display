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

const width = 500;
const height = 500;

function WebcamComponent() {
  const [mirror, setMirror] = useAtom(mirrorAtom);
  const [faceDetected, setFaceDetected] = useAtom(faceDetectedAtom);
  const [detectAlert, setDetectAlert] = useAtom(detectAlertAtom);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // eslint-disable-line

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [flash, setFlash] = useState<boolean>(false);

  const toggleMirror = () => {
    setMirror(!mirror);
  };

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

          // setTimeout(
          //   () => {
          //     setScreenshotUrl(null); // 10秒後にURLをクリア
          //     setFlash(false); // アニメーション終了
          //   },
          //   3 * 60 * 1000,
          // );
        }
      }
    }
  };

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'generate-complete',
      (data) => {
        console.log('generate-completeイベントを受信しました。');
        setScreenshotUrl(null);
        setFlash(false);
      },
    );

    return () => {
      removeListener();
    };
  }, []);

  // 顔が中央にあるか、顔が大きすぎるか、顔が小さすぎるかを判定
  useEffect(() => {
    if (flash) {
      setDetectAlert(
        'Creating art with generative AI.\n Please wait a moment...',
      );
      return;
    }
    // console.log('X', boundingBox[0]?.xCenter + boundingBox[0]?.width * 0.5);
    // console.log('Y', boundingBox[0]?.yCenter + boundingBox[0]?.height * 0.5);
    const facecenterX = boundingBox[0]?.xCenter + boundingBox[0]?.width * 0.5;
    const facecenterY = boundingBox[0]?.yCenter + boundingBox[0]?.height * 0.5;
    const isCenteredX = 0.45 < facecenterX && facecenterX < 0.55;
    const isCenteredY = 0.45 < facecenterY && facecenterY < 0.55;
    if (boundingBox.length > 0) {
      if (boundingBox.length === 1) {
        if (!isCenteredX || !isCenteredY) {
          setDetectAlert('Keep your face centered in the frame.');
        } else if (
          boundingBox[0]?.width < 0.3 ||
          boundingBox[0]?.height < 0.3
        ) {
          setDetectAlert('A little closer to the camera.');
        } else {
          setDetectAlert('Please stay still.');
        }
      } else {
        setDetectAlert('Please be alone on camera.');
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
  const alertMessages = detectAlert.split('\n').map((line, index) => (
    // 最後の要素以外には<br>を追加する
    <React.Fragment key={index}>
      {line}
      {index < detectAlert.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));

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
                  border: '4px solid red',
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
              // mirrored={mirror}
              forceScreenshotSourceSize
              screenshotFormat="image/jpeg"
              style={{
                // height,
                // width,
                width: '100%',
                height: '100%',
                // position: 'absolute',
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
            color:
              detectAlert === 'Please stay still.' ? '#fff600' : '`#00ff13',
          }}
        >
          {alertMessages}
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
