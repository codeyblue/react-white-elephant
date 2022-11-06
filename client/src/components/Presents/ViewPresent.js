import EditPresent from './EditPresent';

const ViewPresent = ({ presentData, gameData, setModalState, user, games, mode }) => {
  const items = presentData.items.map(item => {
    let hyperlink = item.hyperlink;
    if (hyperlink && !hyperlink.includes('http')) {
      hyperlink = `http://${hyperlink}`;
    }
    return <div className='present-item' key={`item-${item.id}`}>
      {item.image &&
        <img src={`http://localhost:8080/${item.image}`}/>
      }
      {
        (hyperlink &&
        <a href={hyperlink}>{item.description}</a>) ||
        <p>{item.description}</p>
      }
      <hr />
    </div>;
  });

  const handleEditPresent = (e) => {
    e.preventDefault();
    setModalState({show: true, mode: 'Edit Present', content: <EditPresent presentData={presentData} gameData={gameData} user={user} games={games} />})
  };

  const handleDeletePresent = async () => {
    try {
      const response = await fetch(`http://localhost:8080/game/${gameData.id}/present/${presentData.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
  
      if(!response.ok) {
        throw new Error('Something went wrong!');
      }
  
     await response.json();
    } catch (error) {
      throw error;
    }

    setModalState({show: false, mode: '', content: null})
    window.location.reload()
  }

  return <>
    <h3>{presentData.name && <p>{`${presentData.name}`}</p>}</h3>
    {presentData.holder && <p>Holder: {`${presentData.holder}`}</p>}
    <hr />
    {
      mode === 'dashboard' &&
      <p>Game {`${gameData.id}`} ({`${gameData.status}`})</p> &&
      <img src={`http://localhost:8080/${presentData.wrapping}`} /> &&
      <button onClick={(e) => handleEditPresent(e)}>Edit</button> &&
      <button onClick={(e) => handleDeletePresent(e)}>Delete</button>
    }
    {items}
  </>;
};

export default ViewPresent;