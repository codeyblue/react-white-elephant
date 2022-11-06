import { useState } from 'react';

import api from '../../common/api';
import ViewPresent from './ViewPresent';

import './Present.css';

const Present = props => {
  const { gameStatus, gameId, maxPresentSteal, currentParticipant, activeParticipant, socket, pickNextParticipant, data, lastStolenPresent, setModalState, user } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const giftedPresentClass = !['inprogress', 'final_round'].includes(gameStatus) && currentParticipant && data.gifter === currentParticipant.user_key ?
    'gifted' : '';
  const holdingPresentClass = data.holder === currentParticipant && currentParticipant.user_key ? 'holding' : '';

  const openPresent = id => {
    console.log('Opening Present...');
    socket.emit('open-present', { present: id, user: currentParticipant.user_key });
    pickNextParticipant('open');
    setModalState({show: false, header: '', content: null});
  };

  const stealPresent = present => {
    console.log('Stealing Present...');
    if (present.maxSteals) {
      return;
    }

    const lock = present.history.filter(h => h.event === 'steal').length + 1 >= maxPresentSteal;

    const previousHolder = present.holder;
    socket.emit('steal-present', { present: present.id, from: previousHolder, to: currentParticipant.user_key, lock });
    pickNextParticipant('steal', previousHolder);
    setModalState({show: false, header: '', content: null});
  }

  const swapPresents = present => {
    console.log('Swapping Presents...');
    socket.emit('swap-presents', {
      swapper: { user: currentParticipant.user_key, present: currentParticipant.current_present_key },
      swappee: { user: present.holder, present: present.id }
    });
    pickNextParticipant('steal', present.holder);
    setModalState({show: false, header: '', content: null});
  };

  let presentContent;

  const handleClick = async () => {
    const isActiveParticipant = activeParticipant &&
      currentParticipant.user_key === activeParticipant.user_key;

    if (giftedPresentClass === 'gifted' && ['setup', 'ready'].includes(gameStatus)) {
      const present = (await api.fetchPresent(props.user.token, gameId, data.id)).data;
      setModalState({
        show: true,
        header: '',
        content: <ViewPresent mode='dashboard' presentData={present} gameData={{id: gameId, status: gameStatus}} setModalState={setModalState} user={user} />
      });
    } else if (isActiveParticipant && gameStatus === 'inprogress' && data.status === 'wrapped') {
      setModalState({
        show: true,
        header: '',
        content: <div>
            <img src={`http://localhost:8080/${data.wrapping}`} alt='wrapping' />
            <button onClick={() => openPresent(data.id)}>Open</button>
          </div>
      });
    } else if (data.status === 'open' || data.status === 'locked') {
      setModalState({
        show: true,
        header: '',
        content: <div>
          <ViewPresent presentData={data} gameData={{id: gameId, status: gameStatus}} setModalState={setModalState} user={user} />
          <div>
            History:
            {data.history.sort((a, b) => { return new Date(a.timestamp) - new Date(b.timestamp) }).map(event => {
              let eventText;
              switch (event.event) {
                case 'open':
                  eventText = <p>Opened by {`${event.user}`}</p>;
                  break;
                case 'steal':
                  eventText = <p>Stolen by {`${event.user}`}</p>;
                  break;
                case 'swap':
                  eventText = <p>Swapped by {`${event.user}`}</p>;
                  break;
                case 'lock':
                  eventText = <p>Present Locked</p>;
                  break;
                default:
                  break;
              }
              return eventText;
            })}
          </div>
          {
            (
              isActiveParticipant &&
              data.holder !== currentParticipant.user_key &&
              gameStatus === 'inprogress' &&
              data.status === 'open' &&
              lastStolenPresent !== data.id &&
              !data.maxSteals &&
              <button onClick={() => stealPresent(data)}>Steal</button>
            )
            ||
            (
              isActiveParticipant &&
              data.holder !== currentParticipant.user_key &&
              gameStatus === 'final_round' &&
              data.status === 'open' &&
              <button onClick={() => swapPresents(data)}>Swap</button>
            )
            ||
            (
              data.status === 'locked' &&
              <p>Present is locked</p>
            )
          }
        </div>
      })
    } else {
      return;
    }
  };

  switch (data.status) {
    case 'wrapped':
      presentContent = <div style={{flexGrow: 1}} id={`present-${data.id}`} className={`wrapped-present ${giftedPresentClass}`} onClick={handleClick}>
        <img src={`http://localhost:8080/${data.wrapping}`} alt='wrapping' />
      </div>
      break;
    case 'open':
      presentContent = <div style={{flexGrow: 1}} id={`present-${data.id}`} className={`open-present ${holdingPresentClass}`} onClick={handleClick}>
        <p>Present {data.id}</p>
        <div><p>This is where the main photo of the present would be</p></div>
        <p>Holder: {(data.holder && `${data.holder}`) || ''}</p>
      </div>
      break;
    case 'locked':
      presentContent = <div style={{flexGrow: 1}} id={`present-${data.id}`} className={`locked-present ${holdingPresentClass}`} onClick={handleClick}>
        <p>Present {data.id}</p>
        <div><p>This is where the main photo of the present would be</p></div>
        <p>Holder: {(data.holder && `${data.holder}`) || ''}</p>
      </div>
      break;
    default:
      break;
  }

  return (
    <div className='present' style={{display: 'flex'}}>
      {isLoading && <p>Loading...</p>}
      {error && <p>Error</p>}
      {!isLoading && presentContent}
    </div>
  );
};

export default Present;