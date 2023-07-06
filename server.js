// Include the cluster module
import cluster from 'cluster';
import {cpus} from 'os';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import {loadRoutes} from './server/routes.js';

const cpuCount = cpus().length;

// Code to run if we're in the master process
if (cluster.isPrimary && cpuCount !== 0) {
    // Create a worker for each CPU
    for (let i = 0; i < cpuCount; i++) {
        cluster.fork({
            workerverbose: i === 0,
        });
    }

    // Listen for terminating workers
    cluster.on('exit', function(worker) {
    // Replace the terminated workers
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();
    });

    // Code to run if we're in a worker process
} else {
    const app = express();

    app.use(cors());
    app.use(bodyParser.urlencoded({
        extended: false,
    }));
    // parse application/json
    app.use(bodyParser.json());

    const port = process.env.PORT || 3000;
    app.listen(port, function() {
        loadRoutes(app);
        console.log('Server running at http://127.0.0.1:' + port + '/');
    });
}
