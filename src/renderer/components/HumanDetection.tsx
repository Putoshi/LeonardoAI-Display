import { useRef, useEffect } from 'react';
import { useFaceDetection } from 'react-use-face-detection';
import FaceDetection from '@mediapipe/face_detection';
import baseImg from '../../../assets/test4.jpg';

require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const cocoSsd = require('@tensorflow-models/coco-ssd');

function HumanDetection() {
  const imgRef = useRef(null);
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      const model = cocoSsd.load();
      model.then((model) => {
        model.detect(img).then((predictions) => {
          console.log('Predictions: ');
          console.log(predictions);
        });
      });
    }
  }, [imgRef]);
  // tf.setBackend('cpu').then(() => main());

  // // Load the model.
  // const model = await cocoSsd.load();

  // // Classify the image.
  // const predictions = await model.detect(img);

  // console.log('Predictions: ');
  // console.log(predictions);

  // const getAssetPath = (...paths: string[]): string => {
  //   return path.join(RESOURCES_PATH, ...paths);
  // };
  // const { imgRef, boundingBox, isLoading, detected, facesDetected } =
  //   useFaceDetection({
  //     faceDetectionOptions: {
  //       model: 'short',
  //     },
  //     handleOnResults: (results) => {
  //       console.log(results);
  //     },
  //     faceDetection: new FaceDetection.FaceDetection({
  //       locateFile: (file) =>
  //         `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/${file}`,
  //     }),
  //   });
  return (
    <div>
      <img
        crossOrigin="anonymous"
        ref={imgRef}
        alt=""
        style={{
          position: 'absolute',
          marginLeft: 'auto',
          marginRight: 'auto',
          left: '0',
          right: '0',
          textAlign: 'center',
          zIndex: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
        }}
        src={baseImg}
        // src="https://previews.123rf.com/images/gdolgikh/gdolgikh1504/gdolgikh150400087/38738606-gruppe-gl%C3%BCckliche-junge-leute-isoliert-auf-wei%C3%9Fem-hintergrund.jpg"
      />

      {/* <p>{`Loading: ${isLoading}`}</p>
      <p>{`Face Detected: ${detected}`}</p>
      <p>{`Number of faces detected: ${facesDetected}`}</p>
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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
              zIndex: 1,
            }}
          />
        ))}
        <img
          crossOrigin="anonymous"
          ref={imgRef}
          alt=""
          style={{
            position: 'absolute',
            marginLeft: 'auto',
            marginRight: 'auto',
            left: '0',
            right: '0',
            textAlign: 'center',
            zIndex: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
          }}
          src={baseImg}
          handleOnResults={(results) => {
            console.log(results);
          }}
          // src="https://previews.123rf.com/images/gdolgikh/gdolgikh1504/gdolgikh150400087/38738606-gruppe-gl%C3%BCckliche-junge-leute-isoliert-auf-wei%C3%9Fem-hintergrund.jpg"
        />
      </div> */}
    </div>
  );
}
export default HumanDetection;
