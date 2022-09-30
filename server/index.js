const config  = require('./config');
const restify = require('restify');
const mysql = require('mysql2');
const corsMiddleware = require('restify-cors-middleware');
const { jsonBodyParser } = require('restify/lib/plugins');

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

server.pre(cors.preflight);
server.use(cors.actual);
server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.listen(8080, () => {
  console.log('%s listening at %s', server.name, server.url);
});

server.get('/games', (req, res, next) => {
  console.log('GET games');
  connection.query('select id from games', (error, results, fields) => {
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

server.put('/game/:id/active-chooser', (req, res, next) => {
  console.log('PUT game active chooser');
  connection.query('UPDATE games SET active_chooser=? where id=?', [req.body.participant, req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
});

server.get('/game/:id/participants', (req, res, next) => {
  console.log('GET game participants');
  connection.query('select * from participants where game_key=?', [req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
});

server.put('/game/:id/participants/set-turns', (req, res, next) => {
  console.log('PUT participant turns');
  let { order } = req.body;
  order = order.map(turn => `(${turn.participant}, ${turn.turn}, -1, ${req.params.id})`);
  const queryString = `INSERT INTO participants (id, turn, user_key, game_key) VALUES ${order.join(',')} AS \`order\` ON DUPLICATE KEY UPDATE turn = \`order\`.turn`;
  const getParticipants = `SELECT * FROM participants where game_key=${req.params.id} ORDER BY turn`;
  connection.query(`${queryString};${getParticipants}`, (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      res.send(results[1]);
      next();
    });
});

server.get('/game/:id/presents', (req, res, next) => {
  console.log('GET game presents');
  connection.query(
    'select presents.*, game_history.event from presents left join game_history on presents.id = game_history.present_key where presents.game_key=?',
    [req.params.id],
    (error, results, fields) => {
      if (error) throw error;
      console.log(results);
      res.send(results);
      next();
    }
  );
});

server.post('/game/:id/ready', (req, res, next) => {
  console.log('POST game ready');
  connection.query('UPDATE games SET status=? where id=?', ['ready', req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
});

server.post('/game/:id/start', (req, res, next) => {
  console.log('POST game start');
  connection.query('UPDATE games SET status=? where id=?', ['inprogress', req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
});

server.put('/presents/:id', (req, res, next) => {
  console.log('PUT present');
  const updateData = [];

  Object.keys(req.body).forEach((key, i) => {
    updateData.push(` \`${key}\`='${req.body[key]}'`);
  });

  const queryString = `UPDATE \`presents\` SET ${updateData.join(',')} where \`id\`=${req.params.id}`;

  connection.query(queryString, function (error, results, fields) {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
});

server.put('/game/:id/open-present/:pid', (req, res, next) => {
  console.log('PUT open-present');
  const updateHistory = `INSERT INTO game_history SET event='open', present_key=${req.params.pid}, game_key=${req.params.id}`;
  const updatePresent = `UPDATE presents SET status='open', holder=${req.body.user} where id=${req.params.pid}`;
  const getPresentData = `SELECT * FROM presents where id=${req.params.pid}`;
  const getHistory = `SELECT id, event FROM game_history where present_key=${req.params.pid}`;
  connection.query(`${updatePresent};${updateHistory};${getPresentData};${getHistory}`, (error, results, fields) => {
    if (error) throw error;
    console.log(results);
    const data = {...results[2][0], history: results[3]};
    res.send(data);
    next();
  });
});

server.put('/steal-present/:id', (req, res, next) => {
  console.log('PUT steal-present');
  let status = 'open';
  const events = ['INSERT INTO game_history SET event=\'steal\', present_key=' + req.params.id];
  if (req.body.lock) {
    events.push(';INSERT INTO game_history SET event=\'steal\', present_key=' + req.params.id);
    status = 'locked';
  }

  console.log('Update present');
  connection.query('UPDATE presents SET holder=?, status=? where id=?', [req.body.to, status, req.params.id], (error, results, fields) => {
    if (error) throw error;
    console.log(results);

    console.log('Update history');
    connection.query(events.join(''), (error, results, fields) => {
      if (error) {
        connection.query('UPDATE presents SET holder=?, status=? where id=?', [req.body.from, status, req.params.id], (error, results, fields) => {
          if (error) {
            throw error;
          }
        });
        throw error;
      }
      console.log(results);

      console.log('Return history')
      connection.query('SELECT * from game_history where present_key=?', [req.params.id], (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        res.send(results);
        next();
      });
    });
  });
});