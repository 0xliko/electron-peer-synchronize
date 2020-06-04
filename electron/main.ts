import { app, ipcMain, BrowserWindow } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as os from 'os';
import * as fs from 'fs';
import * as dgram from 'dgram';
const _dir = path.resolve("./");
const socket: dgram.Socket = dgram.createSocket("udp4");
const hostname: string = os.hostname();
let connectSig: { type: string, kind: string, hostname: string } = { type: 'connect', kind: 'new', hostname: hostname };
var ipList: { [key: string]: { hostname: string, live: boolean } } = {};
var ipScanList: { [key: string]: { ping: Date, pong: Date } } = {};
const broadMask: string = fs.readFileSync("./broadcast.conf").toString();
socket.bind(8089);
let mainWindow: Electron.BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(`file://${_dir}/page/index.html`)

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
app.on('ready', createWindow);
app.allowRendererProcessReuse = true;


function updateLiveHosts() {
  for (const iterator of Object.keys(ipScanList)) {
    var stamp = ipScanList[iterator];
    var state = true;
    if (stamp.pong < stamp.ping)
      state = false;
    if (state != ipList[iterator].live) {
      ///// case state change case 
      //// emit the render process

      sendMessageToRender({ type: 'host-update', address: iterator, hostname: ipList[iterator].hostname, state: state });
    }
    ipList[iterator].live = state;
  }
}
function scanLiveHosts() {
  for (const iterator of Object.keys(ipList)) {
    scanLiveHost(iterator);
    ipScanList[iterator].ping = new Date();
  }
}
function scanLiveHost(host: string) {
  var message = JSON.stringify({ type: 'ping' });
  socket.send(message, 0, message.length, 8089, host);
}
function sendMessageToRender(messsage: object) {
  mainWindow?.webContents.send('message', messsage);
}
function sendMessage(message: any, address: string | null) {
  if (typeof message == 'string')
    socket.send(message, 0, message.length, 8089, address || broadMask);
  else if (typeof message == 'object') {
    var string: string = JSON.stringify(message);
    socket.send(string, 0, string.length, 8089, address || broadMask);
  }
}
function processMessage(message: any) {
  switch (message.type) {
    case 'connect':
      {
        if (message.hostname == hostname)
          break;
        if (Object.keys(ipList).indexOf(message.address) == -1) {
          ipList[message.address] = { hostname: message.hostname, live: true };
          ipScanList[message.address] = { ping: new Date(), pong: new Date() };
          if (message.kind === 'new') {
            connectSig.kind = 'replay';
            sendMessage(connectSig, message.address);
          }
          sendMessageToRender({ type: 'host-update', address: message.address, hostname: message.hostname, state: true });
        }
        else if (Object.keys(ipList).indexOf(message.address) > -1) {
          if (ipList[message.address].live == true) {
            ///// yet did not disconnect state, so process nothing 
            break;
          }
          ipList[message.address].live = true;
          ipScanList[message.address] = { ping: new Date(), pong: new Date() };
          if (message.kind === 'new') {
            connectSig.kind = 'replay';
            sendMessage(connectSig, message.address);
          }
          sendMessageToRender({ type: 'host-update', address: message.address, hostname: message.hostname, state: true });
        }
      }
      break;
    case 'ping':
      {
        sendMessage(JSON.stringify({ type: 'pong' }), message.address);
      }
      break;
    case 'pong': {
      ipScanList[message.address].pong = new Date();
    }
      break;
    case 'message': {
      sendMessageToRender({ type: 'message', address: message.address, content: message.content })
    }
      break;
    default:
      break;
  }
}
socket.on("message", function (message: any, socket: dgram.Socket) {
  // Create output message.
  message = JSON.parse(message);
  message.address = socket.address;
  processMessage(message);
});

// When udp socket started and listening.
socket.on('listening', function () {
  var address = socket.address();
  console.log('UDP socket started and listening on ' + address.address + ":" + address.port);
  sendMessage(connectSig, null);
  setTimeout(() => {
    setInterval(updateLiveHosts, 3000);
  }, 1500);
  setInterval(scanLiveHosts, 3000);
});
ipcMain.on('message', (event, message) => {
  var type = message.type;
  if (type == 'logged') {
    var email = message.email;
    mainWindow?.loadURL(`file://${_dir}/page/page.html?email=${email}`);
  }
  else if (type == 'get-hosts') {
    sendMessageToRender({ type: 'host-list', list: ipList });
  }
  else if (type == 'peer-send') {
    var address = message.address;
    sendMessage(message.message, address);

  }
});

