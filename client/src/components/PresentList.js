import { useCallback, useEffect, useState } from "react";
import Present from './Present';

const PresentList = props => {
  const { gameId, maxPresentSteal, gameStatus } = props;
  const [presents, setPresents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPresents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8080/game/${gameId}/presents`);
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
          maxSteals: maxPresentSteal && history.length >= maxPresentSteal ?
            true :
            false
        });
      });

      setPresents(tempPresents);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, [maxPresentSteal, gameId]);

  useEffect(() => {
    fetchPresents();
  }, [fetchPresents]);

  let presentContent = <p>No presents yet.</p>

  if (presents.length > 0) {
    const transformedPresents = 
      presents.map(present => 
        <Present key={present.id} data={present} gameStatus={gameStatus} maxPresentSteal={maxPresentSteal} gameId={gameId} />
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
    <div className='Present List'>
      {presentContent}
    </div>
  );
};

export default PresentList;