

const DRUM_CLASSES = [
  'Kick',
  'Snare',
  'Hi-hat closed',
  'Hi-hat open',
  'Tom low',
  'Tom mid',
  'Tom high',
  'Clap',
  'Rim'
]

const MIDI_DRUM_MAP = {
  36: 0,
  35: 0,
  38: 1,
  27: 1,
  28: 1,
  31: 1,
  32: 1,
  33: 1,
  34: 1,
  37: 1,
  39: 1,
  40: 1,
  56: 1,
  65: 1,
  66: 1,
  75: 1,
  85: 1,
  42: 2,
  44: 2,
  54: 2,
  68: 2,
  69: 2,
  70: 2,
  71: 2,
  73: 2,
  78: 2,
  80: 2,
  46: 3,
  67: 3,
  72: 3,
  74: 3,
  79: 3,
  81: 3,
  45: 4,
  29: 4,
  41: 4,
  61: 4,
  64: 4,
  84: 4,
  48: 5,
  47: 5,
  60: 5,
  63: 5,
  77: 5,
  86: 5,
  87: 5,
  50: 6,
  30: 6,
  43: 6,
  62: 6,
  76: 6,
  83: 6,
  49: 7,
  55: 7,
  57: 7,
  58: 7,
  51: 8,
  52: 8,
  53: 8,
  59: 8,
  82: 8
}

const MODELS_LS_DATA = {
  'footwork': {
    "name": "footwork",
    "model-url": "https://raw.githubusercontent.com/vigliensoni/R-VAE-models/master/footwork-model/model.json", 
    "space-url": "https://raw.githubusercontent.com/vigliensoni/R-VAE-models/master/footwork-model/model-matrix-LS.data"
  },
  'trap': {
    "name": "trap",
    "model-url": "https://raw.githubusercontent.com/vigliensoni/R-VAE-models/master/trap_all_files.model/model.json", 
    "space-url": "https://raw.githubusercontent.com/vigliensoni/R-VAE-models/master/trap_all_files.model/model-matrix-LS.data"
  },
  '2-clips-12-epochs': {
    "name": "2-clips-12-epochs",
    "model-url": "data/02-clips-12-epochs/model.json", 
    "space-url": "data/02-clips-12-epochs/02-clips-12-epochs-matrix-LS.data"
  },
  '2-clips-150-epochs': {
    "name": "2-clips-150-epochs",
    "model-url": "data/02-clips-150-epochs/model.json", 
    "space-url": "data/02-clips-150-epochs/02-clips-150-epochs-matrix-LS.data"
  },
  '2-clips-1000-epochs': {
    "name": "2-clips-1000-epochs",
    "model-url": "data/02-clips-1000-epochs/model.json", 
    "space-url": "data/02-clips-1000-epochs/02-clips-1000-epochs-matrix-LS.data"
  },
}

const NUM_DRUM_CLASSES = DRUM_CLASSES.length;
const LOOP_DURATION = 96; // 2bars x 16th note

const MIN_ONSETS_THRESHOLD = 5; // ignore loops with onsets less than this num

const ORIGINAL_DIM = NUM_DRUM_CLASSES * LOOP_DURATION;


const ROWS = 30
const COLS = 30
const INST_SIDE = Math.sqrt(NUM_DRUM_CLASSES) // 3 - SIDE OF THE INSTRUMENT CUBE
const Px = 4 // Number of pixels per point in the space


exports.ROWS = ROWS;
exports.COLS = COLS;
exports.INST_SIDE = INST_SIDE;
exports.Px = Px;



exports.MIDI_DRUM_MAP = MIDI_DRUM_MAP;
exports.DRUM_CLASSES = DRUM_CLASSES;

exports.NUM_DRUM_CLASSES = NUM_DRUM_CLASSES;
exports.LOOP_DURATION = LOOP_DURATION;
exports.ORIGINAL_DIM = ORIGINAL_DIM;
exports.MIN_ONSETS_THRESHOLD = MIN_ONSETS_THRESHOLD;

exports.MODELS_LS_DATA = MODELS_LS_DATA