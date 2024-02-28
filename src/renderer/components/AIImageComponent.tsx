const getAIImageRequest = async () => {
  window.electron.ipcRenderer.sendMessage('get-aiimage');
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
