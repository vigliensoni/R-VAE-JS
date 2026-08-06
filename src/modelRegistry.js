import { MODELS_LS_DATA } from './constants.js';
import * as vae from './vae.js';
import { loadLatentSpace } from './visualization.js';

const MODEL_IDS = Object.keys(MODELS_LS_DATA);
const DEFAULT_MODEL_ID = MODEL_IDS.includes('trap') ? 'trap' : MODEL_IDS[0];

const modelState = {
  activeModelId: DEFAULT_MODEL_ID,
  pendingModelId: null,
  pendingPromise: null,
  modelLoadToken: 0,
};

export function getActiveModelId() {
  return modelState.activeModelId;
}

export function getModelIds() {
  return MODEL_IDS.slice();
}

export async function loadModelById(modelId) {
  const meta = MODELS_LS_DATA[modelId];
  if (!meta) throw new Error(`Unknown model id: ${modelId}`);
  if (!meta['model-url'] || !meta['space-url']) {
    throw new Error(`Model ${modelId} is missing URLs`);
  }

  if (modelId === modelState.activeModelId && !modelState.pendingModelId) {
    return Promise.resolve(modelId);
  }

  if (modelId === modelState.pendingModelId && modelState.pendingPromise) {
    return modelState.pendingPromise;
  }

  modelState.pendingModelId = modelId;
  modelState.modelLoadToken += 1;
  const requestToken = modelState.modelLoadToken;

  const loadPromise = Promise.all([
    vae.loadModel(meta['model-url']),
    loadLatentSpace(meta['space-url']),
  ]).then(() => {
    if (requestToken === modelState.modelLoadToken) {
      modelState.activeModelId = modelId;
      modelState.pendingModelId = null;
      modelState.pendingPromise = null;
    }
    return modelId;
  }).catch(err => {
    if (requestToken === modelState.modelLoadToken) {
      modelState.pendingModelId = null;
      modelState.pendingPromise = null;
    }
    throw err;
  });

  modelState.pendingPromise = loadPromise;
  return modelState.pendingPromise;
}

export const initialModelPromise = loadModelById(DEFAULT_MODEL_ID).catch(err => {
  console.error('Failed to load initial model', err);
});
