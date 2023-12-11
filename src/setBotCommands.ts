import {  userConfig } from './main';
import { TRANSLATIONS } from './translation';
import { PARAMETERS } from './parameters';

export function setBotCommands(
    bot: { setMyCommands: (arg0: { command: string; description: string; }[]) => void; }) {
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
            description: TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
                'command-descriptions' 
            ].checkprice

        },
        {
            command: 'latestjobs',
            description: TRANSLATIONS[userConfig.language || PARAMETERS.LANGUAGE][
                'command-descriptions' 
            ].jobs,
        }
    ]);
}