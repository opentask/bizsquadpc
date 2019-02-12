'use strict';
const electron = require('electron');
const { ipcMain,Menu } = require('electron');
const { shell,autoUpdater } = require('electron');
const url = require('url');
const path = require('path');
// const {dialog} = require('electron');
// Module to control application life.
const { app } = electron;
// Module to create native browser window.
const { BrowserWindow } = electron;

let win;
let chatRoom;
let selectSquad;

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 360,
        height: 600,
        frame: false,
        minWidth:360,
        minHeight:600,
        maxWidth:570,
        maxHeight:700,
        titleBarStyle: 'hidden-inset',
    });

    win.loadURL(url.format({
        pathname: path.join(__dirname, '../www/index.html'),
        protocol: 'file:',
        slashes: true
    }))
    
    // 개발자 도구를 엽니다. 개발완료 시 주석.
    win.webContents.openDevTools();
    
    // 창이 닫히면 호출됩니다.
    win.on('closed', () => {
    // 윈도우 객체의 참조를 삭제합니다. 보통 멀티 윈도우 지원을 위해
    // 윈도우 객체를 배열에 저장하는 경우가 있는데 이 경우
    // 해당하는 모든 윈도우 객체의 참조를 삭제해 주어야 합니다.
        win = null;
    });
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function(){
    createWindow();
});
// 모든 창이 닫히면 애플리케이션 종료.
app.on('window-all-closed', () => {
    // macOS의 대부분의 애플리케이션은 유저가 Cmd + Q 커맨드로 확실하게
    // 종료하기 전까지 메뉴바에 남아 계속 실행됩니다.
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
ipcMain.on('loadGH', (event, arg) => {
    shell.openExternal(arg);
});


ipcMain.on('createChatRoom', (event, squad) => {

    selectSquad = squad;

    chatRoom = new BrowserWindow({
        width: 360,
        height: 600,
        frame: false,
        minWidth:360,
        minHeight:600,
        maxWidth:570,
        maxHeight:700,
        titleBarStyle: 'hidden-inset',
    });
    chatRoom.loadURL(url.format({
        pathname: path.join(__dirname,'../src/pages/tab/squad/chat-room/chat-room.html'),
        protocol: 'file:',
        slashes: true,
    }))
    // 개발자 도구를 엽니다. 개발완료 시 주석.
    chatRoom.webContents.openDevTools();
});

ipcMain.on('giveMeSquadValue', (event,text) => {
    event.sender.send('selectSquad',selectSquad);
})


setInterval(() => {
    autoUpdater.checkForUpdates();
}, 60000)

autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
    const dialogOpts = {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Application Update',
      message: process.platform === 'win32' ? releaseNotes : releaseName,
      detail: '새로운 버전이 다운로드 되었습니다. 애플리케이션을 재시작하여 업데이트를 적용해 주세요.'
    }
  
    dialog.showMessageBox(dialogOpts, (response) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
})
autoUpdater.on('error', message => {
    console.error('애플리케이션을 업데이트하는 도중 오류가 발생하였습니다.')
    console.error(message)
  })
