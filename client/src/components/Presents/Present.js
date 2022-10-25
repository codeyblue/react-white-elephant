import { useState } from "react";
import './Present.css';

const Present = props => {
  const { gameStatus, maxPresentSteal, currentParticipant, activeParticipant, socket, pickNextParticipant, data, lastStolenPresent, setModalState } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      swaper: { user: currentParticipant.user_key, present: currentParticipant.current_present_key },
      swapee: { user: present.holder, present: present.id }
    });
    pickNextParticipant('steal', present.holder);
    setModalState({show: false, header: '', content: null});
  };

  let presentContent;

  const handleClick = () => {
    const isActiveParticipant = activeParticipant &&
      currentParticipant.user_key === activeParticipant.user_key;

    if (isActiveParticipant && gameStatus === 'inprogress' && data.status === 'wrapped') {
      setModalState({
        show: true,
        header: '',
        content: <div>
            <div>This is where a photo of the present would be</div>
            <button onClick={() => openPresent(data.id)}>Open</button>
          </div>
      });
    } else if (data.status === 'open' || data.status === 'locked') {
      setModalState({
        show: true,
        header: '',
        content: <div>
          <div>This where a list of photos and links would be for the items in the present</div>
          <div>History: {`${JSON.stringify(data.history)}`}</div>
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
      presentContent = <div style={{flexGrow: 1}} id={`present-${data.id}`} className='wrapped-present' onClick={handleClick}>
        <p>Present {data.id}</p>
      </div>
      break;
    case 'open':
      presentContent = <div style={{flexGrow: 1}} id={`present-${data.id}`} className='open-present' onClick={handleClick}>
        <p>Present {data.id}</p>
        <div><p>This is where the main photo of the present would be</p></div>
        <p>Holder: {(data.holder && `${data.holder}`) || ''}</p>
      </div>
      break;
    case 'locked':
      presentContent = <div style={{flexGrow: 1}} id={`present-${data.id}`} className='locked-present' onClick={handleClick}>
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