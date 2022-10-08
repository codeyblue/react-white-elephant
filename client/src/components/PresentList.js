import { useCallback, useEffect, useState } from "react";
import Present from './Present';
import './Present.css';

const PresentList = props => {
  const { gameId, maxPresentSteal, gameStatus, presents, setPresents, socket, pickNextParticipant, lastStolenPresent } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPresents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/presents`);
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();

      setPresents(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, [gameId, setPresents]);

  useEffect(() => {
    fetchPresents();
  }, [fetchPresents]);

  let presentContent = <p>No presents yet.</p>

  if (presents.length > 0) {
    const transformedPresents = 
      presents.map(present => 
        <Present
          key={`present-${present.id}`}
          data={present}
          gameStatus={gameStatus}
          maxPresentSteal={maxPresentSteal}
          gameId={gameId}
          currentParticipant={props.currentParticipant}
          activeParticipant={props.activeParticipant}
          socket={socket}
          pickNextParticipant={pickNextParticipant}
          lastStolenPresent={lastStolenPresent}
          />
      );
    presentContent = <div key='Present List'>{transformedPresents}</div>
  }

  if (error) {
    presentContent = <p>{error}</p>;
  }

  if (isLoading) {
    presentContent = <p>Loading...</p>;
  }

  return (
    <div className='present-list'>
      {presentContent}
    </div>
  );
};

export default PresentList;