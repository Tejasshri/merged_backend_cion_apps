const mysql = require('mysql');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

// SSH configuration
const sshConfig = {
    host: '43.205.43.32',
    port: 22,
    username: 'bitnami',
    privateKey: fs.readFileSync(path.join(__dirname, 'key.pem'))
};

// MySQL configuration
const mysqlConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'bn_wordpress',
    password: '69d5ef578e58e1782b4bab7e7cfc6dad502d3c1d7031d184a9bed723f347502c',
    database: 'bitnami_wordpress'
};

// Forward configuration
const forwardConfig = {
    srcHost: '127.0.0.1',
    srcPort: 3306,
    dstHost: mysqlConfig.host,
    dstPort: mysqlConfig.port
};

// Create an SSH connection
const SSHConnection = new Promise((resolve, reject) => {
    const sshClient = new Client();
    sshClient.on('ready', () => {
        sshClient.forwardOut(
            forwardConfig.srcHost,
            forwardConfig.srcPort,
            forwardConfig.dstHost,
            forwardConfig.dstPort,
            (err, stream) => {
                if (err) reject(err);
                const updatedDbServer = { ...mysqlConfig, stream };
                const connection = mysql.createConnection(updatedDbServer);
                connection.connect((error) => {
                    if (error) reject(error);
                    resolve(connection);
                });
            }
        );
    }).connect(sshConfig);
});

// Use the SSH connection
SSHConnection.then((connection) => {
    connection.query('SELECT * FROM your_table', (error, results) => {
        if (error) throw error;
        console.log(results);
        connection.end();
    });
}).catch((error) => {
    console.error('Error connecting to the database:', error);
});
