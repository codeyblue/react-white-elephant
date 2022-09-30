import { useState } from "react";
import './Present.css';

const mockGameData = require('../mockGameData.json');

const Present = props => {
  const { gameId, gameStatus, maxPresentSteal } = props;
  const [data, setData] = useState(props.data);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const openPresent = async id => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/open-present/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: mockGameData.currentUser })
      });

      const data = await response.json();
      setData(data);
    } catch (error) {
      setError(error.message);
    }
    props.pickNextChooser();
    setIsLoading(false);
  };

  const stealPresent = async present => {
    if (present.maxSteals) {
      return;
    }

    const lock = present.history.length + 1 >= maxPresentSteal;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/steal-present/${present.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: mockGameData.currentUser, to: mockGameData.nextUser, lock })
      });

      const data = await response.json();
      setData(data);
    } catch (error) {
      setError(error.message);
    }
    props.pickNextChooser();
    setIsLoading(false);
  }

  return (
    <div className='present'>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error</p>}
      {!isLoading && (<>
        Present <br />
        Gifter: {data.gifter} <br />
        Holder: {(data.holder && `${data.holder}`) || ''} <br />
        {
          gameStatus === 'inprogress' &&
          data.status === 'wrapped' &&
          <button onClick={() => openPresent(data.id)}>Open</button>
        }
        {
          (gameStatus === 'inprogress' || gameStatus === 'final_round') &&
          data.status === 'open' &&
          <>
            History: {`${JSON.stringify(data.history)}`}
            <button onClick={() => stealPresent(data)}>Steal</button>
          </>
        } <br />
        Max Steals: {`${data.maxSteals}`}
      </>)}
    </div>
  );
};

export default Present;