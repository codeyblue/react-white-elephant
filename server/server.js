const {Server} = require('socket.io');
const restify = require('restify');
const mysql = require('mysql2');
const corsMiddleware = require('restify-cors-middleware');
const config  = require('./config');

var cors = corsMiddleware({
  preflightMaxAge: 5,
  origins: ['*'],
  allowHeaders:['X-App-Version'],
  exposeHeaders:[]
});

const connection = config.db.get;

const server = restify.createServer({
  name: config.name,
  version: config.version,
  url: config.hostname
});

const io = new Server(server.server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

io.use((socket, next) => {
  const game = socket.handshake.auth.game;
  socket.game = game;
  next();
});

io.on('connection', socket => {
  console.log('a user connected');
  socket.join(socket.game);
  socket.emit('connection', null);

  socket.on('open-present', req => {
    console.log(`User ${req.user} opened present ${req.present}`);
    const updateHistory = `INSERT INTO game_history SET event='open', present_key=${req.present}, game_key=${req.game}`;
    const updatePresent = `UPDATE presents SET status='open', holder=${req.user} WHERE id=${req.present}`;
    const updateParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.user}`;
    const getPresentData = `SELECT presents.*, game_history.event FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${req.game}`;
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${req.game} ORDER BY turn`;
    const getMaxPresentSteals = `SELECT rule_maxstealsperpresent FROM games WHERE id=${req.game}`
    connection.query(`${updatePresent};${updateHistory};${updateParticipant};${getPresentData};${getParticipantData};${getMaxPresentSteals}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const data = {participants: results[4], presents: transformPresentData(results[3], results[5][0].rule_maxstealsperpresent)}
        io.in(req.game).emit('present-opened', data);
    });
  });

  socket.on('restart-game', req => {
    console.log(`Restarting game ${req.game}`);
    const updateHistory = `DELETE FROM game_history WHERE game_key=${req.game}`;
    const updatePresents = `UPDATE presents SET status='wrapped', holder=null where game_key=${req.game}`;
    const updateParticipants = `UPDATE participants SET current_present_key=null where game_key=${req.game}`;
    const updateGame = `UPDATE games SET status='ready', active_participant=${req.firstChooser}, round=0, last_stolen_present=null where id=${req.game}`;
    const getPresents = `SELECT * FROM presents WHERE game_key=${req.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${req.game} ORDER BY turn`;
    const getGame = `SELECT * FROM games WHERE id=${req.game}`;

    connection.query(`${updateHistory};${updatePresents};${updateParticipants};${updateGame};${getPresents};${getParticipants};${getGame}`, (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      const presents = transformPresentData(results[4], results[6][0].rule_maxstealsperpresent);
      io.in(req.game).emit('game-restarted', {presents, participants: results[5], game: results[6][0]});
    });
  });

  socket.on('reset-game', req => {
    console.log(`Resetting game ${req.game}`);
    const updateHistory = `DELETE FROM game_history WHERE game_key=${req.game}`;
    const updatePresents = `UPDATE presents SET status='wrapped', holder=null WHERE game_key=${req.game}`;
    const updateParticipants = `UPDATE participants SET current_present_key=null, turn=null WHERE game_key=${req.game}`;
    const updateGame = `UPDATE games SET status='setup', active_participant=null, round=null, last_stolen_present=null WHERE id=${req.game}`;
    const getGame = `SELECT * FROM games WHERE id=${req.game}`;
    const getPresents = `SELECT * FROM presents WHERE game_key=${req.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${req.game}`;

    connection.query(`${updateHistory};${updatePresents};${updateParticipants};${updateGame};${getGame};${getPresents};${getParticipants}`, (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(req.game).emit('game-reset', { game: results[4][0], presents: transformPresentData(results[5], results[4][0].rule_maxstealsperpresent), participants: results[6] });
    });
  });

  socket.on('set-active-participant', req => {
    console.log(`Setting active participant to ${req.participant} for game ${req.game}`);
    const queryString = `UPDATE games SET active_participant=${req.participant}${req.incrementRound ? `, round=round+1` : ``},last_stolen_present=null where id=${req.game}`;
    const getGame = `SELECT * FROM games WHERE id=${req.game}`
    connection.query(`${queryString};${getGame}`, (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(req.game).emit('active-participant-set', results[1][0]);
    });
  });

  socket.on('set-game-complete', req => {
    console.log(`Setting game ${req.game} to complete`);
    connection.query('UPDATE games SET status=?,active_participant=null where id=?;SELECT * FROM games WHERE id=?', ['complete', req.game, req.game], (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(req.game).emit('game-complete', results[1][0]);
    });
  });

  socket.on('set-game-ready', req => {
    console.log(`Setting game ${req.game} to ready state`);
    connection.query('UPDATE games SET status=? WHERE id=?;SELECT * FROM games WHERE id=?', ['ready', req.game, req.game], (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(req.game).emit('game-ready', results[1][0]);
    });
  });

  socket.on('set-game-start', req => {
    console.log(`Setting game ${req.game} to start state`);
    let { order } = req;
    order = order.map(turn => `(${turn.participant}, ${turn.turn}, ${turn.user_key}, ${req.game})`);
    const setParticipants = `INSERT INTO participants (id, turn, user_key, game_key) VALUES ${order.join(',')} AS \`order\` ON DUPLICATE KEY UPDATE turn = \`order\`.turn`;
    const setGame = `UPDATE games SET status='inprogress',active_participant=${req.order.find(o => o.turn === 0).participant},round=0 WHERE id=${req.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${req.game} ORDER BY turn`;
    const getGame = `SELECT * FROM games where id=${req.game}`;
    connection.query(`${setParticipants};${setGame};${getParticipants};${getGame}`, (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        io.in(req.game).emit('game-started', {participants: results[2], game: results[3][0]});
      });
  });

  socket.on('set-final-round', req => {
    console.log(`Setting game ${req.game} to state final_round`);
    connection.query('UPDATE games SET status=? where id=?;SELECT * FROM games WHERE id=?', ['final_round', req.game, req.game], (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(req.game).emit('final-round-set', results[1][0]);
    });
  });

  socket.on('set-participant-turns', req => {
    console.log(`Shuffling participants for game ${req.game}`);
    let { order } = req;
    order = order.map(turn => `(${turn.participant}, ${turn.turn}, ${turn.user_key}, ${req.game})`);
    const setParticipants = `INSERT INTO participants (id, turn, user_key, game_key) VALUES ${order.join(',')} AS \`order\` ON DUPLICATE KEY UPDATE turn = \`order\`.turn`;
    const setActive = `UPDATE games SET active_participant=${req.order.find(o => o.turn === 0).participant} WHERE id=${req.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${req.game} ORDER BY turn`;
    const getGame = `SELECT * FROM games where id=${req.game}`;
    connection.query(`${setParticipants};${setActive};${getParticipants};${getGame}`, (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        io.in(req.game).emit('participant-turns-set', {participants: results[2], game: results[3][0]});
      });
  });

  socket.on('steal-present', req => {
    console.log(`User ${req.to} stole present ${req.present} from ${req.from}`);
    const updateHistory = `INSERT INTO game_history SET event='steal', present_key=${req.present}, game_key=${req.game}`;
    const updatePresent = `UPDATE presents SET holder=${req.to}${req.locked ? `, status='locked'` : ``} WHERE id=${req.present}`;
    const updateFromParticipant = `UPDATE participants SET current_present_key=null WHERE user_key=${req.from}`;
    const updateToParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.to}`;
    const updateGame = `UPDATE games SET last_stolen_present=${req.present} WHERE id=${req.game}`;
    const getPresentData = `SELECT presents.*, game_history.event FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${req.game}`;
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${req.game} ORDER BY turn`;
    const getGameData = `SELECT * FROM games WHERE id=${req.game}`
    connection.query(`${updatePresent};${updateHistory};${updateFromParticipant};${updateToParticipant};${updateGame};${getPresentData};${getParticipantData};${getGameData}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const presents = transformPresentData(results[5], results[7][0].rule_maxstealsperpresent);
        io.in(req.game).emit('present-stolen', {presents, participants: results[6], game: results[7][0]});
    });
  });

  socket.on('swap-presents', req => {
    console.log(`User ${req.swaper.user} swapped presents with ${req.swapee.user}. Present ${req.swaper.present} and ${req.swapee.present}`);
    const updateSwaperHistory = `INSERT INTO game_history SET event='swap', present_key=${req.swaper.present}, game_key=${req.game}`;
    const updateSwapeeHistory = `INSERT INTO game_history SET event='swap', present_key=${req.swapee.present}, game_key=${req.game}`;
    const updateSwaperPresent = `UPDATE presents SET holder=${req.swapee.user} WHERE id=${req.swaper.present}`;
    const updateSwapeePresent = `UPDATE presents SET holder=${req.swaper.user},status='locked' WHERE id=${req.swapee.present}`;
    const updateSwaperParticipant = `UPDATE participants SET current_present_key=${req.swapee.present} WHERE user_key=${req.swaper.user}`;
    const updateSwapeeParticipant = `UPDATE participants SET current_present_key=${req.swaper.present} WHERE user_key=${req.swapee.user}`;
    const getPresentData = `SELECT presents.*, game_history.event FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${req.game}`;
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${req.game} ORDER BY turn`;
    const getGameData = `SELECT * FROM games WHERE id=${req.game}`;
    connection.query(`${updateSwaperHistory};${updateSwapeeHistory};${updateSwaperPresent};${updateSwapeePresent};${updateSwaperParticipant};${updateSwapeeParticipant};${getPresentData};${getParticipantData};${getGameData}`,
      (error, results, fields) => {
        if (error) throw error;
        const presents = transformPresentData(results[6], results[8][0].rule_maxstealsperpresent);
        io.in(req.game).emit('presents-swapped', { presents, game: results[8][0], participants: results[7]});
    });
  });

  socket.on('disconnect', () => {
    console.log('a user disconnected')
  });
});

server.listen(config.port, () => {
  console.log('%s listening at %s', server.name, server.url);
});

server.get('/games', (req, res, next) => {
  console.log('GET games');
  connection.query('SELECT id FROM games', (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
});

server.get('/games/:id', (req, res, next) => {
  console.log('GET game');
  connection.query('select * from games where id=?', [req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results[0]);
    res.send(results[0]);
    next();
  });
});

server.get('/game/:id/participants', (req, res, next) => {
  console.log('GET game participants');
  connection.query('SELECT * FROM participants WHERE game_key=?', [req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
});

server.get('/game/:id/presents', (req, res, next) => {
  console.log('GET game presents');
  connection.query(
    'SELECT presents.*, game_history.event FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=?;SELECT rule_maxstealsperpresent FROM games where id=?',
    [req.params.id, req.params.id],
    (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      res.send(transformPresentData(results[0], results[1][0]));
      next();
    }
  );
});

const transformPresentData = (data, maxPresentSteals) => {
  let tempPresents = [];
  const uniquePresents = [...new Set(data.map(item => item.id))];
  uniquePresents.forEach(id => {
    const d = data.find(d => d.id === id);
    let history = data.filter(h => h.id === id)
    history = history ? history.map(h => { return { event: h.event }}) : null;
    const steals = history.filter(h => h.event === 'steal');
    tempPresents.push({
      id,
      gifter: d.gifter,
      status: d.status,
      holder: d.holder,
      maxSteals: steals ? steals.length >= maxPresentSteals : false,
      history
    });
  });

  return tempPresents;
};