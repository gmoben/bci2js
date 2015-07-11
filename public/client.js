DOM.ready( function() {
    var socket = io.connect('http://127.0.0.1');

    //TODO: Make these into GUI options
    var FLASH_LENGTH = 500,
        ISI = 100, // inter-stimuli interval
        REPS_PER_TRIAL = 1; // rounds of flashes

    function get_target_ids() {
        var t = [];
        Rye('html').find('.P3target').each(function (value, index, array) {
            t.push(value.id);
        });
        return t;
    }

    Rye('#btn_trial_start').on('click', function() {
        target_ids = get_target_ids();

        // Reset Colors
        Rye('.P3target').css('color', 'black');

        socket.emit('Start Button', {
            target_ids: target_ids,
            flash_length: FLASH_LENGTH,
            isi: ISI,
            reps_per_trial: REPS_PER_TRIAL
        });
    });

    socket.on('AppConnectorRecv connected', function (data) {
        console.log("Connected to BCI2000");

    });


    socket.on('Trial Start', function (data) {
        var seq = data.sequence;

        var trial_time = (FLASH_LENGTH + ISI) * (seq.length + 1);

        var index = 0;

        var flashInterval = setInterval(function() {
            console.log('index: ' + index);
            var target = Rye('html').find('#' + seq[index]),
                bAttended = false;
            
            if (target.hasClass('attended'))
                bAttended = true;

            target.css('color', 'blue');

            socket.emit('Flash Start', {target_id: seq[index], index: index, attended: bAttended});
            
            setTimeout(function() {
                target.css('color', 'black');
            }, FLASH_LENGTH);

            index += 1;

        }, FLASH_LENGTH + ISI);

        setTimeout(function () {
            clearInterval(flashInterval);
            setTimeout(function() { socket.emit('Trial End'); }, FLASH_LENGTH + ISI);
        }, trial_time);
        
    });

    socket.on('Target Selection', function (data) {
        console.log("Selected target with id '" + data.target_id + "'");
        var target = Rye('html').find('#' + data.target_id);

        target.css('color', 'red');

        setTimeout(function () {target.css('color', 'black');}, 500);
        setTimeout(function () {target.css('color', 'red');}, 1000);
    })
});

