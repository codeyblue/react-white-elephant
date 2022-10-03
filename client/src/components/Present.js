import { useState } from "react";
import './Present.css';

const Present = props => {
  const { gameId, gameStatus, maxPresentSteal, currentUser, socket, pickNextParticipant, data, lastStolenPresent } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const openPresent = id => {
    console.log('Opening Present...');
    socket.emit('open-present', { game: gameId, present: id, user: currentUser.user_key });
    pickNextParticipant('open');
  };

  const stealPresent = present => {
    console.log('Stealing Present...');
    if (present.maxSteals) {
      return;
    }

    const lock = present.history.filter(h => h.event === 'steal').length + 1 >= maxPresentSteal;

    const previousHolder = present.holder;
    socket.emit('steal-present', { game: gameId, present: present.id, from: previousHolder, to: currentUser.user_key, lock });
    pickNextParticipant('steal', previousHolder);
  }

  const swapPresents = present => {
    console.log('Swapping Presents...');
    socket.emit('swap-presents', {
      game: gameId,
      swaper: { user: currentUser.user_key, present: currentUser.current_present_key },
      swapee: { user: present.holder, present: present.id }
    });
    pickNextParticipant('steal', present.holder);
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
          lastStolenPresent !== data.id &&
          !data.maxSteals &&
          <>
            {console.log(data)}
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