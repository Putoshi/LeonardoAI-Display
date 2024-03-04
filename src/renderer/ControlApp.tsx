import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './Control.css';
import ConsoleWindow from './components/ConsoleWindow';
import ResultQR from './components/ResultQR';

function TopView() {
  return (
    <div>
      {/* <WebcamAnalysis /> */}
      <ConsoleWindow />
      <ResultQR />
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
