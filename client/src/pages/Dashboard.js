import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../common/api';
import Modal from '../components/Modal/Modal';
import EditPresent from '../components/Presents/EditPresent';
import ViewPresent from '../components/Presents/ViewPresent';
import './Dashboard.css';

const Dashboard = ({ user, setUser }) => {
  const [games, setGames] = useState([]);
  const [mode, setMode] = useState('view');
  const [modalState, setModalState] = useState({show: false, mode: '', content: null});
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await api.fetchGames(user.token);
    if (!response.error) {
      setGames(response.data);
    } else {
      setError(response.error)
    }
    setIsLoading(false);
  }, [user.token]);

  const handleCheckin = async gameId => {
    await api.gameCheckin(user.token, gameId);
    await fetchGames();
  };

  const handleSubmitUsername = async e => {
    e.preventDefault();
    const userData = (await api.updateUser(user.token, { username })).data;
    setUser(userData);
    setMode('view');
  };

  const handleSubmitPassword = async e => {
    e.preventDefault();
    await api.resetPassword(user.token, { password });
    setMode('view');
  };

  const handleModalClose = () => {
    setModalState({show: false, mode: '', content: null});
  }

  const handleAddPresent = (game) => {
    setModalState({
      show: true,
      mode: 'Add Present',
      content: <EditPresent gameData={game} user={user} games={games} />
    });
  }

  const handleViewPresent = async (gameData, id) => {
    const presentData = (await api.fetchPresent(user.token, gameData.id, id)).data;

    setModalState({
      show: true,
      mode: '',
      content: <ViewPresent mode='dashboard' presentData={presentData} gameData={gameData} modalState={modalState} setModalState={setModalState} user={user} games={games} />
    });
  }
  
  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  let userContent;

  switch (mode) {
    case 'edit-username':
      userContent = <div className='user-settings-panel'>
        <div className='avatar'>Avatar Placeholder</div>
        <form onSubmit={handleSubmitUsername}>
          <label>
            <input type='text' onChange={e => setUsername(e.target.value)} />
          </label>
          <button type='submit'>Submit</button>
        </form>
        <button type='cancel' onClick={() => setMode('view')}>Cancel</button>
        <p>{`${user.first_name}`}</p>
        <p>{`${user.last_name}`}</p>
      </div>
      break;
    case 'reset-password':
        userContent = <div className='user-settings-panel'>
          <div className='avatar'>Avatar Placeholder</div>
          <p>{`${user.username}`}</p>
          <p>{`${user.first_name}`}</p>
          <p>{`${user.last_name}`}</p>
          <form onSubmit={handleSubmitPassword}>
            <label>
              <input type='password' onChange={e => setPassword(e.target.value)} />
            </label>
            <button type='submit'>Submit</button>
          </form>
          <button type='cancel' onClick={() => setMode('view')}>Cancel</button>
        </div>
        break;
    default:
      userContent = <div className='user-settings-panel'>
        <div className='avatar'>Avatar Placeholder</div>
        <p>{`${user.username}`}</p>
        <p>{`${user.first_name}`}</p>
        <p>{`${user.last_name}`}</p>
        <button onClick={() => setMode('edit-username')}>Update username</button>
        <button onClick={() => setMode('reset-password')}>Reset Password</button>
      </div>;
      break;
  }

  let gameContent = <p>No games yet.</p>;

  if (games.length > 0) {
    const transformedGames = 
      games.map(game => 
        <div id='game-link' key={`game-${game.id}`}>
          <Link to={`/game/${game.id}`}>{`${game.id}`}</Link>
          {game.administrator === user.id && '(a)'}
          {!game.present && <button onClick={() => handleAddPresent(game)}>Add a present</button>}
          {game.present && <button onClick={() => handleViewPresent(game, game.present)}>View present</button>}
          {!game.checked_in && <button onClick={() => handleCheckin(game.id)}>Check In</button>}
        </div>
      );
    gameContent = <div key='Game List'>{transformedGames}</div>
  }

  if (error) {
    gameContent = <p>{error}</p>;
  }

  if (isLoading) {
    gameContent = <p>Loading...</p>;
  }

  return (
    <>
      <Modal
        show={modalState.show}
        onCancel={handleModalClose}
        header={modalState.mode}
        footer={<button onClick={handleModalClose}>CLOSE</button>}>
          {modalState.content}
      </Modal>
      <div style={{display: 'flex'}}>
        {userContent}
        <div className="dashboard">
          <p>My Games</p>
          {gameContent}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
