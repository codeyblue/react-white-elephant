import EditPresent from './EditPresent';

// todo add ability to delete present

const ViewPresent = ({ presentData, gameData, setModalState, user }) => {
  const items = presentData.items.map(item => {
    return <div key={`item-${item.id}`}>
      {item.img && <img src={item.img} alt={`img-${item.id}`} />}
      <p>{item.description}</p>
      {item.url && <a href={item.url} target='_blank'>View</a>}
    </div>;
  });

  const handleEditPresent = (e) => {
    e.preventDefault();
    setModalState({show: true, mode: 'Edit Present', content: <EditPresent presentData={presentData} gameData={gameData} user={user} />})
  };

  return <>
    <h3>{presentData.name && <p>{`${presentData.name}`}</p>}</h3>
    <p>Game {`${gameData.id}`} ({`${gameData.status}`})</p>
    {items}
    <button onClick={(e) => handleEditPresent(e)}>Edit</button>
  </>;
};

export default ViewPresent;