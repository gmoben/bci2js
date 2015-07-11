var express = require('express'),
    io = require('socket.io'),
    fs = require('fs'),
    dgram = require('dgram'),
    bci2js = require('./index');

// Load settings
var settings = require('./settings.json');

// build AppConnector inferface with data from settings.json
var acSet = settings.appConnector;
var appConnector = bci2js.AppConnector(acSet.incomingIP, acSet.incomingPort, acSet.outgoingIP, acSet.outgoingPort);

// Build TrialManager
var trialManager = bci2js.TrialManager(appConnector);


// Create web controller app and websocket
var controlApp = express(),
    controlServer = require('http').createServer(controlApp),
    controlIO = io.listen(controlServer);
controlServer.listen(settings.websockets.controlServerPort);

// Serve all files in /public
controlApp.use(express.static(__dirname + '/public'));

// Serve controller HTML
controlApp.get('/', function (req, res) {
  res.sendfile(__dirname + 'public/index.html');
});


// Handle connection to the control client
controlIO.sockets.on('connection', function (controlSocket) {
  console.log('Control client connected via WebSocket');
  trialManager.setControlSocket(controlSocket);
});


// Create WebSocket for speller JS Client
var spellerIO = io.listen(settings.websockets.spellerPort);

// Handle connection to speller client
spellerIO.sockets.on('connection', function (spellerSocket) {
  console.log('Speller connected via WebSocket');
  trialManager.setSpellerSocket(spellerSocket);
});
