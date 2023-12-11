import fs from 'fs';

export const TRANSLATIONS: {
    [key: 'en' | 'de' | string]: {
      general: {
        'default-start': string;
        'default-personality': string;
        'memory-reset': string;
        'language-switch': string;
        'start-message': string;
        'donate': string;
        'btc-price': string;
        'latest-jobs': string;
      };
      'command-descriptions': {
        reset: string;
        imagine: string;
        language: string;
        start: string;
        donate: string;
        checkprice: string;
        jobs: string;
      };
      errors: {
        'generic-error': string;
        'image-safety': string;
        'no-parameter-command': string;
        'invalid-language': string;
      };
    };
  } = JSON.parse(fs.readFileSync('./translations.json').toString());
  
  