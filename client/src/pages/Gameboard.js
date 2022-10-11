import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ParticipantList from '../components/Participants/ParticipantList';
import PresentList from '../components/Presents/PresentList';

const Gameboard = ({ socket, user }) => {
  const {id} = useParams();
  const [game, setGame] = useState({});
  const [participants, setParticipants] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState();
  const [presents, setPresents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/games/${id}`, {
        headers: { 'Authorization': `Bearer ${user.token}`}
      });
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      setGame(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, [id, user.token]);

  useEffect(() => {
    socket.auth = {game: id, token: user.token};
    socket.connect();
    fetchGame();

    socket.on('active-participant-set', req => {
      console.log('active-participant-set');
      console.log(req);
      setGame(req);
    });

    socket.on('final-round-set', req => {
      console.log('final-round-set');
      console.log(req);
      setGame(req);
    });

    socket.on('game-complete', req => {
      console.log('game-complete');
      console.log(req);
      setGame(req);
    });

    socket.on('game-ready', req => {
      console.log('game-ready');
      console.log(req);
      setGame(req);
    });

    socket.on('game-reset', req => {
      console.log('game-reset');
      console.log(req);
      setGame(req.game);
      setParticipants(req.participants);
      setCurrentParticipant(req.participants.find(p => p.user_key === user.id));
      setPresents(req.presents);
    });

    socket.on('game-restarted', req => {
      console.log('game-restarted');
      console.log(req);
      setGame(req.game);
      setParticipants(req.participants);
      setCurrentParticipant(req.participants.find(p => p.user_key === user.id));
      setPresents(req.presents);
    });

    socket.on('game-started', req => {
      console.log('game-started')
      console.log(req);
      setGame(req.game);
      setParticipants(req.participants);
      setCurrentParticipant(req.participants.find(p => p.user_key === user.id));
    });

    socket.on('present-opened', req => {
      console.log('present-opened')
      console.log(req);
      setPresents(req.presents);
      setParticipants(req.participants);
      setCurrentParticipant(req.participants.find(p => p.user_key === user.id));
    });

    socket.on('present-stolen', req => {
      console.log('present-stolen');
      console.log(req);
      setPresents(req.presents);
      setParticipants(req.participants);
      setCurrentParticipant(req.participants.find(p => p.user_key === user.id));
      setGame(req.game);
    });

    socket.on('presents-swapped', req => {
      console.log('presents-swapped');
      console.log(req);
      setPresents(req.presents);
      setParticipants(req.participants);
      setCurrentParticipant(req.participants.find(p => p.user_key === user.id));
      setGame(req.game);
    });
  }, [fetchGame, socket, user.id]);

  const setGameReady = () => {
    console.log('Setting game to "ready"');
    socket.emit('set-game-ready');
  };

  const setGameStart = () => {
    console.log('Setting game to "start"');
    const order = shuffleParticipants();
    socket.emit('set-game-start', {order});
  };
  
  const setActiveParticipant = (pID, incrementRound) => {
    console.log('Setting active participant');
    socket.emit('set-active-participant', {participant: pID, incrementRound});
  };

  const setFinalRound = () => {
    console.log('Setting final round...');
    socket.emit('set-final-round');
  }

  const setGameComplete = () => {
    console.log('Setting game to complete...');
    socket.emit('set-game-complete');
  }

  const shuffleParticipants = () => {
    const ids = participants.map(participant => participant.id);

    let currentIndex = ids.length;
    let randomIndex;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [ids[currentIndex], ids[randomIndex]] = [ids[randomIndex], ids[currentIndex]];
    }

    return ids.map((id, index) => {
      return {
        participant: id,
        turn: index,
        user_key: participants.find(p => p.id === id).user_key
      };
    });
  };

  const pickNextParticipant = (action, previousHolder=null) => {
    let currentIndex = 0;
    let nextIndex = 0;
    let incrementRound = false;
    if (action === 'open') {
      currentIndex = participants.findIndex(p => p.turn === game.round);

      if (currentIndex + 1 < participants.length) {
        nextIndex = currentIndex + 1;
      } else {
        if (game.status === 'final_round') {
          setGameComplete();
          return;
        } else {
          setFinalRound();
        }
      }
      incrementRound = true;
    } else if (action === 'steal') {
      currentIndex = participants.findIndex(p => p.id === game.active_participant);
      nextIndex = participants.findIndex(p => p.user_key === previousHolder);
      if (game.status === 'final_round') {
        const nextUser = participants[nextIndex];
        if (presents.filter(p => p.holder !== nextUser.user_key && p.status !== 'locked').length <= 1) {
          console.log('final')
          setGameComplete();
          return;
        }
      }
    }

    setActiveParticipant(participants[nextIndex].id, incrementRound);
  }

  const resetGame = () => {
    console.log('Resetting game');
    socket.emit('reset-game');
  };

  const restartGame = () => {
    console.log('Restarting Game...');
    socket.emit('restart-game', {firstChooser: participants.find(p => p.turn === 0).id});
  };

  return (
    <>
    <p>{`${user.username} - ${user.first_name} ${user.last_name}`}</p>
    <div className="Gameboard" style={{ display: 'flex' }}>
      {
        game.administrator === user.id &&
        game.status === 'setup' &&
        <button onClick={setGameReady}>Ready</button>
      }
      {
        game.administrator === user.id &&
        game.status === 'ready' &&
        <button onClick={setGameStart}>Start Game</button>
      }
      {isLoading && <p>Loading...</p>}
      {error && <p>Error</p>}
      {!isLoading && <>
        <PresentList
          gameId={id}
          maxPresentSteal={game.rule_maxstealsperpresent}
          gameStatus={game.status}
          pickNextParticipant={pickNextParticipant}
          activeParticipant={participants.find(p => p.id === game.active_participant)}
          presents={presents}
          setPresents={setPresents}
          socket={socket}
          lastStolenPresent={game.last_stolen_present}
          currentParticipant={currentParticipant}
          user={user}
          />
        <ParticipantList
          gameId={id}
          activeParticipant={game.active_participant}
          setActiveParticipant={setActiveParticipant}
          gameStatus={game.status}
          participants={participants}
          setParticipants={setParticipants}
          socket={socket}
          setCurrentParticipant={setCurrentParticipant}
          user={user}
          />
        </>
      }
      <div>
        {
          game.administrator === user.id &&
          ['inprogress', 'final_round', 'complete'].includes(game.status) &&
          <>
            <button onClick={restartGame}>Restart Game</button>
            <button onClick={resetGame}>Reset Game</button>
          </>
        }
        {
          user.id &&
          game.status === 'final_round' &&
          <button onClick={setGameComplete}>Complete Game</button>
        }
      </div>
    </div></>
  );
}

export default Gameboard;
