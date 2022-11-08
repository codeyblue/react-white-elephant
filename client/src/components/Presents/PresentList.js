import { useCallback, useEffect, useState } from "react";
import Present from './Present';
import './Present.css';

const PresentList = props => {
  const { gameId, round, maxPresentSteal, gameStatus, presents, setPresents, socket, pickNextParticipant, lastStolenPresent, user, setModalState } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPresents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/presents`,
        {headers: { 'Authorization': `Bearer ${user.token}` }});
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();

      setPresents(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, [gameId, setPresents, user.token]);

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
          currentParticipant={props.currentParticipant}
          activeParticipant={props.activeParticipant}
          socket={socket}
          pickNextParticipant={pickNextParticipant}
          lastStolenPresent={lastStolenPresent}
          setModalState={setModalState}
          gameId={gameId}
          user={user}
          round={round}
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