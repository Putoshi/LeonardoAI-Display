import React from 'react';
import env from '../../../env/env.development';
// const env = process.env;

type AIImageComponentProps = {};

// const getAIImage = async (generationId) => {
//   const options = {
//     method: 'GET',
//     headers: {
//       accept: 'application/json',
//       'content-type': 'application/json',
//       authorization: `Bearer ${env.LEONARDAI_API_KEY}`,
//     },
//   };

//   const fetchImage = () => {
//     fetch(`${env.LEONARDAI_API_URL}/generations/${generationId}`, options)
//       .then((response) => response.json())
//       .then((response) => {
//         if (response.generations_by_pk.status === 'PENDING') {
//           setTimeout(fetchImage, 3000); // 3秒後に再取得
//         } else {
//           console.log(response); // 最終的なレスポンスを処理
//         }
//       })
//       .catch((err) => console.error(err));
//   };

//   fetchImage();
// };

const getAIImageRequest = async () => {
  window.electron.ipcRenderer.sendMessage('get-aiimage');
  // console.log('getAIImageRequest');
  // // console.log(env.LEONARDAI_API_URL);
  // const options = {
  //   method: 'POST',
  //   headers: {
  //     accept: 'application/json',
  //     'content-type': 'application/json',
  //     authorization: `Bearer ${env.LEONARDAI_API_KEY}`,
  //   },
  //   body: JSON.stringify({
  //     height: 512,
  //     modelId: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
  //     prompt: 'An oil painting of a cat',
  //     width: 512,
  //   }),
  // };

  // fetch(`${env.LEONARDAI_API_URL}/generations`, options)
  //   .then((response) => response.json())
  //   .then((response) => {
  //     console.log(response.sdGenerationJob.generationId);
  //     getAIImage(response.sdGenerationJob.generationId);
  //   })
  //   .catch((err) => console.error(err));
};

function AIImageComponent() {
  return (
    <div>
      <button type="button" onClick={getAIImageRequest}>
        GET AI IMAGE
      </button>
    </div>
  );
}
export default AIImageComponent;
