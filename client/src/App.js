import './App.css';
import Present from './components/Present';
import { useCallback, useEffect, useState } from 'react';

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

      setPresents(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPresents();
  }, [fetchPresents]);

  let content = <p>No presents yet.</p>;

  if (presents.length > 0) {
    const transformedPresents = presents.map(present => <Present data={present} />);
    content = <div id='Present List'>{transformedPresents}</div>
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
