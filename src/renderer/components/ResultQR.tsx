import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
// import ResultImageAtom from '../states/ResultImageAtom';

/** 環境設定をロード */
const environmentConfig = require(
  `../../../env/env.${process.env.NODE_ENV}.js`,
); // eslint-disable-line

function ResultQR() {
  const [qrUrl, setQrUrl] = useState('');
  // const [resultImage] = useAtom(ResultImageAtom);

  // useEffect(() => {
  //   console.log(environmentConfig);
  // }, []);

  useEffect(() => {
    const removeListener = window.electron.ipcRenderer.on(
      'generate-qr',
      (data: any) => {
        console.log('generate-qr', data);
        setQrUrl(data.qrUrl);
      },
    );

    return () => {
      removeListener();
    };
  }, []);

  // useEffect(() => {
  //   if (resultImage) {
  //     const postData = async () => {
  //       console.log('postData', resultImage);

  //       try {
  //         const response = await axios.post(
  //           environmentConfig.IMAGE_UPLOADER_API_URL,
  //           {
  //             image: resultImage,
  //           },
  //           {
  //             headers: {
  //               'Content-Type': 'application/json',
  //               'x-api-key': environmentConfig.IMAGE_UPLOADER_API_KEY,
  //             },
  //           },
  //         );
  //         console.log('画像をアップロードしました:', response.data.uploadPath);
  //         setQrUrl(response.data.uploadPath);
  //       } catch (error) {
  //         console.error('QRコードの生成に失敗しました:', error);
  //       }
  //     };
  //     postData();
  //   }
  // }, [resultImage]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        zIndex: '1000',
        transform: 'scale(1.2)',
        transformOrigin: 'right bottom',
      }}
    >
      {qrUrl ? (
        <QRCode value={qrUrl} size={256} level={'H'} includeMargin={true} />
      ) : (
        <p></p>
      )}
    </div>
  );
}

export default ResultQR;
