const user = require('./user');

const mountRoutes = (app) => {
    app.use('/api/user', user);
};

module.exports = mountRoutes;