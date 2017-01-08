import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import models from './models';
import debug from 'debug';
import api from './api';
import connectDb from './datasource';

const error = debug('app:error');
const log = debug('app:log');

const app = express();
app.server = http.createServer(app);

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "localhost");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (typeof req.headers.secretkey != 'string' && req.headers.secretkey != 'QZ37R7w@z4vTvqmsUe*!R*@7') {
    res.status(401)
    res.json({
      message: "Not allowed access"
    })
  } else {
    next()
  }
})

// connect db
connectDb(
  (db) => {
      models(db.sequelize, db.Sequelize, (model) => {
          db.sequelize
              .sync({
                  force: false
              })
              .then(() => {
                  log('Database scheme synced');
              }, (err) => {
                  error('An error occurred while creating the table:', err);
              });
              
          app.use('/', api(model, db.sequelize));
          app.server.listen(process.env.PORT || 8081);
          log(`Started on port ${app.server.address().port}`);
      });
  });

export default app;
