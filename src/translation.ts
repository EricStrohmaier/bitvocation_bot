import fs from 'fs';

export const TRANSLATIONS: {
    [key: 'en' | 'de' | string]: {
      general: {
        'language-switch': string;
        'start-message': string;
        'donate': string;
        'btc-price': string;
        'latest-jobs': string;
        'help': string;
        'query-keywords': string;
        'categories': string;
        'job-alert': string;
      };
      'command-descriptions': {
        language: string;
        start: string;
        donate: string;
        checkprice: string;
        jobs: string;
        help: string;
        jobalert: string
        categories: string;
      };
      errors: {
        'generic-error': string;
        'image-safety': string;
        'no-parameter-command': string;
        'invalid-language': string;
      };
    };
  } = JSON.parse(fs.readFileSync('./translations.json').toString());
  
  