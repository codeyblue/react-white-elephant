import { useCallback, useEffect, useState } from 'react';
import api from '../../common/api';

const CreateGame = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [participants, setParticipants] = useState([]);

  const getUsers = useCallback(async() => {
    const data = await api.fetchUsers(user.token);
    setUsers(data.data.filter(u => u.id !== user.id));
  }, [user.token]);

  const handleAddParticipant = () => {
    let participant = document.getElementById('participants').value;
    participant = users.find(u => u.username === participant);
    if (!participant) {
      alert('Please choose an existing user');
      return;
    }

    let newUsers = [...users];
    newUsers = newUsers.filter(u => u.id !== participant.id);
    setParticipants([...participants, participant]);
    setUsers(newUsers);
  };

  const handleRemoveParticipant = participant => {
    setUsers([...users, participant]);

    let newParticipants = [...participants];
    newParticipants = newParticipants.filter(p => p.id !== participant.id);
    setParticipants(newParticipants);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = document.getElementById('new-game');
    const formData = new FormData(form);
    formData.append('participants', JSON.stringify(participants));
    await api.postGame(user.token, formData);

    alert('Game Created');
  };

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  return (
    <form id='new-game' onSubmit={handleSubmit}>
      <label>
        Game Name (optional)
        <input name='game-name' type='text' />
      </label>
      <br />
      <label>
        Day
        <input name='date' type='date' />
      </label>
      <label>
        Time
        <input name='time' type='time' />
      </label>
      <br />
      <label>
        Conference Link
        <input name='conference-link' type='url' />
      </label>
      <hr />
      <label>
        Rules <br />
        <input type='checkbox' name='max-present-steals' defaultChecked />
        <label>Maximum Steals Per Persent Per Game</label> 
        <input type='number' name='max-present-steals-num' defaultValue='3' min='1' max='30' />
        <br />
        
        <input type='checkbox' name='max-round-steals' />
        <label>Maximum Steals Per Round</label> 
        <input type='number' name='max-round-steals-num' min='1' max='30' />
        <br />

        <input type='checkbox' name='block-last-stolen' />
        <label>Don't Allow Stealing a Present Twice in a Row</label>
        <br />


        <input type='checkbox' name='first-person-choose-again' defaultChecked />
        <label>Allow First Person to Choose Again at Game End</label>
        <br />


        <input type='checkbox' name='extra-round' defaultChecked />
        <label>Allow for Extra Round at Game End</label>
        <br />
      </label>
      <hr />
      <label>
        Participants <br />
        <input id='participants' type='text' list='users' />
          <datalist id='users'>
            {users.map(user => {
              return (
                <option key={user.username} value={user.username} id={user.id} />
              );
            })}
          </datalist>
        <button type='reset' onClick={handleAddParticipant}>+</button>
        {participants.map(participant => {
          return (
            <div key={`participant-${participant.id}`}>
              <br />
              <label>{`${participant.username}`}</label>
              <button type='button' onClick={() => handleRemoveParticipant(participant)}>x</button>
            </div>
          );
        })}
      </label>
      <br />
      <button type='submit'>Submit</button>
    </form>
  );
};

export default CreateGame;
