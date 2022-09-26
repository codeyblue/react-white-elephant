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

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});

server.get('/presents', function (req, res, next) {
  console.log('get present');
  connection.query('select * from presents', function (error, results, fields) {
    if (error) throw error;
    console.log(results);
    res.send(results);
    next();
  });
 });

server.get('/presents/:id', function (req, res) {
  connection.query('select * from presents where id=?', [req.params.id], function (error, results, fields) {
    if (error) throw error;
    res.end(JSON.stringify(results));
  });
 });

server.post('/presents', function (req, res) {
  var postData  = req.body;
  connection.query('INSERT INTO presents SET ?', postData, function (error, results, fields) {
    if (error) throw error;
    res.end(JSON.stringify(results));
  });
 });

server.put('/presents', function (req, res) {
  connection.query('UPDATE `presents` SET `gifter`=?, where `id`=?', [req.body.gifter, req.body.id], function (error, results, fields) {
    if (error) throw error;
    res.end(JSON.stringify(results));
  });
 });

// server.delete('/presents/:id', function (req, res) {
//     connection.query('DELETE FROM `presents` WHERE `id`=?', [req.params.id], function (error, results, fields) {
//      if (error) throw error;
//      res.end('Record has been deleted!');
//    });
//  });