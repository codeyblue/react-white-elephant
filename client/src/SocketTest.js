import { io } from 'socket.io-client';
import Present from './components/Present';

const SocketTest = () => {
  const mockPresent = {
    id: 7,
    gifter: 2,
    status: 'open',
    holder: 1,
    game_key: 2,
    history: [{ id: 0, event: 'open'}, { id: 1, event: 'steal' }]
  };

  const socket = io(`http://localhost:8080`)

  socket.on('connection', () => {
    console.log('socket connection')
  });

  socket.on('present-opened', req => {
    console.log(req);
  });

  socket.on('present-stolen', req => {
    console.log(req);
  });

  socket.on('presents-swapped', req => {
    console.log(req);
  });

  const emitEvent = () => {
    socket.emit('event');
  }

  return (
    <div className="App">
      <Present
        data={mockPresent}
        gameId={2}
        gameStatus={'final_round'}
        socket={socket}
        maxSteals={3}
        currentUser={{user_key: 2, present_key: 2}} />
    </div>
  );
}

export default SocketTest;