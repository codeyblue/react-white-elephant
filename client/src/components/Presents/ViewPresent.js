import { Link } from "react-router-dom";

const ViewPresent = ({ presentData, gameData }) => {
  const items = presentData.items.map(item => {
    return <div key={`item-${item.id}`}>
      {item.img && <img src={item.img} alt={`img-${item.id}`} />}
      <p>{item.description}</p>
      {item.url && <a href={item.url} target='_blank'>View</a>}
    </div>;
  });

  return <>
    <h3>{presentData.name && <p>{`${presentData.name}`}</p>}</h3>
    <p>Game {`${gameData.id}`} ({`${gameData.status}`})</p>
    {items}
    <Link to={`/game/${gameData.id}/present/${presentData.id}/edit`}>Edit</Link>
  </>;
};

export default ViewPresent;