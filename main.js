const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const net = require('net')

let win

function createWindow() {
    const menu = Menu.buildFromTemplate([])
    Menu.setApplicationMenu(menu)
    win = new BrowserWindow({
        resizable: true,
        width: 800,
        height: 600,
        title: '佳尼跟拍',
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'src', 'expose-window-apis.js')
        }
    })

    win.loadURL(`file://${__dirname}/dist/index.html`);
    // win.loadURL('http://localhost:8080/')
    // win.webContents.openDevTools();
    win.on('close', () => {
            win = null;
        })
        //   win.on('resize', () => {
        //       //win.reload()
        //   })
}
app.on('ready', createWindow)

app.on('window-all-cloased', () => {
    if (process.platform !== 'drawin') {
        app.quit();
    }
})

app.on('activate', () => {
    if (win === null) {
        createWindow()
    }
})