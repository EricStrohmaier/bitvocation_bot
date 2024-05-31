"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBotCommands = void 0;
// import {  userConfig } from './main';
const translation_1 = require("./translation");
function setBotCommands(bot) {
    const language = "en";
    bot.setMyCommands([
        {
            command: "start",
            description: translation_1.TRANSLATIONS[language]["command-descriptions"].start,
        },
        {
            command: "jobs",
            description: translation_1.TRANSLATIONS[language]["command-descriptions"].jobs,
        },
        {
            command: "jobalert",
            description: translation_1.TRANSLATIONS[language]["command-descriptions"].jobalert,
        },
        {
            command: "value4value",
            description: translation_1.TRANSLATIONS[language]["command-descriptions"].donate,
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
            description: translation_1.TRANSLATIONS[language]["command-descriptions"].freeguide,
        },
    ]);
}
exports.setBotCommands = setBotCommands;
