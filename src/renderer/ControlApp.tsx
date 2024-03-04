import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './Control.css';
import ConsoleWindow from './components/ConsoleWindow';
import WebcamAnalysis from './components/WebcamAnalysis';

function TopView() {
  return (
    <div>
      {/* <WebcamAnalysis /> */}
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
