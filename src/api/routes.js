const user = require('./user');
const upload = require('./upload/uploadRoutes');

const mountRoutes = (app) => {
    app.use('/api/user', user);
    app.use('/api/upload', upload);
};

module.exports = mountRoutes;