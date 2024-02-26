// const getAIImageRequest = async () => {
//   window.electron.ipcRenderer.sendMessage('get-aiimage');

// };
import dummy from '../../../assets/people.png';
import WebcamComponent from './WebcamComponent';

function ConsoleWindow() {
  return (
    <div
      style={{
        position: 'absolute',
        marginLeft: '0',
        marginRight: '0',
        right: '0',
        top: '0',
        textAlign: 'center',
        zIndex: 100,
        width: '200px',
        height: '450px',
        padding: '5px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        style={{
          color: 'rgba(255, 255, 255, 1)',
          margin: '15px auto 10px',
          width: '90%',
          // height: '90%',
          position: 'relative',
        }}
      >
        <img
          src={dummy}
          alt="loading"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: '0',
            left: '0',
            zIndex: 10,
            opacity: 0.3,
          }}
        />
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
