import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import Dashboard from './pages/Dashboard';
import Gameboard from './pages/Gameboard';
import Login from './components/Users/Login';
import Register from './components/Users/Register';

const App = () => {
  const [user, setUser] = useState();

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

  if (!user) {
    return <Login setUser={setUser} />
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path='/' element={<Register />}/>
          <Route path='/login' element={<Login setUser={setUser} />} />
          <Route path='/dashboard' element={<Dashboard user={user} />} />
          <Route path='/game/:id' element={<Gameboard socket={socket} user={user} />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
