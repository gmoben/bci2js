DOM.ready( function() {
    function P3Speller(socket_address, flash_length, isi, reps_per_trial) {
        this.socket_address = socket_address;
        this.flash_length = flash_length;
        this.isi = isi;
        this.reps_per_trial = reps_per_trial;

        this.socket = io.connect(socket_address);

        this.setEventHandlers();
        this.setSocketHandlers();
    }

    P3Speller.prototype.setEventHandlers = function() {

        var _this = this;

        // Trial Start Button
        Rye('#btn_trial_start').on('click', function() {
            var target_ids = _this.getTargetIDs();

            // Reset Colors
            Rye('.P3target').css('color', 'black');

            _this.socket.emit('Start Button', {
                target_ids: target_ids,
                flash_length: this.flash_length,
                isi: this.isi,
                reps_per_trial: this.reps_per_trial
            });
        });
    };

    P3Speller.prototype.setSocketHandlers = function() {

        var _this = this;

        _this.socket.on('Trial Start', function (data) {
            var seq = data.sequence;

            var trial_time = (_this.flash_length + _this.isi) * (seq.length + 1);

            var index = 0,
                bAttended = false;

            var flashInterval = setInterval(function() {
                console.log('index: ' + index);
                var target = Rye('html').find('#' + seq[index]),
                    bAttended = false;
                
                if (target.hasClass('attended'))
                    bAttended = true;

                target.css('color', 'blue');

                _this.socket.emit('Flash Start', {target_id: seq[index], index: index, attended: bAttended});
                
                setTimeout(function() {
                    target.css('color', 'black');
                }, _this.flash_length);

                index += 1;

            }, _this.flash_length + _this.isi);

            setTimeout(function () {
                clearInterval(flashInterval);
                setTimeout(function() { _this.socket.emit('Trial End'); }, _this.flash_length + _this.isi);
            }, trial_time);
            
        });

        _this.socket.on('Target Selection', function (data) {
            console.log("Selected target with id '" + data.target_id + "'");
            var target = Rye('html').find('#' + data.target_id);

            target.css('color', 'red');

            setTimeout(function () {target.css('color', 'black');}, 500);
            setTimeout(function () {target.css('color', 'red');}, 1000);
        });

    };

    P3Speller.prototype.getTargetIDs = function() {
        var t = [];
        Rye('html').find('.P3target').each(function (value, index, array) {
            t.push(value.id);
        });
        return t;
    };

    var speller = new P3Speller("127.0.0.1", 500, 100, 1);

});