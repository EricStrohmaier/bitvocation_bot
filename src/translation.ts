import fs from "fs";
import path from "path";

export type Translations = {
  [key in "en" | "de" | string]: {
    general: {
      "language-switch": string;
      "start-message": string;
      donate: string;
      "btc-price": string;
      "latest-jobs": string;
      help: string;
      "query-keywords": string;
      categories: string;
      "job-alert": string;
    };
    "command-descriptions": {
      language: string;
      start: string;
      donate: string;
      checkprice: string;
      jobs: string;
      help: string;
      jobalert: string;
      categories: string;
      freeguide: string;
      privacy: string;
    };
    errors: {
      "generic-error": string;
      "image-safety": string;
      "no-parameter-command": string;
      "invalid-language": string;
    };
  };
};

export const TRANSLATIONS: Translations = JSON.parse(
  fs.readFileSync(path.join(__dirname, "translations.json"), "utf8")
);
