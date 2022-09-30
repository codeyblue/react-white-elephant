import PresentList from './PresentList';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ParticipantList from './ParticipantList';

const Gameboard = () => {
  const {id} = useParams();
  const [game, setGame] = useState({});
  const [participants, setParticipants] = useState([]);
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
      setGame({...game, active_chooser: pID})
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
    } catch (erro) {
      setError(error.message);
    }
    await fetchGame();
  }

  const pickNextChooser = () => {
    let currentIndex = participants.findIndex(p => p.id === game.active_chooser);
    let nextIndex = 0;

    if (currentIndex + 1 < participants.length) {
      nextIndex = currentIndex + 1;
    } else {
      if (game.status === 'final_round') {
        setGameComplete();
        putActiveChooser(null);
        return;
      } else {
        setFinalRound();
      }
      console.log(game);
    }

    putActiveChooser(participants[nextIndex].id);
    console.log(currentIndex);
    console.log(nextIndex);
  }

  const setGameStart = async () => {
    await postGameStart();
    await fetchGame();
  }

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
    </div>
  );
}

export default Gameboard;
