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
            command: 'setjobalert',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].jobalert,
        },
        //     {
        //         command: 'language',
        //         description:
        //   TRANSLATIONS[language][
        //       'command-descriptions'
        //   ].language,
        //     },
        // {
        //     command: 'checkprice',
        //     description: TRANSLATIONS[language][
        //         'command-descriptions' 
        //     ].checkprice

        // },
        {
            command: 'value4value',
            description: TRANSLATIONS[language][
                'command-descriptions' 
            ].donate,
        },
    ]);
}