import { useRef, useEffect, useState } from 'react';
import { Human, Config, DrawOptions } from '@vladmandic/human';
import LeonardoAIOptions from '../../main/LeonardoAIOptions';

require('@tensorflow/tfjs-backend-cpu');
require('@tensorflow/tfjs-backend-webgl');
const cocoSsd = require('@tensorflow-models/coco-ssd');

let margin = 10;

const config: Partial<Config> = {
  backend: 'webgl',
  async: true,
  face: {
    enabled: true, // 顔検出を有効にする
  },
  body: {
    enabled: true, // 体の検出を有効にする
  },
  hand: {
    enabled: false, // 手の検出を無効にする
  },
};
const human = new Human(config);

const scale = LeonardoAIOptions.width / window.innerWidth;

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
          // const scale = LeonardoAIOptions.width / window.innerWidth;

          // window.electron.ipcRenderer.sendMessage('human-detected', {
          //   srcImgPath,
          //   humanBBox: [
          //     Math.floor(humanBBoxes[0][0] * scale),
          //     Math.floor(humanBBoxes[0][1] * scale),
          //     Math.floor(humanBBoxes[0][2] * scale),
          //     Math.floor(humanBBoxes[0][3] * scale),
          //   ],
          // });
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
  const onImageLoaded = async (index: number) => {
    const img = imgRefs.current[index];
    if (img) {
      try {
        const result = await human.detect(img);

        // 顔検出の結果をフィルタリング
        const facePredictions = result.face.filter(
          (prediction) => prediction.faceScore > 0.8,
        );

        console.log(`${index} facePredictions: `, facePredictions);

        if (facePredictions.length > 0 && !personDetected) {
          setPersonDetected(true);

          // 顔検出結果に基づいてバウンディングボックスを処理
          const modifiedBBoxes = facePredictions.map((prediction) => {
            const { box } = prediction;
            // const scale = 0.65; // 縮小率
            // console.log('scale', scale);

            const modifiedWidth = box[2];
            const modifiedHeight = box[3];
            // indexに基づいて座標を調整
            const offsetX =
              index % 3 === 2
                ? window.innerWidth * (0.6666 - 0.1)
                : index % 3 === 1
                  ? window.innerWidth * (0.3333 - 0.05)
                  : index % 3 === 0
                    ? 0
                    : 0;
            const offsetY =
              index >= 6
                ? window.innerHeight * (0.6666 - 0.1)
                : index >= 3
                  ? window.innerHeight * (0.3333 - 0.05)
                  : 0;

            // const offsetX =
            //   index % 2 === 0 ? 0 : window.innerWidth * (1 - scale);
            // const offsetY = index < 2 ? 0 : window.innerHeight * (1 - scale);
            // console.log(index);
            console.log([
              box[0] + offsetX * scale,
              box[1] + offsetY * scale,
              modifiedWidth,
              modifiedHeight,
            ]);

            const modifiedX = box[0] / scale + offsetX;
            const modifiedY = box[1] / scale + offsetY;

            // console.log([
            //   modifiedX,
            //   modifiedY,
            //   modifiedWidth / scale,
            //   modifiedHeight / scale,
            // ]);
            // console.log([
            //   Math.floor(modifiedX - margin / scale),
            //   Math.floor(modifiedY - margin / scale),
            //   Math.floor(modifiedWidth + (margin * 2) / scale),
            //   Math.floor(modifiedHeight + (margin * 2) / scale),
            // ]);
            // return [
            //   Math.floor(modifiedX - margin / scale),
            //   Math.floor(modifiedY - margin / scale),
            //   Math.floor(modifiedWidth + (margin * 2) / scale),
            //   Math.floor(modifiedHeight + (margin * 2) / scale),
            // ];
            return [
              Math.floor(modifiedX),
              Math.floor(modifiedY),
              Math.floor(modifiedWidth / scale),
              Math.floor(modifiedHeight / scale),
            ];
          });

          console.log(modifiedBBoxes);

          // modifiedBBoxesの計算後に呼び出し
          const adjustedBBoxes = adjustBBoxesToImageBounds(modifiedBBoxes);

          // バウンディングボックスを面積で降順に並び替え
          const sortedBBoxes = [...humanBBoxes, ...adjustedBBoxes].sort(
            (a, b) => {
              const areaA = (a[2] - a[0]) * (a[3] - a[1]); // aの面積 = 幅 * 高さ
              const areaB = (b[2] - b[0]) * (b[3] - b[1]); // bの面積 = 幅 * 高さ
              return areaB - areaA; // 降順に並び替え
            },
          );

          setHumanBBoxes(sortedBBoxes);
        }

        // 画像の判定が終わったらチェックフラグをfalseにする
        // if (index === imageSrcs.length - 1) setPersonChecking(false);
      } catch (error) {
        console.error('Error:', error);
      }
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
