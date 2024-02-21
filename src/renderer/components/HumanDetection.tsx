import React, { useRef, useEffect, useState } from 'react';

require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const cocoSsd = require('@tensorflow-models/coco-ssd');

const margin = 50;

function HumanDetection() {
  const [imageSrcs, setImageSrcs] = useState([[], [], [], []]);
  const imgRefs = useRef([]);
  const [personDetected, setPersonDetected] = useState(false);
  const [checking, setChecking] = useState();
  const [srcImgPath, setSrcImgPath] = useState('');
  // boundingBoxを配列の配列に変更
  const [boundingBoxes, setBoundingBoxes] = useState([[], [], [], []]);

  const [humanBBoxes, setHumanBBoxes] = useState([]);

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'human-check',
      (data) => {
        console.log('humancheckイベントを受信しました。');

        // 人間が検出されたかフラグを初期化
        setPersonDetected(false);

        // チェックフラグを初期化
        setChecking(true);

        // チェックしている画像のパスを設定
        setSrcImgPath(data.srcImgPath as string);

        // 判定に使うbase64画像を設定
        setImageSrcs(data.dataUrls as string[]);

        // boundingBoxesの初期化
        setBoundingBoxes([[], [], [], []]);

        // humanBBoxesの初期化
        setHumanBBoxes([]);
      },
    );

    return () => {
      removeListener();
    };
  }, []);

  useEffect(() => {
    // 画像の判定が終わった後の処理
    if (checking === false) {
      if (personDetected) {
        console.log('人間が検出されました');

        console.log('humanBBoxes', humanBBoxes);
        window.electron.ipcRenderer.sendMessage('human-detected', srcImgPath);
      } else {
        console.log('人間が検出されませんでした');
        window.electron.ipcRenderer.sendMessage('get-aiimage');
      }
    }
  }, [personDetected, srcImgPath, checking, humanBBoxes]);

  // 画像を変更する関数（例えば、ボタンクリックで呼び出す）
  const onImageLoaded = (index: number) => {
    const img = imgRefs.current[index];
    if (img) {
      cocoSsd
        .load()
        .then((model: any) => {
          return model.detect(img);
        })
        .then((predictions: any) => {
          console.log('Predictions: ', predictions);

          // classが'person'のpredictionsのみをフィルタリング
          const personPredictions = predictions.filter(
            (prediction: any) => prediction.class === 'person',
          );

          // console.log('personPredictions: ', personPredictions);

          if (personPredictions.length > 0 && !personDetected) {
            setPersonDetected(true);

            // バウンディングボックスの座標を4分割した座標系に直す
            const modifiedBBoxes = personPredictions.map((p: any) => {
              const [x, y, width, height] = p.bbox;
              const scale = 0.65; // 縮小率
              const modifiedWidth = width * scale;
              const modifiedHeight = height * scale;
              // indexに基づいて座標を調整
              const offsetX =
                index % 2 === 0 ? 0 : window.innerWidth * (1 - scale);
              const offsetY = index < 2 ? 0 : window.innerHeight * (1 - scale);
              const modifiedX = x * scale + offsetX;
              const modifiedY = y * scale + offsetY;
              return [
                modifiedX - margin,
                modifiedY - margin,
                modifiedWidth + margin * 2,
                modifiedHeight + margin * 2,
              ];
            });

            // バウンディングボックスを面積で降順に並び替え
            const sortedBBoxes = [...humanBBoxes, ...modifiedBBoxes].sort(
              (a, b) => {
                const areaA = (a[2] - a[0]) * (a[3] - a[1]); // aの面積 = 幅 * 高さ
                const areaB = (b[2] - b[0]) * (b[3] - b[1]); // bの面積 = 幅 * 高さ
                return areaB - areaA; // 降順に並び替え
              },
            );

            setHumanBBoxes(sortedBBoxes);
          }

          // boundingBoxesの更新処理を変更して、'person'のみを含む配列を使用
          setBoundingBoxes((prevBoundingBoxes) =>
            prevBoundingBoxes.map((box, i) =>
              i === index ? personPredictions : box,
            ),
          );

          // 画像の判定が終わったらチェックフラグをfalseにする
          if (index === 3) setChecking(false);

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
  };

  return (
    <div>
      {/* {personDetected && (
        <p
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            zIndex: 2,
          }}
        >
          人間が検出されました
        </p>
      )} */}
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          opacity: personDetected ? 1 : 0.5,
        }}
      >
        {humanBBoxes.length > 0 && (
          <div
            key={`box0`}
            style={{
              backgroundColor: 'rgba(125, 95, 220, 0.35)',
              position: 'absolute',
              top: `${humanBBoxes[0][1]}px`,
              left: `${humanBBoxes[0][0]}px`,
              width: `${humanBBoxes[0][2]}px`,
              height: `${humanBBoxes[0][3]}px`,
              zIndex: 4,
            }}
          />
        )}
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            id={`part${index + 1}`}
            style={{
              position: 'absolute',
              marginLeft: '0',
              marginRight: '0',
              right: '0',
              top: '0',
              textAlign: 'center',
              zIndex: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              transform: `scale(0.65, 0.65)`,
              transformOrigin: `${index % 2 === 0 ? '0' : '100%'} ${index < 2 ? '0' : '100%'}`,
            }}
          >
            {/* boundingBoxes[index]を使用して各画像に対応するboundingBoxを描画 */}
            {/* {boundingBoxes[index].map((box, boxIndex) => (
              <div
                key={`${boxIndex + 1}`}
                style={{
                  backgroundColor: 'rgba(255, 95, 170, 0.35)',
                  position: 'absolute',
                  top: `${box.bbox[1]}px`,
                  left: `${box.bbox[0]}px`,
                  width: `${box.bbox[2]}px`,
                  height: `${box.bbox[3]}px`,
                  zIndex: 1,
                }}
              />
            ))} */}
            <img
              crossOrigin="anonymous"
              ref={(el) => (imgRefs.current[index] = el)}
              alt=""
              onLoad={() => onImageLoaded(index)}
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
              src={imageSrcs[index]}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
        onClick={changeImage}
      >
        画像を変更
      </button>
    </div>
  );
}
export default HumanDetection;
