'use strict';

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3_000;

const END_LINE = '\n';
const END_CONTENT = '\n\n';

let emitters = [];

app.use(cors());

app.get('/subscribe', (req, res, next) => {
  const emitter = { id: uuidv4(), client: res };

  req.setTimeout(30_000);

  res.status(200);
  res.header('Cache-Control', 'no-cache');
  res.header('Content-Type', 'text/event-stream');
  res.header('Connection', 'keep-alive');
  res.header('Access-Control-Allow-Origin', '*');
  res.on('close', () => removeEmitters([emitter]));
  res.flushHeaders();

  emitters.push(emitter);
  console.info(`SUBSCRIBED ID ${emitter.id}`);

  next();
});

app.get('/emit', (req, res) => {
  const remove = [];

  emitters.forEach(({ id, client }) => {
    console.info(`EMITTED    ID ${id}`);
    client.write(`id:${id}${END_LINE}data:${new Date().toISOString()}${END_CONTENT}`);
  });

  removeEmitters(remove);
  res.status(200).send();
});

app.get('/close', (req, res) => {
  removeEmitters(emitters);
  res.status(200).send();
});

app.listen(port, () => console.log(`Server listening on port ${port}`));

function removeEmitters(remove) {
  emitters = emitters.filter(({ id, client }) => {
    if (remove.findIndex((r) => r.id === id) === -1) return true;
    console.info(`REMOVED    ID ${id}`);
    client.end();
    return false;
  });
}
