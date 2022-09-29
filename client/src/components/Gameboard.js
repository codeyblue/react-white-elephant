import Participant from './Participant';
import Present from './Present';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const mockGameData = require('../mockGameData.json');


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
  }, []);

  const fetchParticipants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/participants`);
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      setParticipants(data);
      console.log(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, []);

  const fetchPresents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${id}/presents`);
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();

      let tempPresents = [];
      const uniquePresents = [...new Set(data.map(item => item.id))];
      uniquePresents.forEach(id => {
        const d = data.find(d => d.id === id);
        const history = data.filter(h => h.id === id).map(h => { return { event: h.event }});
        tempPresents.push({
          id,
          gifter: d.gifter,
          status: d.status,
          holder: d.holder,
          history,
          maxSteals: game.rule_maxstealsperpresent && history.length >= game.rule_maxstealsperpresent ?
            true :
            false
        });
      });

      setPresents(tempPresents);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, []);

  const openPresent = async id => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/open-present/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: mockGameData.currentUser })
      });

      const data = await response.json();

      setPresents(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
    await fetchPresents();
  }

  const stealPresent = async present => {
    if (present.maxSteals) {
      return;
    }

    const lock = present.history.length + 1 >= game.rule_maxstealsperpresent;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/steal-present/${present.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: mockGameData.currentUser, to: mockGameData.nextUser, lock })
      });

      const data = await response.json();

      setPresents(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
    await fetchPresents();
  }

  useEffect(() => {
    fetchGame();
    fetchParticipants();
    fetchPresents();
  }, [fetchGame, fetchParticipants, fetchPresents]);

  let participantContent = <p>No participants yet.</p>,
    presentContent = <p>No presents yet.</p>;
  
  if (participants.length > 0) {
    const transformedParticipants =
      participants.map(participant => <Participant key={participant.id} data={participant} />);
    participantContent = <div key='Participant List'>{transformedParticipants}</div>
  }

  if (presents.length > 0) {
    const transformedPresents = 
      presents.map(present => <Present key={present.id} data={present} onPresentOpen={openPresent} onPresentSteal={stealPresent} />);
    presentContent = <div key='Present List'>{transformedPresents}</div>
  }

  if (error) {
    presentContent = <p>{error}</p>;
  }

  if (isLoading) {
    presentContent = <p>Loading...</p>;
  }

  return (
    <div className="Gameboard">
      {participantContent}
      {presentContent}
    </div>
  );
}

export default Gameboard;
