var _ = module.require('underscore');

//Helper functions
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

// TrialManager
// Performs trial related procecssing and client signalling
function TrialManager(appConnector) {
    this.appConnector = appConnector;
    this.targets = {}; // key: stimcode, val: target DOM id}
}

TrialManager.prototype.setControlSocket = function(socket) {
    this.controlSocket = socket;

    // Set Handlers
    this.controlSocket.on('controlStartTrial', _.bind(function () {
        console.log("Recieved controlStartTrial");
        this.startTrial();
    }, this));

    this.controlSocket.on('controlConfig', _.bind(function (config) {
        console.log("Recieved controlConfig");
        console.log(JSON.stringify(config));
        this.config = config;
        this.sendTrialConfig(config);
    }, this));
};

TrialManager.prototype.setSpellerSocket = function(socket) {
    this.spellerSocket = socket;

    // spellerConfig
    // Sent when
    this.spellerSocket.on('spellerTrialReady', _.bind(function (data) {
        console.log('Recieved spellerTrialReady ' + JSON.stringify(data));
        this.setTargets(data.targetIDs);
    }, this));

    this.spellerSocket.on('spellerTrialStart', _.bind(function () {
        console.log('Recieved spellerTrialStart');
        this.startTrial();
    }, this));
    
    this.spellerSocket.on('spellerFlashStart', _.bind(function (data) {
        // Send StimulusType
        if (data.attended) {
          this.appConnector.sendMessage('StimulusType', 1);
        } else {
          this.appConnector.sendMessage('StimulusType', 0);
        }
        // Set and Reset StimulusCode
        this.appConnector.sendMessage('StimulusCode', this.stimcodeForTarget(data.target_group));

        setTimeout(_.bind(function() {
          this.appConnector.sendMessage('StimulusCode', 0);
        }, this), 300);

    }, this));

    this.spellerSocket.on('spellerTrialEnd', _.bind(function (data) {
        console.log('Recieved spellerTrialEnd');
        this.spellerSocket.emit('serverClassifierResults', {results: this.appConnector.getClassifierResults()});
    }, this));
};

TrialManager.prototype.sendTrialConfig = function (config) {
    this.spellerSocket.emit('serverConfig', config);
};

TrialManager.prototype.getTargets = function() {
    return this.targets;
};

TrialManager.prototype.stimcodeForTarget = function(targetID) {
    var stimcodes = _.invert(this.targets);
    return stimcodes[targetID];
};

//
TrialManager.prototype.setTargets = function(targetIDs) {
    // clear targets
    this.targets = {};
    
    // generate stimulus codes and associate target ids
    for (var i=0; i<targetIDs.length; i++) {
      this.targets[i + 1] = targetIDs[i];
    }
};

TrialManager.prototype.buildSequence = function() {
    var seq = [];
    for (var i=0; i < this.config.repetitions; i++) {
        var res = shuffle(_.keys(this.targets));
        seq = seq.concat(res);
    }
    return seq;
};

TrialManager.prototype.startTrial = function() {
    if ((typeof(this.config) === undefined) || (_.size(this.config) === 0)) {
            console.log("Need to set config first!");
    } else {
        // generate flash sequences and signal client to begin flashing
        var seq = this.buildSequence();
        this.spellerSocket.emit('serverTrialStart', { sequence: seq });
    }
};

module.exports = function(appConnector) {
    return new TrialManager(appConnector);
};
