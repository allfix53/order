import Sequelize from 'sequelize';
import debug from 'debug';

const error = debug('app:error');
const log = debug('app:log');
const connect = {
    develop: 'mysql://root:root@localhost/trans-order',
};
const env = (process.env.NODE_ENV) ? process.env.NODE_ENV : 'develop';
const sequelize = new Sequelize(connect[env], {
    logging: log
});
sequelize.authenticate()
    .then(() => {
        log('Connection has been established successfully.');
    }, (err) => {
        error('Unable to connect to the database:', err);
    });
    
export default (callback) => {
    callback({
        sequelize,
        Sequelize,
    });
};