import { app, BrowserWindow } from 'electron';

const criarJanela = () => {
    const janela = new BrowserWindow({
        width: 800,
        height: 600
    });

    janela.loadFile('../../src/renderer/frmPrincipal.html');
};

app.whenReady().then(criarJanela);