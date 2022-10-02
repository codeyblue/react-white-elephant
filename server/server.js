const {Server} = require('socket.io');
const restify = require('restify');
const mysql = require('mysql2');
const corsMiddleware = require('restify-cors-middleware');
const { jsonBodyParser } = require('restify/lib/plugins');
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

io.on('connection', socket => {
  console.log('a user connected');
  socket.emit('connection', null);

  socket.on('open-present', req => {
    console.log(`User ${req.user} opened present ${req.present}`);
    const updateHistory = `INSERT INTO game_history SET event='open', present_key=${req.present}, game_key=${req.game}`;
    const updatePresent = `UPDATE presents SET status='open', holder=${req.user} WHERE id=${req.present}`;
    const updateParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.user}`;
    const getPresentData = `SELECT * FROM presents WHERE id=${req.present}`;
    const getHistory = `SELECT id, event FROM game_history WHERE present_key=${req.present}`;
    const getParticipantData = `SELECT * FROM participants WHERE user_key=${req.user}`;
    connection.query(`${updatePresent};${updateHistory};${updateParticipant};${getPresentData};${getHistory};${getParticipantData}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const data = {participant: {...results[5][0]}, present: {...results[3][0], history: results[4]}};
        socket.emit('present-opened', data);
    });
  });

  socket.on('steal-present', req => {
    console.log(`User ${req.to} stole present ${req.present} from ${req.from}`);
    const updateHistory = `INSERT INTO game_history SET event='steal', present_key=${req.present}, game_key=${req.game}`;
    const updatePresent = `UPDATE presents SET holder=${req.to} WHERE id=${req.present}`;
    const updateFromParticipant = `UPDATE participants SET current_present_key=null WHERE user_key=${req.from}`;
    const updateToParticipant = `UPDATE participants SET current_present_key=${req.present} WHERE user_key=${req.to}`;
    const getPresentData = `SELECT * FROM presents WHERE id=${req.present}`
    const getHistory = `SELECT id, event FROM game_history WHERE present_key=${req.present}`;
    const getFromParticipantData = `SELECT * FROM participants WHERE user_key=${req.from}`;
    const getToParticipantData = `SELECT * FROM participants WHERE user_key=${req.to}`;
    connection.query(`${updatePresent};${updateHistory};${updateFromParticipant};${updateToParticipant};${getPresentData};${getHistory};${getFromParticipantData};${getToParticipantData}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const data = { fromParticipant: {...results[6][0]}, toParticipant: {...results[7][0]}, present: {...results[4][0], history: results[5]}};
        socket.emit('present-stolen', data);
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
    const getSwaperPresentData = `SELECT * FROM presents WHERE id=${req.swaper.present}`;
    const getSwapeePresentData = `SELECT * FROM presents WHERE id=${req.swapee.present}`;
    const getSwaperPresentHistory = `SELECT id, event FROM game_history WHERE present_key=${req.swaper.present}`;
    const getSwapeePresentHistory = `SELECT id, event FROM game_history WHERE present_key=${req.swapee.present}`;
    const getSwaperParticipantData = `SELECT * FROM participants WHERE user_key=${req.swaper.user}`;
    const getSwapeeParticipantData = `SELECT * FROM participants WHERE user_key=${req.swapee.user}`;
    connection.query(`${updateSwaperHistory};${updateSwapeeHistory};${updateSwaperPresent};${updateSwapeePresent};${updateSwaperParticipant};${updateSwapeeParticipant};${getSwaperPresentData};${getSwapeePresentData};${getSwaperPresentHistory};${getSwapeePresentHistory};${getSwaperParticipantData};${getSwapeeParticipantData}`,
      (error, results, fields) => {
        if (error) throw error;
        console.log(results);
        const data = {
          swaper: {
            participant: {...results[10][0]},
            present: {...results[7][0], history: results[9]}
          },
          swapee: {
            participant: {...results[11][0]},
            present: {...results[6][0], history: results[8]}
          }
        }
        socket.emit('presents-swapped', data);
    });
  });

  io.on('disconnect', () => {
    console.log('disconnect')
  });
});

server.listen(config.port, () => {
  console.log('%s listening at %s', server.name, server.url);
});
