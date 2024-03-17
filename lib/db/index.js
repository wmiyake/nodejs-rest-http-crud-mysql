'use strict';

const logger = require('../../logger.js');

const serviceBindings = require('kube-service-bindings');
const mysql = require('mysql2/promise');

let connectionOptions;
try {
  connectionOptions = serviceBindings.getBinding('MYSQL');
} catch (err) {
  const serviceHost = process.env.MY_DATABASE_SERVICE_HOST || process.env.MYSQL_SERVICE_HOST || 'localhost';
  const user = process.env.DB_USERNAME || process.env.MYSQL_USER || 'luke';
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || 'secret';
  const databaseName = process.env.MYSQL_DATABASE || 'my_data';
  connectionOptions = {
    host: serviceHost,
    user: user,
    password: password,
    database: databaseName
  };
}

const pool = mysql.createPool(connectionOptions);

async function didInitHappen() {
  const query = 'select * from products';

  try {
    await pool.query(query);
    logger.info('Database Already Created');
    return true;
  } catch (err) {
    return false;
  }
}

// -- Create the products table if not present
const initScript = `CREATE TABLE IF NOT EXISTS products (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  name      VARCHAR(40) NOT NULL,
  stock     BIGINT
);

DELETE FROM products;

INSERT INTO products (name, stock) values ('Maça', 10);
INSERT INTO products (name, stock) values ('Laranja', 10);
INSERT INTO products (name, stock) values ('Pera', 10);`;

async function query(text, parameters) {
  // Check that we have initialized the DB on each Query request
  const initHappened = await didInitHappen();
  if (!initHappened) {
    await init();
  }

  return pool.query(text, parameters);
}

async function init() {
  const initHappened = await didInitHappen();
  if (!initHappened) {
    return pool.query(initScript);
  }
}

module.exports = {
  query,
  init
};