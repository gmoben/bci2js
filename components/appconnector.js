var dgram = module.require('dgram'),
    _ = module.require('underscore');

//AppConnector
// Handles connections to BCI2000 AppConnector UDP ports
function AppConnector(inIP, inPort, outIP, outPort) {
    this.inIP = inIP;
    this.inPort = inPort;
    this.outIP = outIP;
    this.outPort = outPort;

    this.states = {};
    this.classifierResults = {};
    this.classifierFlag = false; // if true, store the next Signal(1,0) message in classifierResults


    this.incoming = this.buildIncomingSocket(inIP, inPort);
    this.outgoing = this.buildOutgoingSocket();
    
}

AppConnector.prototype.getClassifierResults = function() {
  return this.classifierResults;
};

AppConnector.prototype.buildIncomingSocket = function(ip, port) {
  var incoming = dgram.createSocket('udp4');

  incoming.on("error", function (err) {
    console.log("AppConnector error:\n" + err.stack);
    incoming.close();
  });

  incoming.on("message", _.bind(function (msg, rinfo) {
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
          
      this.states[name] = val;

      if (name == 'StimulusCodeRes' && val !== 0) {
        this.classifierFlag = true;
      } else if (this.classifierFlag && name == 'Signal(1,0)') {
        this.classifierResults[this.states['StimulusCodeRes']] = val;
        this.classifierFlag = false;
      }
    }

  }, this));

  incoming.on("listening", function () {
    var address = incoming.address();
    console.log("Listening to incoming data from AppConnector @ " +
        address.address + ":" + address.port);
  });

  incoming.bind(port, ip, _.bind(function (ip, port) {
    console.log("Bound to AppConnector output @ " + ip + ':' + port);
  }, this, ip, port));

  return incoming;
};

AppConnector.prototype.buildOutgoingSocket = function() {
    var outgoing = dgram.createSocket('udp4');

    outgoing.on("error", function (err) {
        console.log("AppConnector outgoing error:\n" + err.stack);
        outgoing.close();
    });

    return outgoing;
};


AppConnector.prototype.sendMessage = function(statename, value) {
    var msg = new Buffer(statename + ' ' + value + '\n');
    this.outgoing.send(msg, 0, msg.length, this.outPort, this.outIP, function (err, bytes) { console.log ("Sent message: " + msg); });
};

module.exports = function(inIP, inPort, outIP, outPort) {
    return new AppConnector(inIP, inPort, outIP, outPort);
};
