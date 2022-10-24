import EditPresent from './EditPresent';

// todo add ability to delete present

const ViewPresent = ({ presentData, gameData, setModalState, user, games }) => {
  const items = presentData.items.map(item => {
    return <div key={`item-${item.id}`}>
      {item.img && <img src={item.img} alt={`img-${item.id}`} />}
      <p>{item.description}</p>
      {item.url && <a href={item.url} target='_blank'>View</a>}
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
    <p>Game {`${gameData.id}`} ({`${gameData.status}`})</p>
    {items}
    <button onClick={(e) => handleEditPresent(e)}>Edit</button>
  </>;
};

export default ViewPresent;