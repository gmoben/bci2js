var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    dgram = require('dgram'),
    _ = require('underscore');

var serverSettings = require('./settings.json');

var bci2js = require('./index');

var states = {},
    targetIDs = [],
    trialConfig = {};

server.listen(8001);

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendfile(__dirname + 'public/index.html');
});

function appConnectorOut(ip, port, socket) {
  var appconn = dgram.createSocket('udp4');

  appconn.on("error", function (err) {
    console.log("AppConnector error:\n" + err.stack);
    appconn.close();
  });

  appconn.on("message", function (msg, rinfo) {
    var n = msg.toString('ascii').split(" "),
        name = n[0],
        val;

    if (n[1]) {
      if (n[1].indexOf("e") != -1) {
        var parts = n[1].split["e"];
        val = Math.pow(parseFloat(parts[0]), parseFloat(parts[2]));
      } else {
        val = parseInt(n[1], 10);
      }

      states[name] = val;

      if (name == 'StimulusCodeRes' && val !== 0) {
        bGetControlSig = true;
      } else if (bGetControlSig && name == 'Signal(1,0)') {
        classifier_results[states['StimulusCodeRes']] = val;
        bGetControlSig = false;
      }
    }

  });

  appconn.on("listening", function () {
    var address = appconn.address();
    console.log("server listening " +
        address.address + ":" + address.port);
  });

  appconn.bind(port, ip, function () {
    socket.emit('AppConnectorRecv connected', {address: ip + ':' + port});
    console.log("Connected to AppConnector output @ " + ip + ':' + port);
  });

  return appconn;
}

function appConnectorIn() {
  var appconn = dgram.createSocket('udp4');

  appconn.on("error", function (err) {
    console.log("AppConnector error:\n" + err.stack);
    appconn.close();
  });

  return appconn;
}

var acin = appConnectorIn();

function buildmsg(statename, value) {
  return new Buffer(statename + ' ' + value + '\n');
}

function sendmsg(msg, port, ip) {
  acin.send(msg, 0, msg.length, port, ip, function (err, bytes) { console.log ("Sent message: " + msg); });
}

function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function buildTrialSequence(targets, repetitions) {
  var seq = [];
  for (var i=0; i < repetitions; i++) {
    var res = shuffle(targets.slice(0));
    seq = seq.concat(res);
  }
  return seq;
}

var bGetControlSig = false,
    classifier_results = {};

var targets = {}, // key: stimcode, val: target DOM id
    stimcodes = {}; // key: target DOM id, key: stimcode

function trial_start(socket, targetIDs, repetitions) {
  // generate stimulus codes and associate target ids
  for (var i=0; i<targetIDs.length; i++) {
      stimcodes[targetIDs[i]] = i + 1;
      targets[i + 1] = targetIDs[i];
    }
    // generate flash sequences and signal client to begin flashing
    var seq = buildTrialSequence(targetIDs, repetitions);
    socket.emit('Trial Start', { sequence: seq, stimcodes: stimcodes, targets: targets });
}

io.sockets.on('connection', function (socket) {

  // Bind to AppConnector UDP input/output
  var inip = '10.32.38.158', // Windows
      outip = '10.32.38.159', // OSX
      outport = 5000,
      inport = 5001,
      acout = appConnectorOut(outip, outport, socket);

  socket.on('Trial Config', function(config) {
    console.log('Setting trial config: ' + config);
    trialConfig = config;
  });

  socket.on('Start Button', function () {
    console.log("config: ", trialConfig);
    trial_start(socket, trialConfig.targetIDs, trialConfig.repetitions);
  });

  socket.on('Flash Start', function (data) {
    // Set and Reset StimulusCode
    var stimcode_msg = buildmsg('StimulusCode', stimcodes[data.target_group]),
        stimtype_msg;

    if (data.attended) {
      stimtype_msg = buildmsg('StimulusType', 1);
    } else {
      stimtype_msg = buildmsg('StimulusType', 0);
    }

    sendmsg(stimtype_msg, inport, inip); // Send StimulusType
    sendmsg(stimcode_msg, inport, inip); // Send StimulusCode

    setTimeout(function() {
      sendmsg(buildmsg('StimulusCode', 0), inport, inip);
    }, 300);

  });

  socket.on('Trial End', function (data) {
    socket.emit('Classifier Results', {results: classifier_results});
  });

  // Tell client to start countdown
  // socket.emit('Begin Countdown');

});

app.get('/startTrial', function (req, res) {
  console.log("config: ", trialConfig);
  trial_start(socket, trialConfig.targetIDs, trialConfig.repetitions);
});
