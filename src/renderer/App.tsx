import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import HumanDetection from './components/HumanDetection';

function TopView() {
  return (
    <div>
      <HumanDetection />
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
