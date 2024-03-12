import { useRef, useEffect, useState } from 'react';
import LeonardoAIOptions from '../../main/LeonardoAIOptions';

require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const cocoSsd = require('@tensorflow-models/coco-ssd');

let margin = 10;

/**
 * コンソール画面に表示する人間判定のコンポーネント
 * @returns
 */
function HumanDetection() {
  const [imageSrcs, setImageSrcs] = useState<string[]>([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const imgRefs = useRef([]);

  const [personDetected, setPersonDetected] = useState<boolean>(false);
  const [compositDone, setCompositDone] = useState<boolean>(false);
  const [compositImageSrc, setCompositImageSrc] = useState<string>('');
  const [personChecking, setPersonChecking] = useState<boolean>(false);
  const [srcImgPath, setSrcImgPath] = useState<string>('');
  // boundingBoxを配列の配列に変更
  const [boundingBoxes, setBoundingBoxes] = useState([
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
    [],
  ]);

  const [humanBBoxes, setHumanBBoxes] = useState<number[][]>();

  useEffect(() => {
    const removeHumanCheckEveListener = window.electron.ipcRenderer.on(
      'human-check',
      (data: { srcImgPath: string; dataUrls: string[] }) => {
        console.log('humancheckイベントを受信しました。');

        // 人間が検出されたかフラグを初期化
        setPersonDetected(false);

        // チェックフラグを初期化
        setPersonChecking(true);

        // チェックしている画像のパスを設定
        setSrcImgPath(data.srcImgPath as string);

        // 判定に使うbase64画像を設定
        setImageSrcs(data.dataUrls as string[]);

        // boundingBoxesの初期化
        setBoundingBoxes([[], [], [], [], [], [], [], [], []]);

        // humanBBoxesの初期化
        setHumanBBoxes([]);

        setCompositImageSrc(''); // 画像をクリア

        setCompositDone(false);
      },
    );

    const removeGeneDoneEveListener = window.electron.ipcRenderer.on(
      'generate-complete',
      (data: { dataUrl: string }) => {
        console.log('generate-completeイベントを受信しました。');
        setCompositDone(true);
        setCompositImageSrc(data.dataUrl as string);
      },
    );

    const removeGeneStartEveListener = window.electron.ipcRenderer.on(
      'generate-start',
      () => {
        console.log('generate-startイベントを受信しました。');
        // setCompositDone(false);
      },
    );

    const removeConfigEveListener = window.electron.ipcRenderer.on(
      'get-config-reply',
      (e: any) => {
        margin = e.margin;
      },
    );
    window.electron.ipcRenderer.sendMessage('get-config');

    return () => {
      removeHumanCheckEveListener();
      removeGeneDoneEveListener();
      removeGeneStartEveListener();
      removeConfigEveListener();
    };
  }, []);

  useEffect(() => {
    // srcImgPathが有効な値を持っているかチェック
    if (srcImgPath) {
      // 画像の判定が終わった後の処理
      if (!personChecking) {
        if (personDetected) {
          console.log('人間が検出されました');

          console.log('humanBBoxes', humanBBoxes);
          const scale = LeonardoAIOptions.width / window.innerWidth;

          window.electron.ipcRenderer.sendMessage('human-detected', {
            srcImgPath,
            humanBBox: [
              Math.floor(humanBBoxes[0][0] * scale),
              Math.floor(humanBBoxes[0][1] * scale),
              Math.floor(humanBBoxes[0][2] * scale),
              Math.floor(humanBBoxes[0][3] * scale),
            ],
          });
        } else {
          console.log('人間が検出されませんでした');
          window.electron.ipcRenderer.sendMessage('get-aiimage-retry');
        }
      }
    }
  }, [personDetected, srcImgPath, personChecking, humanBBoxes]);

  // 画像の枠を超えないようにバウンディングボックスの座標を調整するための関数
  const adjustBBoxesToImageBounds = (bboxes: number[][]) => {
    return bboxes.map((bbox) => {
      let [x, y, width, height] = bbox;
      if (x < 0) {
        width += x;
        x = 0;
      } else if (x + width > window.innerWidth) {
        width = window.innerWidth - x;
      }
      if (y < 0) {
        height += y;
        y = 0;
      } else if (y + height > window.innerHeight) {
        height = window.innerHeight - y;
      }
      // 調整後のバウンディングボックスの座標を返す
      return [x, y, width, height];
    });
  };

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
                Math.floor(modifiedX - margin),
                Math.floor(modifiedY - margin),
                Math.floor(modifiedWidth + margin * 2),
                Math.floor(modifiedHeight + margin * 2),
              ];
            });

            console.log(modifiedBBoxes);

            // modifiedBBoxesの計算後に呼び出し
            const adjustedBBoxes = adjustBBoxesToImageBounds(modifiedBBoxes);

            // バウンディングボックスを面積で降順に並び替え
            const sortedBBoxes = [...humanBBoxes, ...adjustedBBoxes].sort(
              (a: number[], b: number[]) => {
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
          if (index === 3) setPersonChecking(false);

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
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          filter: compositDone ? 'grayscale(0)' : 'grayscale(1)',
          transition: 'filter 1.5s',
        }}
      >
        {compositDone && (
          <img
            crossOrigin="anonymous"
            alt=""
            style={{
              position: 'absolute',
              marginLeft: 'auto',
              marginRight: 'auto',
              left: '0',
              right: '0',
              textAlign: 'center',
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 100,
              opacity: 0,
              transition: 'opacity 1s',
            }}
            onLoad={(e) => (e.currentTarget.style.opacity = '1')} // 追加
            src={compositImageSrc}
          />
        )}

        {humanBBoxes?.length > 0 && (
          <div
            key={`box0`}
            style={{
              // backgroundColor: 'rgba(125, 95, 220, 0.35)',
              position: 'absolute',
              top: `${humanBBoxes[0][1]}px`,
              left: `${humanBBoxes[0][0]}px`,
              width: `${humanBBoxes[0][2]}px`,
              height: `${humanBBoxes[0][3]}px`,
              zIndex: 4,
              border: `solid 4px red`,
            }}
          />
        )}

        {imageSrcs.map((src, index) => (
          <div
            key={index}
            id={`part${index + 1}`}
            style={{
              position: 'absolute',
              marginLeft: '0',
              marginRight: '0',
              left: `${index % 3 === 2 ? 'calc(66.66% - 10%)' : index % 3 === 1 ? 'calc(33.33% - 5%)' : '0'}`,
              top: `${index >= 6 ? 'calc(66.66% - 10%)' : index >= 3 ? 'calc(33.33% - 5%)' : '0'}`,
              textAlign: 'center',
              zIndex: 0,
              width: 'calc(33.33% + 10%)',
              height: 'calc(33.33% + 10%)',
              objectFit: 'fill',
            }}
          >
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
              src={src}
            />
          </div>
        ))}
      </div>
      {/* <button
        type="button"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 102,
        }}
        onClick={changeImage}
      >
        画像を変更
      </button> */}
    </div>
  );
}
export default HumanDetection;
