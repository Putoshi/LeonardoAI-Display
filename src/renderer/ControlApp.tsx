import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './Control.css';

// import WebcamComponent from './components/WebcamComponent';
// import AIImageComponent from './components/AIImageComponent';
// import HumanDetection from './components/HumanDetection';
import ConsoleWindow from './components/ConsoleWindow';

function TopView() {
  return (
    <div>
      <ConsoleWindow />
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
