const bcrypt = require('bcryptjs');
const corsMiddleware = require('restify-cors-middleware');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const restify = require('restify');
const {Server} = require('socket.io');

const config  = require('./config');

const uploads = './uploads';

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
// todo make file upload more secure
server.use(restify.plugins.bodyParser(
  {
    mapParams: true,
    mapFiles: true,
    uploadDir: `${uploads}/images`,
    keepExtensions: true
  })
);

io.use((socket, next) => {
  const { game, token } = socket.handshake.auth;
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
    const updateHistory = `INSERT INTO game_history SET event='open', present_key=${req.present}, game_key=${socket.game}, user_key=${req.user}`;
    const updatePresent = `UPDATE presents SET status='open', holder=${req.user} WHERE id=${req.present}`;
    const updateParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.user}`;
    const getPresentData = `SELECT presents.*, game_history.event, game_history.user_key FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${socket.game}`;
    const getPresentItems = `SELECT presents.id AS pid, present_items.id AS id, present_items.description AS item_description, present_items.hyperlink AS item_hyperlink, present_items.image AS item_image FROM presents LEFT JOIN present_items ON present_items.present_key = presents.id WHERE presents.game_key=${socket.game} AND presents.status IN ('open', 'locked')`
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getMaxPresentSteals = `SELECT rule_maxstealsperpresent FROM games WHERE id=${socket.game}`
    connection.query(`${updatePresent};${updateHistory};${updateParticipant};${getPresentData};${getPresentItems};${getParticipantData};${getMaxPresentSteals}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const presentData = results[3];
        const itemData = results[4];
        const participants = results[5];
        const maxSteals = results[6][0].rule_maxstealsperpresent;
        const data = {participants, presents: transformPresentHistoryData(presentData, maxSteals, itemData)}
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
      const presents = transformPresentHistoryData(results[4], results[6][0].rule_maxstealsperpresent);
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
      io.in(socket.game).emit('game-reset', { game: results[4][0], presents: transformPresentHistoryData(results[5], results[4][0].rule_maxstealsperpresent), participants: results[6] });
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
    const updateHistory = `INSERT INTO game_history SET event='steal', present_key=${req.present}, game_key=${socket.game}, user_key=${req.to}`;
    const updatePresent = `UPDATE presents SET holder=${req.to}${req.locked ? `, status='locked'` : ``} WHERE id=${req.present}`;
    const updateFromParticipant = `UPDATE participants SET current_present_key=null WHERE user_key=${req.from}`;
    const updateToParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.to}`;
    const updateGame = `UPDATE games SET last_stolen_present=${req.present} WHERE id=${socket.game}`;
    const getPresentData = `SELECT presents.*, game_history.event, game_history.user_key FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${socket.game}`;
    const getPresentItems = `SELECT presents.id AS pid, present_items.id AS id, present_items.description AS item_description, present_items.hyperlink AS item_hyperlink, present_items.image AS item_image FROM presents LEFT JOIN present_items ON present_items.present_key = presents.id WHERE presents.game_key=${socket.game} AND presents.status IN ('open', 'locked')`
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getGameData = `SELECT * FROM games WHERE id=${socket.game}`
    connection.query(`${updatePresent};${updateHistory};${updateFromParticipant};${updateToParticipant};${updateGame};${getPresentData};${getPresentItems};${getParticipantData};${getGameData}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const presentData = results[5];
        const itemData = results[6];
        const participants = results[7];
        const game = results[8][0];
        const presents = transformPresentHistoryData(presentData, game.rule_maxstealsperpresent, itemData);
        io.in(socket.game).emit('present-stolen', {presents, participants, game});
    });
  });

  socket.on('swap-presents', req => {
    console.log(`User ${req.swapper.user} swapped presents with ${req.swappee.user}. Present ${req.swapper.present} and ${req.swappee.present}`);
    const updateSwapperHistory = `INSERT INTO game_history SET event='swap', present_key=${req.swapper.present}, game_key=${socket.game}, user_key=${req.swapper.user}`;
    const updateSwappeeHistory = `INSERT INTO game_history SET event='swap', present_key=${req.swappee.present}, game_key=${socket.game}, user_key=${req.swapper.user}`;
    const updateSwapperPresent = `UPDATE presents SET holder=${req.swappee.user} WHERE id=${req.swapper.present}`;
    const updateSwappeePresent = `UPDATE presents SET holder=${req.swapper.user},status='locked' WHERE id=${req.swappee.present}`;
    const updateSwapperParticipant = `UPDATE participants SET current_present_key=${req.swappee.present} WHERE user_key=${req.swapper.user}`;
    const updateSwappeeParticipant = `UPDATE participants SET current_present_key=${req.swapper.present} WHERE user_key=${req.swappee.user}`;
    const getPresentData = `SELECT presents.*, game_history.event, game_history.user_key FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${socket.game}`;
    const getPresentItems = `SELECT presents.id AS pid, present_items.id AS id, present_items.description AS item_description, present_items.hyperlink AS item_hyperlink, present_items.image AS item_image FROM presents LEFT JOIN present_items ON present_items.present_key = presents.id WHERE presents.game_key=${socket.game} AND presents.status IN ('open', 'locked')`
    const getParticipantData = `SELECT * FROM participants WHERE game_key=${socket.game} ORDER BY turn`;
    const getGameData = `SELECT * FROM games WHERE id=${socket.game}`;
    connection.query(`${updateSwapperHistory};${updateSwappeeHistory};${updateSwapperPresent};${updateSwappeePresent};${updateSwapperParticipant};${updateSwappeeParticipant};${getPresentData};${getPresentItems};${getParticipantData};${getGameData}`,
      (error, results, fields) => {
        if (error) throw error;
        const presentData = results[6];
        const itemData = results[7];
        const participants = results[8];
        const game = results[9][0];
        const presents = transformPresentHistoryData(presentData, game.rule_maxstealsperpresent, itemData);
        io.in(socket.game).emit('presents-swapped', { presents, game, participants});
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

    if (results.length > 1) {
      throw new Error('More than one user with this username');
    }

    try {
      bcrypt.compare(req.body.password, results[0].password).then(match => {
        if (!match) {
          throw new Error('Authentication failed');
        }

        const { id, username, first_name, last_name } = results[0];
        let token;
        try {
          token = jwt.sign({ id }, config.secretKey);
        } catch (e) {
          throw e;
        }
        res.send({ id, username, first_name, last_name, token});
        next();
      });
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
  if (req.method === 'OPTIONS' || ['/login', '/register', '/uploads/images/*'].includes(req.route.path)) {
    return next();
  }
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      throw new Error('Authentication failed!');
    }
    const decodedToken = jwt.verify(token, config.secretKey);
    req.userData = { userId: decodedToken.id, token };
    next();
  } catch (err) {
    throw err;
  }
});

server.get('/games', (req, res, next) => {
  console.log('GET games');
  connection.query('SELECT games.id, games.administrator, games.status, participants.checked_in, presents.id AS present FROM (((games INNER JOIN participants ON games.id = participants.game_key) INNER JOIN users ON users.id = participants.user_key) LEFT JOIN presents ON (users.id = presents.gifter AND presents.game_key = games.id)) WHERE users.id=?',
    [req.userData.userId],
    (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      res.send(results);
      next();
  });
});

server.get('/games/:id', (req, res, next) => {
  console.log('GET game');
  connection.query('SELECT * FROM games WHERE id=?', [req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results[0]);
    res.send(results[0]);
    next();
  });
});

server.put('/game/:id/checkIn', (req, res, next) => {
  console.log(`PUT checking user ${req.userData.userId} into game ${req.params.id}`);
  connection.query('UPDATE participants SET checked_in=1 WHERE game_key=? AND user_key=?', [req.params.id, req.userData.userId], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    res.send();
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

server.post('/game/:id/present', (req, res, next) => {
  console.log(`POST present from user ${req.userData.userId} into game ${req.params.id}`);
  const presentData = req.body;
  const files = req.files;

  if (!presentData.items || presentData.items.length < 1) {
    throw new Error('Present must have at least one item');
  }

  const queries = [
    `SELECT id FROM participants WHERE user_key=${req.userData.userId} AND game_key=${req.params.id};SELECT id FROM presents WHERE gifter=${req.userData.userId} AND game_key=${req.params.id}`,
    `INSERT INTO presents SET gifter=${req.userData.userId}, status='wrapped',${files.wrapping ? ` wrapping='${files.wrapping.path}',` : ''} game_key=${req.params.id}; SELECT id FROM presents WHERE gifter=${req.userData.userId} AND game_key=${req.params.id}`
  ]

  connection.query(queries[0], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    if (results[0].length < 1) {
      throw new Error('Attempted to add a new present for a game the user is not a participant of');
    }
    if (results[1].length > 0) {
      throw new Error('Attempted to add a new present for a game that the user already has a present for');
    }

    connection.query(queries[1], (err, re, fds) => {
      if (err) throw err;
      console.log(re);
      if (re[1].length < 1) {
        throw new Error('Something went wrong with adding the present');
      }

      const present_key = re[1][0].id;
      const items = JSON.parse(presentData.items).map(item => `(${present_key}, "${item.description}", ${item.hyperlink ? `"${item.hyperlink}"` : 'null'}, ${item.image ? `"${files[item.id].path}"` : 'null'})`);
      connection.query(`INSERT INTO present_items (present_key, description, hyperlink, image) VALUES ${items}`, (e, r, f) => {
        if (e) throw e;
        console.log(r);
        res.send({});
        next();
      });
    });
  });
});

server.get('/game/:id/presents', (req, res, next) => {
  console.log('GET game presents');
  const getPresentData = `SELECT presents.*, game_history.event, game_history.user_key FROM presents LEFT JOIN game_history ON presents.id = game_history.present_key WHERE presents.game_key=${req.params.id}`;
  const getPresentItems = `SELECT presents.id AS pid, present_items.id AS id, present_items.description AS item_description, present_items.hyperlink AS item_hyperlink, present_items.image AS item_image FROM presents LEFT JOIN present_items ON present_items.present_key = presents.id WHERE presents.game_key=${req.params.id} AND presents.status IN ('open', 'locked')`
  const getMaxPresentSteals = `SELECT rule_maxstealsperpresent FROM games WHERE id=${req.params.id}`;
  connection.query(
    `${getPresentData};${getPresentItems};${getMaxPresentSteals}`,
    [req.params.id, req.params.id, req.params.id],
    (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      const presentHistory = results[0];
      const presentItems = results[1];
      const maxPresentSteal = results[2][0];
      res.send(transformPresentHistoryData(presentHistory, maxPresentSteal, presentItems));
      next();
    }
  );
});

server.get('/game/:id/present/:pid', (req, res, next) => {
  console.log(`GET present ${req.params.pid}`);
  connection.query('SELECT presents.* AS pid, present_items.id AS id, present_items.description AS item_description, present_items.hyperlink AS item_hyperlink, present_items.image AS item_image FROM presents LEFT JOIN present_items ON present_items.present_key = presents.id WHERE presents.game_key=? AND presents.id=?', [req.params.id, req.params.pid], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    if (results.length < 1) {
      throw new Error('No present with that data exists');
    }
    res.send(transformPresentData(results));
    next();
  });
});

server.del('/game/:id/present/:pid', (req, res, next) => {
  console.log(`DELETE present ${req.params.pid}`);
  connection.query('SELECT id, wrapping FROM presents WHERE id=? AND gifter=?', [req.params.pid, req.userData.userId], (error, results, fields) => {
    if (error) throw error;
    console.log(results);

    const presentData = results[0];
    const unlinkFiles = [presentData.wrapping];

    if (results.length < 1) {
      throw new Error('This user does not have this present');
    }

    connection.query('SELECT image FROM present_items WHERE present_key=?;DELETE FROM present_items WHERE present_key=?;DELETE FROM presents WHERE id=?', [req.params.pid, req.params.pid, req.params.pid], (error, results, fields) => {
      if (error) throw error;
      console.log(results);

      const presentItems = results[0];
      unlinkFiles.push(...presentItems.map(item => item.image));
      unlinkFiles.forEach(file => fs.unlink(file, err => { console.log(err)}));

      res.send({});
      next();
    });
  });
});

server.put('/game/:id/presents/:pid/update', (req, res, next) => {
  console.log(`PUT updating present ${req.params.pid}`);
  
  const {pid} = req.params;
  const newItems = JSON.parse(req.body.items);
  const changeGame = req.body.game_key;
  const changeWrapping = req.files.wrapping;
  const files = req.files;
  const unlinkFiles = [];
  const firstQuery = `SELECT * FROM presents WHERE id=${pid} AND gifter=${req.userData.userId};SELECT * FROM present_items WHERE present_key=${pid}${changeGame ? `;SELECT id FROM presents WHERE game_key=${changeGame} AND gifter=${req.userData.userId}` : ''}`;

  connection.query(firstQuery, (error, results, fields) => {
    if (error) throw error;

    const presentData = results[0];

    console.log(results);
    if (presentData.length < 1) throw new Error('Attempted to change a present that either does not exist or was not gifted by this user.');
    if (results[2] && results[2].length > 0) throw new Error('Cannot move present, this user already has a present for this game');
    
    const secondQuery = [];
    
    if (newItems) {
      const presentItems = results[1];
      let values = '';

      if (presentItems.length > 0) {
        let deletedItems = presentItems.filter(item => !newItems.map(i => i.id).includes(item.id));

        let updatedItems = newItems.filter(item =>
          presentItems.filter(i =>
            (i.id === item.id) && (
              (i.description !== item.description) ||
              (i.hyperlink !== item.hyperlink) ||
              item.image
            )
          ).length > 0
        );

        let changedImages = presentItems.filter(i => updatedItems.filter(item => item.id === i.id && item.image).length > 0);
        unlinkFiles.push(...changedImages.map(i => i.image));

        let addedItems = newItems.filter(item => (typeof item.id === 'string') && (item.id.includes('new')));

        if (deletedItems.length > 0) {
          secondQuery.push(`DELETE FROM present_items WHERE id IN (${deletedItems.map(item => item.id).join()})`);
        }

        updatedItems = updatedItems ? updatedItems.map(item => `(${item.id}, ${pid}, '${item.description}', ${item.hyperlink ? `'${item.hyperlink}'` : 'null'}, ${item.image ? `'${files[item.id].path}'` : presentItems.find(i => i.id === item.id).image ? `'${presentItems.find(i => i.id === item.id).image}'` : 'null'})`).join() : '';
        addedItems = addedItems ? addedItems.map(item => `(null, ${pid}, '${item.description}', '${item.hyperlink}', '${files[item.id].path}')`).join() : '';

        if (updatedItems || addedItems) {
          values = `${updatedItems}${updatedItems && addedItems ? ',' : ''}${addedItems}`;
        }
      } else {
        values = newItems.map(item => `(null, ${pid}, '${item.description}')`).join();
      }

      if (values) {
        secondQuery.push(`INSERT INTO present_items (id, present_key, description, hyperlink, image) VALUES ${values} AS \`item\` ON DUPLICATE KEY UPDATE description=item.description, hyperlink=item.hyperlink, image=item.image`);
      }
    }

    if (changeGame || changeWrapping) {
      secondQuery.push(`UPDATE presents SET ${changeGame ? `game_key=${changeGame}` : ''}${changeGame && changeWrapping ? ',' : ''}${changeWrapping ? `wrapping='${changeWrapping.path}'`: ''} WHERE id=${pid}`);
      unlinkFiles.push(changeWrapping ? presentData[0].wrapping : null);
    }

    if (secondQuery.length < 1) {
      console.log('Nothing to see here');
      res.send({});
      next();
    } else {
      connection.query(secondQuery.join(';'), (error, results, fields) => {
        if (error) throw error;
        console.log(results);

        unlinkFiles.forEach(file => fs.unlink(file, err => {
          console.log(err);
        }));

        res.send({});
        next();
      });
    }
  });
});

server.put('/updateUser', (req, res, next) => {
  console.log('PUT update user'); // todo make it so that an admin can also call this, not just the person signed in
  const allowedParams = ['username', 'password'];
  const updateFields = Object.keys(req.body);
  if (!updateFields.every(key => allowedParams.includes(key))) {
    throw new Error('Attempted to update a user value that is not allowed');
  }

  const queryString = `UPDATE users SET 
    ${Object.entries(req.body).map((entry) => `${entry[0]}='${entry[1]}'`).join(' ')} WHERE id=${req.userData.userId};
    SELECT id,username,first_name,last_name FROM users WHERE id=${req.userData.userId}`;
  connection.query(queryString, (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    const {id, username, first_name, last_name} = results[1][0];
    res.send({ id, username, first_name, last_name, token: req.userData.token});
    next();
  });
});

server.put('/resetPassword', (req, res, next) => {
  console.log(`Resetting password for user ${req.userData.userId}`);
  try {
    bcrypt.hash(req.body.password, 12).then(pass => {
      connection.query('UPDATE users SET password=? WHERE id=?',
      [pass, req.userData.userId],
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

server.get('/uploads/images/*', restify.plugins.serveStaticFiles('./uploads/images'));

const transformPresentHistoryData = (history, maxPresentSteals, itemData) => {
  let tempPresents = [];
  const uniquePresents = [...new Set(history.map(present => present.id))];
  uniquePresents.forEach(id => {
    const present = history.find(p => p.id === id); // grabs a single instance of the history for the base present data
    let events = history.filter(event => event.id === id);
    events = events ? events.map(e => { return { event: e.event, user: e.user_key }}) : null;
    const steals = events.filter(e => e.event === 'steal');
    const items = itemData ? itemData.filter(item => item.pid === id) : null;
    tempPresents.push({
      id,
      items: items && items.length > 0 ? transformPresentData(items).items : null,
      gifter: present.gifter,
      status: present.status,
      holder: present.holder,
      wrapping: present.wrapping, 
      maxSteals: steals ? steals.length >= maxPresentSteals : false,
      history: events
    });
  });

  return tempPresents;
};

const transformPresentData = (data) => {
  console.log(data);
  const {gifter, status, holder, game_key, wrapping} = data[0];
  const presentdata = {
    id: data[0].pid,
    gifter, status, holder, game_key, wrapping,
    items: data.map(item => { return {id: item.id, description: item.item_description, hyperlink: item.item_hyperlink, image: item.item_image}})
  };

  return presentdata;
}