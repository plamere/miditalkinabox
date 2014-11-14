var LP_NOP = -1;
var LP_OFF = 0;
var LP_RED = 3;
var LP_DIM_RED = 1;
var LP_GREEN = 3 << 4;
var LP_DIM_GREEN = 1 << 4;
var LP_DIM_AMBER = LP_DIM_GREEN | LP_DIM_RED;
var LP_AMBER = LP_GREEN | LP_RED;

var positionsPerRow = 0x10;

function initMidi(inputMessageHandler, callback) {
    var output = null; 

    function connectMessageHandler(midi) {
        var inputs=midi.inputs.values();
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
            console.log('connect input', input);
            input.value.onmidimessage = inputMessageHandler;
        }
    }

    function prepOutputHandler(midi) {
        console.log('prep', midi.outputs);
        var outputs = midi.outputs.values();
        for (var out = outputs.next(); out && !out.done; out = outputs.next()) {
            output = out.value;
        }
        console.log('output', output);
    }

    function sendMessage(cmd, note, vel) {
        output.send([cmd, note, vel]);
    }

    function showText(color, text) {
        var msg = [ 0xf0, 0, 0x20, 0x29, 0x9, color ];

        for (i in text) {
            var c = text[i];
            var v = c.charCodeAt(0);
            if (v < 128) {
                msg.push(v);
            }
        }
        msg.push(0xf7);
        output.send(msg);
    }

    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({sysex:true}).then( 
            function(midi) {
                connectMessageHandler(midi);
                prepOutputHandler(midi);

                var midiInterface = {
                    send: sendMessage,
                    text: showText
                }

                callback(true, midiInterface);
            }, 
            function() {}
        );
    } else {
        callback(false, 'No MIDI support present in your browser');
    }
}

// see spec at
// http://d19ulaff0trnck.cloudfront.net/sites/default/files/novation/downloads/4700/launchpad-s-prm.pdf

function resetLaunchpad(midi) {
    midi.send(0xb0, 0x0, 0x7d); // lights to amber
    midi.send(0xb0, 0x0, 0x01); // grid button layout
}

function setColor(midi, note, color) {
    if (color != LP_NOP) {
        midi.send(0x90, note, color); // lights to amber
    }
}

function rcSetColor(midi, row, col, color) {
    var note = rcToNote(row, col);
    setColor(midi, note, color);
}

function rcToNote(row, col) {
    var note = row * positionsPerRow + col;
    return note;
}

function isOnGrid(note) {
   var row = note / positionsPerRow;
   var col = note % positionsPerRow;

   return (row >= 0 && row < 8 && col >= 0 && col < 8);
}

function showStartupPattern(midi) {
    var notesPerRow = 0x8;
    for (var i = 0; i < notesPerRow; i++) {
        rcSetColor(midi, i, i, LP_RED);
        rcSetColor(midi, i, (notesPerRow - 1) - i, LP_GREEN);
    }
}

function setNumberedLight(midi, num, color) {
    var base = 0x68;
    if (color != LP_NOP) {
        midi.send(0xb0, base + num, color);
    }
}

function noteToTopCol(note) {
    var base = 0x68;
    return note - base;
}

function clearAllLights(midi, val) {
    var notesPerRow = 0x8;
    for (var i = 0; i < notesPerRow; i++) {
        for (var j = 0; j <= notesPerRow; j++) {
            rcSetColor(midi, i, j, LP_OFF);
        }
    }

    for (var i = 0; i < notesPerRow; i++) {
        setNumberedLight(midi, i, LP_OFF);
    }
}

function testPattern(midi) {
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
            rcSetColor(midi, i,j, i, j);
        }
    }
}

