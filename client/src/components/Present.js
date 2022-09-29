const Present = props => {
  const { data, gameStatus } = props;

  return (
    <div data-testid='present' style={{width: '150px', height: '150px', backgroundColor: 'grey'}}>
      Present <br />
      Gifter: {data.gifter} <br />
      Holder: {(data.holder && `${data.holder}`) || ''} <br />
      {
        gameStatus === 'inprogress' &&
        data.status === 'wrapped' &&
        <button onClick={() => props.onPresentOpen(data.id)}>Open</button>
      }
      {
        gameStatus === 'inprogress' &&
        data.status === 'open' &&
        <>
          History: {`${JSON.stringify(data.history)}`}
          <button onClick={() => props.onPresentSteal(data)}>Steal</button>
        </>
      } <br />
      Max Steals: {`${data.maxSteals}`}
    </div>
  );
};

export default Present;