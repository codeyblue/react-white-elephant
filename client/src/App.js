import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Dashboard from './Dashboard';
import Gameboard from './components/Gameboard';

const App = () => {
  const socket = io(`http://localhost:8080`, { autoConnect: false });

  useEffect(() => {
    socket.on('connection', () => {
      console.log('connected');
    });

    return () => {
      socket.off('connection');
      socket.off('active-participant-set');
      socket.off('final-round-set');
      socket.off('game-complete');
      socket.off('game-ready');
      socket.off('game-reset');
      socket.off('game-restarted');
      socket.off('game-started');
      socket.off('present-opened');
      socket.off('present-stolen');
      socket.off('presents-swapped');
    };
  }, [socket]);

  return (
    <div className="App">
    <Router>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/game/:id' element={<Gameboard socket={socket} username={'user1'} />} />
      </Routes>
    </Router>
    </div>
  );
}

export default App;
