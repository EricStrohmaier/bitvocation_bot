// import {  userConfig } from './main';
import { TRANSLATIONS } from "./translation";

export function setBotCommands(bot: {
  setMyCommands: (arg0: { command: string; description: string }[]) => void;
}) {
  const language = "en";
  bot.setMyCommands([
    {
      command: "start",
      description: TRANSLATIONS[language]["command-descriptions"].start,
    },
    {
      command: "jobs",
      description: TRANSLATIONS[language]["command-descriptions"].jobs,
    },
    {
      command: "jobalert",
      description: TRANSLATIONS[language]["command-descriptions"].jobalert,
    },
    {
      command: "value4value",
      description: TRANSLATIONS[language]["command-descriptions"].donate,
    },
    // {
    //     command: 'privacy',
    //     description:
    //   TRANSLATIONS[language][
    //       'command-descriptions'
    //   ].privacy,
    // },
    {
      command: "freeguide",
      description: TRANSLATIONS[language]["command-descriptions"].freeguide,
    },
  ]);
}
