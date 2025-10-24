const { app, BrowserWindow } = require('electron');

console.log('app:', app);
console.log('BrowserWindow:', BrowserWindow);

if (app) {
    app.whenReady().then(() => {
        console.log('✅ Electron funcionando!');
        app.quit();
    });
} else {
    console.log('❌ app é undefined');
}
