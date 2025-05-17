const express = require('express');
const cors = require('cors');
const net = require('net');
const http = require('http');
const { processResponse } = require("./function");

const app = express();

app.use(cors({
    origin: '*', // ← Development only. In production, specify exact origin.
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));
const PORT = 30002;

// ✅ HTTP XML Proxy
app.get('/http-status', (req, res) => {
    const { ip } = req.query;
    if (!ip) return res.status(400).send('Missing IP');

    http.get(`http://${ip}/status.xml`, (response) => {
        let rawData = '';
        response.on('data', (chunk) => (rawData += chunk));
        response.on('end', () => {
            res.set('Content-Type', 'application/xml');
            res.send(rawData);
        });
    }).on('error', (err) => {
        console.error(err.message);
        res.status(500).send('Failed to fetch status.xml');
    });
});
app.get('/http', (req, res) => {
    const { ip, key } = req.query;
    if (!ip || !key) return res.status(400).send('Missing IP or key');

    http.get(`http://${ip}/leds.cgi?led=${key}`, (response) => {
        let rawData = '';
        response.on('data', (chunk) => (rawData += chunk));
        response.on('end', () => {
            res.status(200).send('Success');
        });
    }).on('error', (err) => {
        console.error(err.message);
        res.status(500).send('Failed to toggle LED');
    });
});


const COMMANDS = {
    ARM: "5455524E46454E43454F4E0000474353",
    DISARM: "5455524E46454E43454F464600854353",
    GADGET_ON: "5455524E4C494748544F4E00005E4353",
    GADGET_OFF: "5455524E4C494748544F4646009C4353",
    SERVICE_MODE_ON: "5352564943454D4F44454F4E008E4353",
    SERVICE_MODE_OFF: "5352564943454D4F44454F4646CC4353",
    POSTPONE: "504F5354504F4E450000000000784353",
    ACKNOWLEDGE: "5455524E414C41524D4F464600914353",
};

app.get('/tcp', async (req, res) => {
    const { ip, key } = req.query;

    if (!ip || !key) {
        return res.status(400).send('Missing IP or key');
    }

    const hexCommand = COMMANDS[key];
    if (!hexCommand) {
        return res.status(400).send('Invalid command key');
    }

    const port = 1515;
    const timeout = 200;
    const client = new net.Socket();
    let isHandled = false;

    const cleanup = () => {
        client.removeAllListeners();
        client.destroy();
    };

    try {
        await new Promise((resolve, reject) => {
            client.setTimeout(timeout);

            client.once('timeout', () => {
                if (!isHandled) {
                    isHandled = true;
                    console.error(`TCP connection to ${ip} timed out`);
                    cleanup();
                    reject(new Error(`Timeout after ${timeout}ms`));
                }
            });

            client.once('error', (err) => {
                if (!isHandled) {
                    isHandled = true;
                    console.error(`TCP error with ${ip}: ${err.message}`);
                    cleanup();
                    reject(err);
                }
            });

            client.once('data', (data) => {
                if (!isHandled) {
                    isHandled = true;
                    console.log(`Received response: ${data.toString('hex')}`);
                    cleanup();
                    resolve();
                }
            });

            client.connect(port, ip, () => {
                const bufferData = Buffer.from(hexCommand, 'hex');
                client.write(bufferData);
                console.log(`Sent command ${key} to ${ip}`);
            });
        });

        res.status(200).send('TCP command sent successfully');
    } catch (error) {
        if (!isHandled) {
            isHandled = true;
            res.status(500).send(error.message);
        }
    }
});



// ✅ Basic check route
app.get('/', (req, res) => {
    res.send('Backend is running');
});

// ✅ TCP Route
app.get('/tcp-status', async (req, res) => {
    const { ip } = req.query;
    if (!ip) return res.status(400).send('Missing IP');

    const port = 1515;
    const req_message = "474554414C4C535441545553009D4353";
    const timeout = 200;

    const client = new net.Socket();
    let isHandled = false;

    const cleanup = () => {
        client.removeAllListeners();
        client.destroy();
    };

    try {
        await new Promise((resolve, reject) => {
            client.setTimeout(timeout);

            client.once('timeout', () => {
                if (!isHandled) {
                    isHandled = true;
                    console.error(`TCP connection to ${ip} timed out`);
                    cleanup();
                    reject(new Error(`Timeout after ${timeout}ms`));
                }
            });

            client.once('error', (err) => {
                if (!isHandled) {
                    isHandled = true;
                    console.error(`TCP error with ${ip}: ${err.message}`);
                    cleanup();
                    reject(err);
                }
            });

            client.once('data', (data) => {
                if (!isHandled) {
                    isHandled = true;
                    // console.log(`Received data from ${ip}: ${data.toString('hex')}`);
                    cleanup();
                    resolve(data);
                }
            });

            client.connect(port, ip, () => {
                // console.log(`Connected to ${ip}:${port}`);
                const bufferData = Buffer.from(req_message, 'hex');
                client.write(bufferData);
                // console.log(`Sent request message to ${ip}`);
            });
        }).then(async (data) => {
            try {
                const processed = await processResponse(data, ip);
                res.status(200).json({ bufferData: processed });
            } catch (error) {
                console.error(`Error processing TCP response: ${error.message}`);
                res.status(500).send(`Error processing response: ${error.message}`);
            }
        });
    } catch (error) {
        if (!isHandled) {
            isHandled = true;
            res.status(500).send(error.message);
        }
    }
});



app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});