import './Participant.css';

const Participant = props => {
  const { data, activeChooser } = props;
  const c = activeChooser ? 'active-participant' : 'participant';
  return (
    <>
      <div key={data.id} className={c}>
        <p>USER: {data.user_key}</p>
        <p>PRESENT: {data.current_present_key}</p>
      </div>
    </>
  );
};

export default Participant;
