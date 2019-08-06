'use strict';
const electron = require('electron');
const windowStateKeeper = require('electron-window-state');
const { ipcMain,dialog } = require('electron');
const { shell } = require('electron');
const url = require('url');
const path = require('path');
const contextMenu = require('electron-context-menu')

// const {dialog} = require('electron');
// Module to control application life.
const { app,Notification,Menu } = electron;
// Module to create native browser window.
const { BrowserWindow } = electron;

// auto update //
const { autoUpdater } = require("electron-updater");
const logger = require('electron-log');

app.setAppUserModelId("com.bizsquad.ionic-electron");
app.setAsDefaultProtocolClient('bizsquad');

autoUpdater.logger = logger;
autoUpdater.logger["transports"].file.level = "info";

logger.info('App starting...');

let win;
let chatRooms;
let selectChatRoom;
let testRooms = {};


contextMenu({
	prepend: (defaultActions, params, browserWindow) => [{
		label: 'default',
		// Only show it when right-clicking images
		visible: params.mediaType === 'image'
	}]
});


function createWindow() {

    // windowStateKeeper
    let mainWindowState = windowStateKeeper({
        file: 'mainWindow.json',
        defaultWidth: 350,
        defaultHeight: 600
    });


    // Create the browser window.
    win = new BrowserWindow({
        'x': mainWindowState.x,
        'y': mainWindowState.y,
        'width': mainWindowState.width,
        'height': mainWindowState.height,
        frame: false,
        minWidth:350,
        minHeight:600,
        maxWidth:600,
        maxHeight:750,
        titleBarStyle: 'hidden-inset',
    });
    

    win.loadURL(url.format({
        pathname: path.join(__dirname, '../www/index.html'),
        protocol: 'file:',
        slashes: true
    }))
    mainWindowState.manage(win);

    // 개발자 도구를 엽니다. 개발완료 시 주석.
    // win.webContents.openDevTools();

    // 창이 닫히면 호출됩니다.
    win.on('closed', () => {
        // 윈도우 객체의 참조를 삭제합니다. 보통 멀티 윈도우 지원을 위해
        // 윈도우 객체를 배열에 저장하는 경우가 있는데 이 경우
        // 해당하는 모든 윈도우 객체의 참조를 삭제해 주어야 합니다.
            win = null;
            testRooms = null;
    });

    win.once('focus', () => win.flashFrame(false));
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function(){
    createWindow();
});
// 모든 창이 닫히면 애플리케이션 종료.
app.on('window-all-closed', () => {
    app.quit();
    // macOS의 대부분의 애플리케이션은 유저가 Cmd + Q 커맨드로 확실하게
    // 종료하기 전까지 메뉴바에 남아 계속 실행됩니다.
    // if (process.platform !== 'darwin') {
    //     app.quit();
    // }
});

ipcMain.on('windowsFlashFrame',(event, count) => {
    if(count > 0) {
        win.flashFrame(true);
    } else {
        win.flashFrame(false);
    }
})

ipcMain.on('loadGH', (event, arg) => {
    shell.openExternal(arg);
});

ipcMain.on('createChatRoom', (event, chatRoom) => {

    let chatRoomId;

    if(chatRoom.cid == null){
        // 스쿼드 채팅 일때 스쿼드의 doc id
        chatRoomId = chatRoom.sid;
    } else {
        // 개인 채팅 일떄 채팅방의 doc id
        chatRoomId = chatRoom.cid;
    }

    if(testRooms[chatRoomId]) {

        testRooms[chatRoomId].focus();

    } else {
        selectChatRoom = chatRoom;

        // console.log(selectChatRoom);

        // windowStateKeeper
        let chatWindowState = windowStateKeeper({
            file: `${chatRoomId}.json`,
            defaultWidth: 350,
            defaultHeight: 600,
        });
    
        testRooms[chatRoomId] = new BrowserWindow({
            'x': chatWindowState.x,
            'y': chatWindowState.y,
            'width': chatWindowState.width,
            'height': chatWindowState.height,
            frame: false,
            minWidth:350,
            minHeight:600,
            maxWidth:600,
            maxHeight:750,
            titleBarStyle: 'hidden-inset',
            opacity: 1,
        });
    
        testRooms[chatRoomId].loadURL(url.format({
            pathname: path.join(__dirname,'../www/index.html'),
            protocol: 'file:',
            slashes: true,
        }))

        // chatWindowState.manage(testRooms[chatRoomId]);
    }

    // 개발자 도구를 엽니다. 개발완료 시 주석.
    // testRooms[chatRoomId].webContents.openDevTools();

    // 창이 닫히면 호출됩니다.
    testRooms[chatRoomId].on('closed', () => {
        testRooms[chatRoomId] = null;
    });

});
 
ipcMain.on('resetValue',(e) =>{
    selectChatRoom = null;
});

ipcMain.on('giveMeRoomValue', (event,text) => {
    event.sender.send('selectRoom',selectChatRoom);
})
autoUpdater.on('checking-for-update', function () {
    sendStatusToWindow('Checking for update...');
});

autoUpdater.on('update-available', function (info) {
    // const dialogOpts = {
    //     type: 'info',
    //     buttons: ['OK'],
    //     title: 'Application Update',
    //     message: releaseNameG,
    //     detail: 'There is a new update.\nThe installation file is being downloaded.\n',
    //     icon: path.join(__dirname, 'logo512.png'),
    //     noLink : true
    // }
    // dialog.showMessageBox(dialogOpts, (response) => {
    //     if (response === 0) autoUpdater.quitAndInstall();
    //     })
    sendStatusToWindow('Update available.');
});

autoUpdater.on('update-not-available', function (info) {
    sendStatusToWindow('Update not available.');
});
autoUpdater.on('error', function (err) {
    sendStatusToWindow('Error in auto-updater.');
});

autoUpdater.on('download-progress', function (progressObj) {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + parseInt(progressObj.percent) + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    sendStatusToWindow(log_message);
});
autoUpdater.on('update-downloaded', (event,releaseName) => {

    // git의 버전을 담습니다.
    let releaseNameG = "";
    if(releaseName){
        releaseNameG = 'There is a new BizSquad version '+releaseName+'.'; 
    } else {
        releaseNameG = 'There is a new BizSquad version.';
    }

    const dialogOpts = {
        type: 'question',
        buttons: ['Install and Relaunch', 'Later'],
        title: 'Application Update',
        message: releaseNameG,
        detail: 'Do you want to install it now?\nWhen you quit the app,it will automatically start the installation.',
        icon: path.join(__dirname, 'logo512.png'),
        noLink : true
    }
    dialog.showMessageBox(dialogOpts, (response) => {
        if (response === 0) autoUpdater.quitAndInstall();
        })
});

autoUpdater.checkForUpdatesAndNotify();
// 10분마다 버전 체크 후 업데이트
setInterval(function() {
    autoUpdater.checkForUpdatesAndNotify();
 }, 600000);

function sendStatusToWindow(message) {
    logger.info(message);
}