import manifest from './generated/identification.json';
import webHosting from './web-deploy.json';
export const identificationConfig = {
  ...manifest,
  tokenizer: '/models/tokenizer.json',
  tokenizerConfig: '/models/tokenizer_config.json',
  regionalRadius: 75,
  referenceVersion: 'refs-v1',
};

export const onlineIdentificationConfig = {
  provider: 'plantnet',
  endpoint: 'https://my-api.plantnet.org/v2/identify/all',
  group: 'plants',
  timeout: 12000,
  apiKey: import.meta.env.VITE_PLANTNET_API_KEY ?? '',
  // Native HTTP must also identify the authorized client when the shared key
  // has Pl@ntNet's browser-origin restrictions enabled.
  clientOrigin: webHosting.siteUrl,
};
