import * as Tone from "tone";


//create a synth and connect it to the master output (your speakers)
var synth = new Tone.Synth().toMaster();

//play a middle 'C' for the duration of an 4th note
// synth.triggerAttackRelease('C5', '8n');
synth.triggerAttackRelease('C4', '4n');


var keys = new Tone.Players({
    "A" : "https://raw.githubusercontent.com/Tonejs/Tone.js/master/examples/audio/casio/A2.[mp3|ogg]",
    "C#" : "https://raw.githubusercontent.com/Tonejs/Tone.js/master/examples/audio/casio/Cs2.[mp3|ogg]",
    "E" : "https://raw.githubusercontent.com/Tonejs/Tone.js/master/examples/audio/casio/E2.[mp3|ogg]",
    "F#" : "https://raw.githubusercontent.com/Tonejs/Tone.js/master/examples/audio/casio/Fs2.[mp3|ogg]",
}, {
    "volume" : -10,
    "fadeOut" : "64n",
}).toMaster();

//the notes
var noteNames = ["F#", "E", "C#", "A"];

var loop = new Tone.Sequence(function(time, col){
    var column = document.querySelector("tone-step-sequencer").currentColumn;
    column.forEach(function(val, i){
        if (val){
            //slightly randomized velocities
            var vel = Math.random() * 0.5 + 0.5;
            keys.get(noteNames[i]).start(time, 0, "32n", 0, vel);
        }
    });
    //set the columne on the correct draw frame
    Tone.Draw.schedule(function(){
        document.querySelector("tone-step-sequencer").setAttribute("highlight", col);
    }, time);
}, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n").start(0);

//bind the interface
document.querySelector("tone-transport").bind(Tone.Transport);

Tone.Transport.on("stop", () => {
    setTimeout(() => {
        document.querySelector("tone-step-sequencer").setAttribute("highlight", "-1");
    }, 100);
});
