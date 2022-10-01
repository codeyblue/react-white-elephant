import { useState } from "react";
import './Present.css';

const Present = props => {
  const { gameId, gameStatus, maxPresentSteal, currentUser } = props;
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
        body: JSON.stringify({ user: currentUser.user_key })
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      setError(error.message);
    }
    await props.pickNextChooser('open');
    setIsLoading(false);
  };

  const stealPresent = async present => {
    if (present.maxSteals) {
      return;
    }

    const previousHolder = present.holder;
    const lock = present.history.length + 1 >= maxPresentSteal;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/steal-present/${present.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: previousHolder, to: currentUser.user_key, lock })
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      setData(data);
    } catch (error) {
      setError(error.message);
    }
    await props.pickNextChooser('steal', previousHolder);
    setIsLoading(false);
  }

  const swapPresents = async present => {
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/swap-presents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { user: currentUser.user_key, present: currentUser.current_present_key },
          to: { user: present.holder, present: present.id }
        })
      });

      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response;
    } catch (error) {
      setError(error);
    }
    await props.pickNextChooser('steal', present.holder);
  };

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
          currentUser &&
          data.holder !== currentUser.user_key &&
          gameStatus === 'inprogress' &&
          data.status === 'open' &&
          <>
            History: {`${JSON.stringify(data.history)}`}
            <button onClick={() => stealPresent(data)}>Steal</button>
          </>
        } <br />
        {
          currentUser &&
          data.holder !== currentUser.user_key &&
          gameStatus === 'final_round' &&
          data.status === 'open' &&
          <button onClick={() => swapPresents(data)}>Swap</button>
        }
        Max Steals: {`${data.maxSteals}`}
      </>)}
    </div>
  );
};

export default Present;