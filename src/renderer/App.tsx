import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';

import WebcamComponent from './components/WebcamComponent';
import AIImageComponent from './components/AIImageComponent';
import HumanDetection from './components/HumanDetection';

function TopView() {
  return (
    <div>
      <HumanDetection />
      {/* <WebcamComponent /> */}
      {/* <AIImageComponent /> */}
      {/* <div className="TopView">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>electron-react-boilerplate</h1>
      <div className="TopView">
        <a
          href="https://electron-react-boilerplate.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              📚
            </span>
            Read our docs
          </button>
        </a>
        <a
          href="https://github.com/sponsors/electron-react-boilerplate"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="folded hands">
              🙏
            </span>
            Donate
          </button>
        </a>
      </div> */}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TopView />} />
      </Routes>
    </Router>
  );
}
