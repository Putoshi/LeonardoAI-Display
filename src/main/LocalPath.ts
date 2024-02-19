import path from 'path';
import { app } from 'electron';

const getTmpFolderPath: () => string = () => {
  return path.join(app.getPath('downloads'), 'tmp/');
};
export { getTmpFolderPath };
