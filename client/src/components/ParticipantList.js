import { useCallback, useEffect, useState } from 'react';
import Participant from './Participant';

const ParticipantList = props => {
  const { gameId, activeParticipant, participants, setParticipants } = props;
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
  }, [gameId, setParticipants]);
  
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  let participantContent = <p>No participants yet.</p>;
  
  if (participants.length > 0) {
    const transformedParticipants =
      participants.map(participant => <Participant key={`participant-${participant.id}`} data={participant} activeParticipant={activeParticipant === participant.id} />);
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
      {participantContent}
    </div>
  );
};

export default ParticipantList;
