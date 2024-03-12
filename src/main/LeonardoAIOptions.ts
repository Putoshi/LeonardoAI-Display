// type LeonardoAIPromptProps = {};

// const prompt: string =
//   'The portrait depicts multiple figures and a heroic and graceful animal such as a hawk, tiger, wolf, deer, cat, antelope, or rabbit in the same space in a realistic manner. The figures are side by side, as in a commemorative photograph, with a single animal seated in the center. Only one animal is shown. The figures are all smiling and dressed in medieval European attire. The animals are present representing each type of animal, so there are no animals of more than one similar type.The portraits were painted to commemorate some event, and the atmosphere of the event is evident in the background. This enchanting motion picture captivates viewers with its exquisite precision and awe-inspiring artistry, immersing them in the compelling story from Middle-earth. (((Portraits))) , high detail, high quality, high resolution, dramatically captivating';

const alchemy: boolean = false;
const height: number = 1280;
const width: number = 720;
const guidanceScale: number = 7;
const highContrast: boolean = true;
const modelId: string = '1e60896f-3c26-4296-8ecc-53e2afecc132';
const numImages: number = 1;
const photoReal: boolean = false;
const presetStyle: string = 'DYNAMIC';
const promptMagic: boolean = true;
const promptMagicStrength: number = 0.25;
const promptMagicVersion: string = 'v2';
const setPublic: boolean = true;
const scheduler: string = 'LEONARDO';
const sdVersion: string = 'SDXL_0_9';

const options = {
  height,
  modelId,
  width,
  alchemy,
  guidance_scale: guidanceScale,
  highContrast,
  num_images: numImages,
  photoReal,
  presetStyle,
  promptMagic,
  promptMagicStrength,
  promptMagicVersion,
  public: setPublic,
  scheduler,
  sd_version: sdVersion,
} as const;

export default options;
