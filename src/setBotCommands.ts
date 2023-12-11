import {  userConfig } from './main';
import { TRANSLATIONS } from './translation';
import { PARAMETERS } from './parameters';

// const token = process.env.TELEGRAM_BOT_API_KEY;
// const bot = new TelegramBot(token!, { polling: true });

export function setBotCommands(bot: 
    { setMyCommands: (arg0: { command: string; description: string; }[]) => void; }) {
    bot.setMyCommands([
        {
            command: 'start',
            description:
      TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
          'command-descriptions'
      ].start,
        },
        {
            command: 'imagine',
            description:
      TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
          'command-descriptions'
      ].imagine,
        },
        {
            command: 'reset',
            description:
      TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
          'command-descriptions'
      ].reset,
        },
        {
            command: 'language',
            description:
      TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
          'command-descriptions'
      ].language,
        },
        {
            command: 'donate',
            description: TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
                'command-descriptions' 
            ].donate,
        },
        {
            command: 'checkprice',
            description: 'Get the latest jobs from the job board',

        },
        {
            command: 'latestjobs',
            description: 'fish',
        // description: TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
        //     'command-descriptions' 
        // ],
        }
    ]);
}