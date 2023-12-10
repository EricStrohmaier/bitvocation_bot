import { Configuration, OpenAIApi } from 'openai';
import { userConfig } from './main';
import fs from 'fs';

const openai = new OpenAIApi(
    new Configuration({ apiKey: process.env.OPENAI_API_KEY })
);

/** A simple async sleep function.
 * @example
 * await sleep(2000);
 * console.log('Two seconds have passed.');
 */
export function sleep(time: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, time));
}
// /** Escapes a string for it to be used in a markdown message.
//  * @param {string} input - The input message.
//  * @returns {string} The escaped message.
//  */
// function escapeForMarkdown(input: string): string {
//     return input.replace('_', '\\_')
//         .replace('*', '\\*')
//         .replace('[', '\\[')
//         .replace('`', '\\`')
//         .replace('.', '\\.');
// }
/** Removes the name of the command from the command's message.
 * @param {string} input - The raw message.
 * @returns {string} The message without the `/command`.
 */
export function removeCommandNameFromCommand(input: string): string {
    const ar = input.split(' ');
    ar.shift();
    return ar.join(' ');
}
let lastMessage = '';

/**
 * Switches bot's language for a specific user.
 * @param {'en' | 'de' | string} language - The language the bot will now speak.
 */
export function switchLanguage(language: 'en' | 'de' | string) {
    userConfig.language = language;
    fs.writeFileSync('user-config.json', JSON.stringify(userConfig), 'utf8');
}

/** Resets the bot's memory about previous messages. */
export function resetBotMemory() {
    lastMessage = '';
}
/** Generates a picture using DALL·E 2.
 * @param {string} input - The prompt for the picture.
 * @returns {Promise<string>} The URL of the generated image.
 */
export async function generatePicture(input: string): Promise<string> {
    return new Promise((resolve, reject) => {
        openai
            .createImage({
                prompt: input,
                response_format: 'url',
            })
            .then((data) => {
                resolve(data.data.data[0].url || '');
            })
            .catch((e) => reject(e));
    });
}