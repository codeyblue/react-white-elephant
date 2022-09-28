import './App.css';
import Present from './components/Present';
import { useCallback, useEffect, useState } from 'react';

const mockGameData = {
  currentUser: 1,
  nextUser: 2,
  maxSteals: 3
};

function App() {
  const [presents, setPresents] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPresents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8080/presents');
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
          maxSteals: mockGameData.maxSteals && history.length >= mockGameData.maxSteals ?
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

    const lock = present.history.length + 1 >= mockGameData.maxSteals;

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
    fetchPresents();
  }, [fetchPresents]);

  let content = <p>No presents yet.</p>;

  if (presents.length > 0) {
    const transformedPresents = 
      presents.map(present => <Present key={present.id} data={present} onPresentOpen={openPresent} onPresentSteal={stealPresent} />);
    content = <div key='Present List'>{transformedPresents}</div>
  }

  if (error) {
    content = <p>{error}</p>;
  }

  if (isLoading) {
    content = <p>Loading...</p>;
  }

  return (
    <div className="App">
      {content}
    </div>
  );
}

export default App;
