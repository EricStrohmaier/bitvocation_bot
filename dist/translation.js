import fs from 'fs';
export const TRANSLATIONS = JSON.parse(fs.readFileSync('./translations.json').toString());
