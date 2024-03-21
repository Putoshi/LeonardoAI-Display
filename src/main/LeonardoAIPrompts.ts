// type LeonardoAIPromptProps = {};

// const prompt: string =
//   'The portrait depicts multiple figures and a heroic and graceful animal such as a hawk, tiger, wolf, deer, cat, antelope, or rabbit in the same space in a realistic manner. The figures are side by side, as in a commemorative photograph, with a single animal seated in the center. Only one animal is shown. The figures are all smiling and dressed in medieval European attire. The animals are present representing each type of animal, so there are no animals of more than one similar type.The portraits were painted to commemorate some event, and the atmosphere of the event is evident in the background. This enchanting motion picture captivates viewers with its exquisite precision and awe-inspiring artistry, immersing them in the compelling story from Middle-earth. (((Portraits))) , high detail, high quality, high resolution, dramatically captivating';

/** プロンプト */
const prompt: string =
  'Imagine a Art Nouveau box label for Fine Coffee with a $1 smile faintly';
// 'Imagine an Art Nouveau vintage novel cover designed by Alphonse Mucha with one $1';
// '$1 lives in Middle-earth.The portrait depicts ((one figures)) and a heroic and graceful multiple animals such as a hawk, bear, polar bear, chipmunk, pig, tiger, wolf, deer, cat, antelope, or rabbit in the same space in a realistic manner. Each type of animal depicted is one animal. The figures are side by side, as in a commemorative photograph, with a single human seated in the center. The figures are all smiling and dressed in medieval European attire. The animals are present representing each type of animal, so there are no animals of more than one similar type.The portraits were painted to commemorate some event, and the atmosphere of the event is evident in the background. This enchanting portrait captivates viewers with its exquisite precision and awe-inspiring artistry, immersing them in the compelling story from Middle-earth.  (((Portraits))) , high detail, high quality, high resolution, dramatically captivating';

/** ネガティブプロンプト */
const negativePrompt: string =
  '(($1)), ((NSFW)), ((Nude)), ((Nudity)),only a head, Melting, Two heads, no eye, two faces, plastic, deformed, blurry, bad anatomy, bad eyes, crossed eyes, disfigured, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, ((long neck)), long body, mutated hands and fingers, out of frame, blender, doll, cropped, low-res, close-up, poorly-drawn face, out of frame double, two heads, blurred, ugly, disfigured, too many fingers, deformed, repetitive, black and white, grainy, extra limbs, bad anatomy, high pass filter, airbrush, portrait, zoomed, soft light, smooth skin, closeup, deformed, extra fingers, mutated hands, bad anatomy, bad proportions, blind, bad eyes, ugly eyes, dead eyes, blur, vignette, out of shot, out of focus, gaussian, closeup, monochrome, grainy, noisy, text, writing, watermark, logo, oversaturation, over saturation, over shadow';

const prompts = {
  prompt,
  negative_prompt: negativePrompt,
} as const;

/** 顔解析結果によって年齢を補正する値 */
const correctionAge = 3;

const promptAry = [
  'Young Bernadette Peters',
  'Cate Blanchett',
  'Meg Ryan',
  'Drew Barrymore',
  // 'Audrey Hepburn',
];

/** プロンプトを顔解析結果によって編集して返却する関数 */
export const editPrompt: (interpolatedFace: any, idx: number) => any = (
  interpolatedFace: any,
  idx: number,
) => {
  const newPrompts = structuredClone(prompts);
  // console.log(interpolatedFace);

  // ここでプロンプトを編集
  // if (interpolatedFace.gender === 'male') {
  //   newPrompts.prompt = prompts.prompt.replace(
  //     '$1',
  //     `man around ${Math.floor(interpolatedFace.age) + correctionAge} years old`,
  //   );
  //   newPrompts.negative_prompt = prompts.negative_prompt.replace('$1', `woman`);
  // } else {
  //   newPrompts.prompt = prompts.prompt.replace(
  //     '$1',
  //     `woman around ${Math.floor(interpolatedFace.age) + correctionAge} years old`,
  //   );
  //   newPrompts.negative_prompt = prompts.negative_prompt.replace('$1', `man`);
  // }

  console.log('idx', idx);

  if (interpolatedFace.gender === 'male') {
    newPrompts.prompt = prompts.prompt.replace('$1', promptAry[idx]);
    // newPrompts.prompt = prompts.prompt.replace('$1', `Young Bernadette Peters`);
    newPrompts.negative_prompt = prompts.negative_prompt.replace('$1', `man`);
  } else {
    newPrompts.prompt = prompts.prompt.replace('$1', promptAry[idx]);
    //  Young Bernadette Peters(バーナデット・ピーターズ)
    //  Cate Blanchett (ケイト・ブランシェット)
    //  Meg Ryan
    // Drew Barrymore (ドリュー・バリモア)
    //  Audrey Hepburn (オードリー・ヘップバーン)

    newPrompts.negative_prompt = prompts.negative_prompt.replace('$1', `man`);
  }
  console.log('newPrompts.prompt', newPrompts.prompt);
  // console.log('newPrompts.negative_prompt', newPrompts.negative_prompt);

  return newPrompts;
};

export default { editPrompt };
