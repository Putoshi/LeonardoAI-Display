import { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { CameraOptions, useFaceDetection } from 'react-use-face-detection';
import FaceDetection from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';
import { atom, useAtom } from 'jotai';
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
          // window.electron.ipcRenderer.sendMessage(
          //   'save-screenshot',
          //   screenshot,
          // );
          setScreenshotUrl(screenshot); // スクリーンショットのURLを状態に保存
          setTimeout(() => {
            setScreenshotUrl(null); // 30秒後にURLをクリア
          }, 3000);
        }
      }
    }
  };

  // 顔が中央にあるか、顔が大きすぎるか、顔が小さすぎるかを判定
  useEffect(() => {
    // console.log('X', boundingBox[0]?.xCenter + boundingBox[0]?.width * 0.5);
    // console.log('Y', boundingBox[0]?.yCenter + boundingBox[0]?.height * 0.5);
    const facecenterX = boundingBox[0]?.xCenter + boundingBox[0]?.width * 0.5;
    const facecenterY = boundingBox[0]?.yCenter + boundingBox[0]?.height * 0.5;
    const isCenteredX = 0.4 < facecenterX && facecenterX < 0.6;
    const isCenteredY = 0.35 < facecenterY && facecenterY < 0.65;
    if (boundingBox.length > 0) {
      if (boundingBox.length === 1) {
        if (!isCenteredX || !isCenteredY) {
          setDetectAlert('Keep your face centered in the frame.');
        } else if (
          boundingBox[0]?.width < 0.25 ||
          boundingBox[0]?.height < 0.25
        ) {
          setDetectAlert('A little closer to the camera.');
        } else {
          setDetectAlert('Please stay still.');
        }
      } else {
        setDetectAlert('Please be alone on camera.');
      }
    }
  }, [boundingBox]);

  // 顔が検出されたら、1秒後にfaceDetectedをtrueにする
  useEffect(() => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }
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

  return (
    <div>
      <div>
        <div
          style={{
            position: 'relative',
            // width: '100vw',
            // height: '100vw',
            overflow: 'hidden',
          }}
        >
          {screenshotUrl && (
            <img
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
                  // top: `0%`,
                  // left: `0%`,
                  // width: `50%`,
                  // height: `100px`,
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
        <p>{detectAlert}</p>
        <p>faceDetected: {faceDetected ? 'true' : 'false'}</p>
        {/* <p>{`Face Detected: ${detected}`}</p> */}
        {/* <p>{`Number of faces detected: ${facesDetected}`}</p> */}
        {/* <button type="button" onClick={toggleMirror}>
          Toggle Mirror
        </button>
        <button type="button" onClick={saveScreenshot}>
          Save Image
        </button> */}
      </div>
    </div>
  );
}

export default WebcamComponent;
