import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './Control.css';
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
