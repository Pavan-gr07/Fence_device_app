const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');
const net = require('net');
const portfinder = require('portfinder');

// Store references
let mainWindow = null;
let backendProcess = null;
let backendPort = 30002; // Default port
let backendReady = false;

// Check if a port is in use
async function findAvailablePort(startPort) {
    portfinder.basePort = startPort;
    try {
        return await portfinder.getPortPromise();
    } catch (err) {
        console.error('Error finding available port:', err);
        return startPort + 1; // Fallback
    }
}

// Start the backend server
async function startBackendServer() {
    try {
        // Find an available port
        backendPort = await findAvailablePort(30002);

        const isProduction = app.isPackaged;
        let serverPath;

        if (isProduction) {
            // In production, use the path relative to the app resource directory
            serverPath = path.join(process.resourcesPath, 'app', 'backend', 'server.js');
            if (!fs.existsSync(serverPath)) {
                // Try alternative path
                serverPath = path.join(__dirname, 'backend', 'server.js');
            }
        } else {
            // In development
            serverPath = path.join(__dirname, 'backend', 'server.js');
        }

        console.log(`Starting backend from: ${serverPath} on port ${backendPort}`);

        // Pass the port as an environment variable
        backendProcess = fork(serverPath, [], {
            env: { ...process.env, PORT: backendPort },
            silent: true
        });

        // Handle stdout
        backendProcess.stdout.on('data', (data) => {
            const message = data.toString().trim();
            console.log(`Backend: ${message}`);

            // If the server is running, we're ready
            if (message.includes('Backend running at')) {
                backendReady = true;
                if (mainWindow) {
                    mainWindow.webContents.send('backend-ready', { port: backendPort });
                }
            }
        });

        // Handle stderr
        backendProcess.stderr.on('data', (data) => {
            console.error(`Backend Error: ${data}`);
        });

        // Handle exit
        backendProcess.on('exit', (code, signal) => {
            console.log(`Backend process exited with code ${code} and signal ${signal}`);
            backendProcess = null;
            backendReady = false;
        });

        // Return the port that the backend is running on
        return backendPort;
    } catch (error) {
        console.error(`Failed to start backend: ${error}`);
        return null;
    }
}

// Create the main window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, 'icon.ico'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload.js')
        },
    });
    // mainWindow.setMenu(null)
    // Load the index.html file
    const indexPath = path.join(__dirname, 'frontend', 'dist-react', 'index.html');
    mainWindow.loadURL(`file://${indexPath}`);

    // If the backend is already ready, send the port
    if (backendReady && backendPort) {
        mainWindow.webContents.send('backend-ready', { port: backendPort });
    }

    // Handle window close
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App ready event
app.whenReady().then(async () => {
    await startBackendServer();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Handle IPC messages from the renderer
ipcMain.handle('get-backend-port', async () => {
    return backendPort;
});

// When all windows are closed
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Before the app quits
app.on('before-quit', () => {
    if (backendProcess) {
        console.log('Killing backend process...');

        // On Windows
        if (process.platform === 'win32') {
            const kill = require('tree-kill');
            kill(backendProcess.pid);
        } else {
            // On Unix-like systems
            backendProcess.kill();
        }
    }
});