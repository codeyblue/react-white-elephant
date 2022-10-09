'use strict'

var mysql = require('mysql2');

module.exports = {
  name: 'rest-api',
  hostname : 'http://localhost',
  version: '0.0.1',
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 8080,
  db: {
    get : mysql.createPool({
      host     : 'localhost',
      user     : 'root',
      password : 'root',
      database : 'react_white_elephant',
      multipleStatements: true
    })
  },
  secretKey: 'secret'
}