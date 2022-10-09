import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import Dashboard from './Dashboard';
import Gameboard from './components/Gameboard';
import Login from './components/Login';
import Register from './components/Register';

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

  return (
    <div className="App">
      {console.log(user)}
      <Router>
        {
          !user && <>
            <p>Login instead?</p>
            <Link to='/login'>Login</Link>
            <Register />
          </>
        }
        <Routes>
          <Route path='/' element={<Dashboard />} />
          <Route path='/game/:id' element={<Gameboard socket={socket} user={user} />} />
          <Route path='/login' element={<Login setUser={setUser} />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
