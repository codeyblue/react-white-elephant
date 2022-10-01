import PresentList from './PresentList';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ParticipantList from './ParticipantList';

const Gameboard = () => {
  const {id} = useParams();
  const [game, setGame] = useState({});
  const [participants, setParticipants] = useState([]);
  const [presents, setPresents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/games/${id}`);
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      setGame(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const setGameReady = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/ready`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      await response;
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
    await fetchGame();
  };

  const postGameStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/start`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }
      await response;
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  };
  
  const putActiveChooser = async pID => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/active-chooser`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participant: pID })
      });

      if(!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      await fetchGame();
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  };

  const setFinalRound = async () => {
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/final-round`, {
        method: 'PUT'
      });

      if(!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response;
    } catch (error) {
      setError(error.message);
    }
    await fetchGame();
  }

  const setGameComplete = async () => {
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/complete`, {
        method: 'PUT'
      });

      if(!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response;
    } catch (error) {
      setError(error.message);
    }
    await fetchGame();
  }

  const incrementRound = async (round) => {
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/increment-round`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round })
      });

      if(!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response;
    } catch (error) {
      setError(error.message);
    }
    await fetchGame();
  };

  const pickNextChooser = async (action, previousHolder=null) => {
    let currentIndex = 0;
    let nextIndex = 0;
    if (action === 'open') {
      currentIndex = participants.findIndex(p => p.turn === game.round);

      if (currentIndex + 1 < participants.length) {
        nextIndex = currentIndex + 1;
      } else {
        if (game.status === 'final_round') {
          await setGameComplete();
          await putActiveChooser(null);
          return;
        } else {
          await setFinalRound();
        }
      }
      incrementRound(nextIndex);
    } else if (action === 'steal') {
      currentIndex = participants.findIndex(p => p.id === game.active_chooser);
      nextIndex = participants.findIndex(p => p.user_key === previousHolder);
      if (game.status === 'final_round') {
        const nextUser = participants[nextIndex];
        if (presents.filter(p => p.holder !== nextUser.user_key && p.status !== 'locked').length <= 1) {
          console.log('final')
          await setGameComplete();
          return;
        }
      }
    }

    await putActiveChooser(participants[nextIndex].id);
  }

  const setGameStart = async () => {
    await postGameStart();
    await fetchGame();
  }

  const resetGame = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/reset`, {
        method: 'PUT'
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response;
    } catch (error) {
      setError(error);
    }

    await fetchGame();
  };

  return (
    <div className="Gameboard" style={{ display: 'flex' }}>
      { game.status === 'setup' &&
        <button onClick={setGameReady}>Ready</button>
      }
      {
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
          pickNextChooser={pickNextChooser}
          activeChooser={participants.find(p => p.id === game.active_chooser)}
          presents={presents}
          setPresents={setPresents}
          />
        <ParticipantList
          gameId={id}
          activeChooser={game.active_chooser}
          putActiveChooser={putActiveChooser}
          gameStatus={game.status}
          participants={participants}
          setParticipants={setParticipants}
          />
        </>
      }
      <div>
        {
          (game.status === 'inprogress' || game.status === 'final_round' || game.status === 'completed') &&
          <button onClick={resetGame}>Restart Game</button>
        }
        {
          (game.status === 'inprogress' || game.status === 'final_round') &&
          <>
          <button onClick={resetGame}>Reset Game</button>
          <button>Pause Game</button>
          <button>Stop Game</button></>
        }
        {
          game.status === 'final_round' &&
          <button onClick={setGameComplete}>Complete Game</button>
        }
      </div>
    </div>
  );
}

export default Gameboard;
