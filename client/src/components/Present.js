import { useState } from 'react';

const Present = props => {
  const { data } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div data-testid='present' style={{width: '150px', height: '150px', backgroundColor: 'grey'}}>
      Present <br />
      Holder: {(data.holder && `${data.holder}`) || ''} <br />
      {
        data.status === 'wrapped' &&
        <button onClick={() => props.onPresentOpen(data.id)}>Open</button>
      }
      {
        data.status === 'open' &&
        <button>Steal</button>
      }
    </div>
  );
};

export default Present;