import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8080/games');
      if (!response.ok) {
        throw new Error('Something went wrong!');
      }

      const data = await response.json();
      setGames(data);
    } catch (error) {
      setError(error.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  let content = <p>No games yet.</p>;

  if (games.length > 0) {
    const transformedGames = 
      games.map(game => <Link key={`game-${game.id}`} to={`/game/${game.id}`}>{`${game.id}`}</Link>);
    content = <div key='Game List'>{transformedGames}</div>
  }

  if (error) {
    content = <p>{error}</p>;
  }

  if (isLoading) {
    content = <p>Loading...</p>;
  }

  return (
    <div className="Dashboard">
      {content}
    </div>
  );
}

export default Dashboard;
