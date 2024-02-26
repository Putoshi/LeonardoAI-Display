import { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { CameraOptions, useFaceDetection } from 'react-use-face-detection';
import FaceDetection from '@mediapipe/face_detection';
import { Camera } from '@mediapipe/camera_utils';
import { atom, useAtom } from 'jotai';

const mirrorAtom = atom<boolean>(true);
const faceDetectedAtom = atom<boolean>(false);

const width = 500;
const height = 500;

function WebcamComponent() {
  const [mirror, setMirror] = useAtom(mirrorAtom);
  const [faceDetected, setFaceDetected] = useAtom(faceDetectedAtom);
  const detectionTimeoutRef = useRef<NodeJS.Timeout | null>(null); // eslint-disable-line

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
          console.log(screenshot);
          window.electron.ipcRenderer.sendMessage(
            'save-screenshot',
            screenshot,
          );
        }
      }
    }
  };

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

  return (
    <div>
      <div>
        <div
          style={{
            position: 'relative',
            // width: '100vw',
            // height: '100vw',
          }}
        >
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
        <p>faceDetected: {faceDetected ? 'true' : 'false'}</p>
        {/* <p>{`Face Detected: ${detected}`}</p> */}
        {/* <p>{`Number of faces detected: ${facesDetected}`}</p> */}
        <button type="button" onClick={toggleMirror}>
          Toggle Mirror
        </button>
        <button type="button" onClick={saveScreenshot}>
          Save Image
        </button>
      </div>
    </div>
  );
}

export default WebcamComponent;
