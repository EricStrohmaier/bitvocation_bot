// import {  userConfig } from './main';
import { TRANSLATIONS } from './translation';
import { PARAMETERS } from './parameters';

export function setBotCommands(
    bot: { setMyCommands: (arg0: { command: string; description: string; }[]) => void; },
    // chatId?: string
) {
    // const userConfigs = getUserConfigs();
    // const language = userConfigs[chatId || '']?.language|| PARAMETERS.LANGUAGE;    
    const language = PARAMETERS.LANGUAGE;    
    bot.setMyCommands([
        {
            command: 'start',
            description:
      TRANSLATIONS[language][
          'command-descriptions'
      ].start,
        },
        {
            command: 'jobs',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].jobs,
        },
        {
            command: 'jobalert',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].jobalert,
        },
        {
            command: 'value4value',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].donate,
        },
        // {
        //     command: 'privacy',
        //     description:
        //   TRANSLATIONS[language][
        //       'command-descriptions'
        //   ].privacy,
        // },
        {
            command: 'freeguide',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].freeguide,

        },
    ]);
}