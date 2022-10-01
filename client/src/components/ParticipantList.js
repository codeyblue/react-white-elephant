import { useCallback, useEffect, useState } from 'react';
import Participant from './Participant';

const ParticipantList = props => {
  const { gameId, gameStatus, activeChooser, putActiveChooser, participants, setParticipants } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchParticipants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/participants`);

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      setParticipants(data.sort((a, b) => { return a.turn - b.turn }));
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, [gameId]);
  
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

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
        turn: index
      };
    });
  };

  const setParticipantTurns = async () => {
    const order = shuffleParticipants();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/participants/set-turns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }
      const data = await response.json();
      setParticipants(data);
      putActiveChooser(data[0].id);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  };

  let participantContent = <p>No participants yet.</p>;
  
  if (participants.length > 0) {
    const transformedParticipants =
      participants.map(participant => <Participant key={participant.id} data={participant} activeChooser={activeChooser === participant.id} />);
    participantContent = <div key='Participant List'>{transformedParticipants}</div>
  }

  if (error) {
    participantContent = <p>{error}</p>;
  }

  if (isLoading) {
    participantContent = <p>Loading...</p>;
  }

  return (
    <div className='Participant List'>
      {(gameStatus !== 'inprogress' && gameStatus !== 'final_round') && <button onClick={setParticipantTurns}>Shuffle</button>}
      {participantContent}
    </div>
  );
};

export default ParticipantList;
