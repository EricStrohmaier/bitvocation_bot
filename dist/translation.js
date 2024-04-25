"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSLATIONS = void 0;
const fs_1 = __importDefault(require("fs"));
exports.TRANSLATIONS = JSON.parse(fs_1.default.readFileSync('./translations.json').toString());
