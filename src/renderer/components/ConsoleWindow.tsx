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
        // padding: '5px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          color: 'rgba(255, 255, 255, 1)',
          // margin: '15px auto 10px',
          width: '100%',
          // height: '90%',
          position: 'relative',
        }}
      >
        <WebcamComponent />
      </div>
      <p
        style={{
          color: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1,
          margin: '0',
          width: '100%',
          textAlign: 'center',
          fontWeight: 'bold',
          fontFamily: 'Apple Chancery, cursive',
          fontSize: '20px',
          letterSpacing: '2px',
        }}
      >
        Image Generating...
      </p>
    </div>
  );
}
export default ConsoleWindow;
