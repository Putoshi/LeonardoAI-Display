// const getAIImageRequest = async () => {
//   window.electron.ipcRenderer.sendMessage('get-aiimage');

// };
// import dummy from '../../../assets/people.png';
import WebcamComponent from './WebcamComponent';

function ConsoleWindow() {
  return (
    <div
      style={{
        position: 'relative',
        margin: '0',
        textAlign: 'center',
        zIndex: 100,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 1)',
      }}
    >
      <div
        style={{
          color: 'rgba(255, 255, 255, 1)',
          width: '100%',
          position: 'relative',
        }}
      >
        <WebcamComponent />
      </div>
    </div>
  );
}
export default ConsoleWindow;
