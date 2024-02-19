import React, { useRef, useEffect, useState } from 'react';

require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const cocoSsd = require('@tensorflow-models/coco-ssd');

function HumanDetection() {
  const [imageSrc, setImageSrc] = useState('../../../assets/test5.jpg');
  const imgRef = useRef(null);
  const [boundingBox, setBoundingBox] = useState([]);

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'humancheck',
      (dataUrl) => {
        console.log('humancheckイベントを受信しました。');
        // console.log(dataUrl);
        setImageSrc(dataUrl as string);
      },
    );

    return () => {
      removeListener();
    };
  }, []);

  // 画像を変更する関数（例えば、ボタンクリックで呼び出す）
  const onImageLoaded = () => {
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
  };

  // 画像を変更する関数（例えば、ボタンクリックで呼び出す）
  const changeImage = () => {
    window.electron.ipcRenderer.sendMessage('get-aiimage');
    // setImageSrc('../../../assets/test4.jpg');
  };

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
        onLoad={onImageLoaded}
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
        src={imageSrc}
      />
      <button type="button" onClick={changeImage}>
        画像を変更
      </button>
    </div>
  );
}
export default HumanDetection;
