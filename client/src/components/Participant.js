const Participant = props => {
  const { data } = props;
  console.log('participant')
  return (
    <>
      <div key={data.id} style={{ backgroundColor: 'pink' }}>
        <p>ID: {data.id}</p>
        <p>USER: {data.user_key}</p>
        <p>GAME: {data.game_key}</p>
        <p>TURN: {data.turn}</p>
        <p>ACTIVE: {data.active_chooser}</p>
        <p>PRESENT: {data.current_present_key}</p>
      </div>
    </>
  );
};

export default Participant;
