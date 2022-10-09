const {Server} = require('socket.io');
const restify = require('restify');
const mysql = require('mysql2');
const corsMiddleware = require('restify-cors-middleware');
const config  = require('./config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

var cors = corsMiddleware({
  preflightMaxAge: 5,
  origins: ['*'],
  allowHeaders:['Authorization'],
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
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization']
  }});

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

io.use((socket, next) => {
  const { game, token } = socket.handshake.auth;
  console.log(game, token);
  try {
    if (!token) {
      throw new Error('Authentication failed!');
    }
    const decodedToken = jwt.verify(token, config.secretKey);
    socket.userData = { userId: decodedToken.id };
    socket.game = game;
    next();
  } catch (err) {
    throw err;
  }
});

io.on('connection', socket => {
  console.log('a user connected');
  socket.join(socket.game);
  socket.emit('connection', null);

  socket.on('open-present', req => {
    console.log(`User ${req.user} opened present ${req.present}`);
    const updateHistory = `INSERT INTO game_history SET event='open', present_key=${req.present}, game_key=${socket.game}`;
    const updatePresent = `UPDATE presents SET status='open', holder=${req.user} WHERE id=${req.present}`;
    const updateParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.user}`;
    const getPresentData = `SELECT presents.*, game_history.event FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${socket.game}`;
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getMaxPresentSteals = `SELECT rule_maxstealsperpresent FROM games WHERE id=${socket.game}`
    connection.query(`${updatePresent};${updateHistory};${updateParticipant};${getPresentData};${getParticipantData};${getMaxPresentSteals}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const data = {participants: results[4], presents: transformPresentData(results[3], results[5][0].rule_maxstealsperpresent)}
        io.in(socket.game).emit('present-opened', data);
    });
  });

  socket.on('restart-game', req => {
    console.log(`Restarting game ${socket.game}`);
    const updateHistory = `DELETE FROM game_history WHERE game_key=${socket.game}`;
    const updatePresents = `UPDATE presents SET status='wrapped', holder=null where game_key=${socket.game}`;
    const updateParticipants = `UPDATE participants SET current_present_key=null where game_key=${socket.game}`;
    const updateGame = `UPDATE games SET status='ready', active_participant=${req.firstChooser}, round=0, last_stolen_present=null where id=${socket.game}`;
    const getPresents = `SELECT * FROM presents WHERE game_key=${socket.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getGame = `SELECT * FROM games WHERE id=${socket.game}`;

    connection.query(`${updateHistory};${updatePresents};${updateParticipants};${updateGame};${getPresents};${getParticipants};${getGame}`, (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      const presents = transformPresentData(results[4], results[6][0].rule_maxstealsperpresent);
      io.in(socket.game).emit('game-restarted', {presents, participants: results[5], game: results[6][0]});
    });
  });

  socket.on('reset-game', req => {
    console.log(`Resetting game ${socket.game}`);
    const updateHistory = `DELETE FROM game_history WHERE game_key=${socket.game}`;
    const updatePresents = `UPDATE presents SET status='wrapped', holder=null WHERE game_key=${socket.game}`;
    const updateParticipants = `UPDATE participants SET current_present_key=null, turn=null WHERE game_key=${socket.game}`;
    const updateGame = `UPDATE games SET status='setup', active_participant=null, round=null, last_stolen_present=null WHERE id=${socket.game}`;
    const getGame = `SELECT * FROM games WHERE id=${socket.game}`;
    const getPresents = `SELECT * FROM presents WHERE game_key=${socket.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${socket.game}`;

    connection.query(`${updateHistory};${updatePresents};${updateParticipants};${updateGame};${getGame};${getPresents};${getParticipants}`, (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(socket.game).emit('game-reset', { game: results[4][0], presents: transformPresentData(results[5], results[4][0].rule_maxstealsperpresent), participants: results[6] });
    });
  });

  socket.on('set-active-participant', req => {
    console.log(`Setting active participant to ${req.participant} for game ${socket.game}`);
    const queryString = `UPDATE games SET active_participant=${req.participant}${req.incrementRound ? `, round=round+1` : ``},last_stolen_present=null where id=${socket.game}`;
    const getGame = `SELECT * FROM games WHERE id=${socket.game}`
    connection.query(`${queryString};${getGame}`, (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(socket.game).emit('active-participant-set', results[1][0]);
    });
  });

  socket.on('set-game-complete', req => {
    console.log(`Setting game ${socket.game} to complete`);
    connection.query('UPDATE games SET status=?,active_participant=null where id=?;SELECT * FROM games WHERE id=?', ['complete', socket.game, socket.game], (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(socket.game).emit('game-complete', results[1][0]);
    });
  });

  socket.on('set-game-ready', req => {
    console.log(`Setting game ${socket.game} to ready state`);
    connection.query('UPDATE games SET status=? WHERE id=?;SELECT * FROM games WHERE id=?', ['ready', socket.game, socket.game], (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(socket.game).emit('game-ready', results[1][0]);
    });
  });

  socket.on('set-game-start', req => {
    console.log(`Setting game ${socket.game} to start state`);
    let { order } = req;
    order = order.map(turn => `(${turn.participant}, ${turn.turn}, ${turn.user_key}, ${socket.game})`);
    const setParticipants = `INSERT INTO participants (id, turn, user_key, game_key) VALUES ${order.join(',')} AS \`order\` ON DUPLICATE KEY UPDATE turn = \`order\`.turn`;
    const setGame = `UPDATE games SET status='inprogress',active_participant=${req.order.find(o => o.turn === 0).participant},round=0 WHERE id=${socket.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getGame = `SELECT * FROM games where id=${socket.game}`;
    connection.query(`${setParticipants};${setGame};${getParticipants};${getGame}`, (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        io.in(socket.game).emit('game-started', {participants: results[2], game: results[3][0]});
      });
  });

  socket.on('set-final-round', req => {
    console.log(`Setting game ${socket.game} to state final_round`);
    connection.query('UPDATE games SET status=? where id=?;SELECT * FROM games WHERE id=?', ['final_round', socket.game, socket.game], (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      io.in(socket.game).emit('final-round-set', results[1][0]);
    });
  });

  socket.on('set-participant-turns', req => {
    console.log(`Shuffling participants for game ${socket.game}`);
    let { order } = req;
    order = order.map(turn => `(${turn.participant}, ${turn.turn}, ${turn.user_key}, ${socket.game})`);
    const setParticipants = `INSERT INTO participants (id, turn, user_key, game_key) VALUES ${order.join(',')} AS \`order\` ON DUPLICATE KEY UPDATE turn = \`order\`.turn`;
    const setActive = `UPDATE games SET active_participant=${req.order.find(o => o.turn === 0).participant} WHERE id=${socket.game}`;
    const getParticipants = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getGame = `SELECT * FROM games where id=${socket.game}`;
    connection.query(`${setParticipants};${setActive};${getParticipants};${getGame}`, (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        io.in(socket.game).emit('participant-turns-set', {participants: results[2], game: results[3][0]});
      });
  });

  socket.on('steal-present', req => {
    console.log(`User ${req.to} stole present ${req.present} from ${req.from}`);
    const updateHistory = `INSERT INTO game_history SET event='steal', present_key=${req.present}, game_key=${socket.game}`;
    const updatePresent = `UPDATE presents SET holder=${req.to}${req.locked ? `, status='locked'` : ``} WHERE id=${req.present}`;
    const updateFromParticipant = `UPDATE participants SET current_present_key=null WHERE user_key=${req.from}`;
    const updateToParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.to}`;
    const updateGame = `UPDATE games SET last_stolen_present=${req.present} WHERE id=${socket.game}`;
    const getPresentData = `SELECT presents.*, game_history.event FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${socket.game}`;
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getGameData = `SELECT * FROM games WHERE id=${socket.game}`
    connection.query(`${updatePresent};${updateHistory};${updateFromParticipant};${updateToParticipant};${updateGame};${getPresentData};${getParticipantData};${getGameData}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const presents = transformPresentData(results[5], results[7][0].rule_maxstealsperpresent);
        io.in(socket.game).emit('present-stolen', {presents, participants: results[6], game: results[7][0]});
    });
  });

  socket.on('swap-presents', req => {
    console.log(`User ${req.swaper.user} swapped presents with ${req.swapee.user}. Present ${req.swaper.present} and ${req.swapee.present}`);
    const updateSwaperHistory = `INSERT INTO game_history SET event='swap', present_key=${req.swaper.present}, game_key=${socket.game}`;
    const updateSwapeeHistory = `INSERT INTO game_history SET event='swap', present_key=${req.swapee.present}, game_key=${socket.game}`;
    const updateSwaperPresent = `UPDATE presents SET holder=${req.swapee.user} WHERE id=${req.swaper.present}`;
    const updateSwapeePresent = `UPDATE presents SET holder=${req.swaper.user},status='locked' WHERE id=${req.swapee.present}`;
    const updateSwaperParticipant = `UPDATE participants SET current_present_key=${req.swapee.present} WHERE user_key=${req.swaper.user}`;
    const updateSwapeeParticipant = `UPDATE participants SET current_present_key=${req.swaper.present} WHERE user_key=${req.swapee.user}`;
    const getPresentData = `SELECT presents.*, game_history.event FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${socket.game}`;
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getGameData = `SELECT * FROM games WHERE id=${socket.game}`;
    connection.query(`${updateSwaperHistory};${updateSwapeeHistory};${updateSwaperPresent};${updateSwapeePresent};${updateSwaperParticipant};${updateSwapeeParticipant};${getPresentData};${getParticipantData};${getGameData}`,
      (error, results, fields) => {
        if (error) throw error;
        const presents = transformPresentData(results[6], results[8][0].rule_maxstealsperpresent);
        io.in(socket.game).emit('presents-swapped', { presents, game: results[8][0], participants: results[7]});
    });
  });

  socket.on('disconnect', () => {
    console.log('a user disconnected')
  });
});

server.listen(config.port, () => {
  console.log('%s listening at %s', server.name, server.url);
});

server.post('/login', (req, res, next) => {
  console.log('Logging in');
  connection.query('SELECT * FROM users WHERE username=?', [req.body.username], (error, results, fields) => {
    if (error) throw error;

    console.log(results);
    if (results.length > 1) {
      throw new Error('More than one user with this username');
    }

    try {
      bcrypt.compare(results[0].password, req.body.password)
        .then(() => {
          const { id, username, first_name, last_name } = results[0];
          let token;
          try {
            token = jwt.sign({ id }, config.secretKey);
          } catch (e) {
            throw e;
          }
          res.send({ id, username, first_name, last_name, token});
          next();
        })
    } catch (e) {
      throw e;
    }

    if (!results[0].password === req.body.password) {
      throw new Error('Password incorrect');
    }
  });
});

server.post('/register', (req, res, next) => {
  console.log('Registering user');
  const {username, firstName, lastName, password} = req.body;
  connection.query('SELECT * FROM users WHERE username=?', [username], (error, results, fields) => {
    if (error) throw error;
    if (results.length > 0) {
      throw new Error('There already exists a user with this username');
    }

    try {
      bcrypt.hash(password, 12).then(pass => {
        console.log(pass)
        connection.query('INSERT INTO users SET username=?, first_name=?, last_name=?, password=?',
        [username, firstName, lastName, pass],
        (error, results, fields) => {
          if (error) throw error;
          console.log(results);
          res.send(results);
          next();
        });
      });
    } catch (err) {
      throw err;
    }
  });
});

server.use((req, res, next) => {
  if (req.method === 'OPTIONS' || ['/login', '/register'].includes(req.route.path)) {
    return next();
  }
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error('Authentication failed!');
    }
    const decodedToken = jwt.verify(token, config.secretKey);
    req.userData = { userId: decodedToken.id };
    next();
  } catch (err) {
    throw err;
  }
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