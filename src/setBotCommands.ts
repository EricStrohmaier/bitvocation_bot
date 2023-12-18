// import {  userConfig } from './main';
import { TRANSLATIONS } from './translation';
import { PARAMETERS } from './parameters';
import { getUserConfigs } from './functions';

export function setBotCommands(
    bot: { setMyCommands: (arg0: { command: string; description: string; }[]) => void; },
    chatId?: string) {
    const userConfigs = getUserConfigs();
    const language = userConfigs[chatId || '']?.language || PARAMETERS.LANGUAGE;    
    bot.setMyCommands([
        {
            command: 'start',
            description:
      TRANSLATIONS[language][
          'command-descriptions'
      ].start,
        },
        {   command: 'help',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].help,
        },
        {
            command: 'latestjobs',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].jobs,
        },
        {
            command: 'language',
            description:
      TRANSLATIONS[language][
          'command-descriptions'
      ].language,
        },
        {
            command: 'checkprice',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].checkprice

        },
        {
            command: 'donate',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].donate,
        },
    ]);
}