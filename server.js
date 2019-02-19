// Include the cluster module
const cluster = require('cluster');

// Code to run if we're in the master process
if (cluster.isMaster) {
    // Count the machine's CPUs
    const cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (let i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    // Listen for terminating workers
    cluster.on('exit', function(worker) {
    // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();
    });

    // Code to run if we're in a worker process
} else {
    require('./server/libloader.js');
    const express = require('express');
    const bodyParser = require('body-parser');
    const validator = require('express-validator');
    const path = require('path');

    // Get our API routes
    const api = require('./server/routes');

    const app = express();
    const cors = require('cors');

    app.use(cors());
    app.use(bodyParser.urlencoded({
        extended: false,
    }));
    // parse application/json
    app.use(bodyParser.json());

    // static content
    app.use(express.static(path.join(__dirname, 'dist')));
    app.use(validator()); // required for Express-Validator

    // Set our api routes
    app.use('/api', api(app));

    // Catch all other routes and return the index file
    app.get('*', function(req, res) {
        res.sendFile(path.join(__dirname, 'dist/index.html'));
    });

    const port = process.env.PORT || 3000;
    const server = require('http').Server(app); /* eslint-disable-line */
    server.listen(port, function() {
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}
