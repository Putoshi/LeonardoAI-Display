import { useRef, useEffect, useState } from 'react';
import { useFaceDetection } from 'react-use-face-detection';
import FaceDetection from '@mediapipe/face_detection';
import baseImg from '../../../assets/test5.jpg';

require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const cocoSsd = require('@tensorflow-models/coco-ssd');

function HumanDetection() {
  const imgRef = useRef(null);
  const [boundingBox, setBoundingBox] = useState([]);
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      cocoSsd
        .load()
        .then((model: any) => {
          return model.detect(img);
        })
        .then((predictions: any) => {
          console.log('Predictions: ');
          console.log(predictions);
          setBoundingBox(predictions);
          return predictions;
        })
        .catch((error: any) => {
          console.error('Error:', error);
        });
    }
  }, [imgRef]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
      }}
    >
      {boundingBox.map((box, index) => (
        <div
          key={`${index + 1}`}
          style={{
            border: '4px solid red',
            position: 'absolute',
            top: `${box.bbox[1]}px`,
            left: `${box.bbox[0]}px`,
            width: `${box.bbox[2]}px`,
            height: `${box.bbox[3]}px`,
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
      />
    </div>
  );
}
export default HumanDetection;
