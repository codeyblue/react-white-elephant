const Participant = props => {
  const { data, activeChooser } = props;
  const backgroundColor = activeChooser ? 'yellow' : 'pink';
  return (
    <>
      <div key={data.id} style={{ backgroundColor }}>
        <p>ID: {data.id}</p>
        <p>USER: {data.user_key}</p>
        <p>GAME: {data.game_key}</p>
        <p>TURN: {data.turn}</p>
        <p>ACTIVE: {`${activeChooser}`}</p>
        <p>PRESENT: {data.current_present_key}</p>
      </div>
    </>
  );
};

export default Participant;
