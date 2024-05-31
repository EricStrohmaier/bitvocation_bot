"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callUrl = void 0;
const axios_1 = __importDefault(require("axios"));
async function callUrl() {
    try {
        const bitvocationResponse = await axios_1.default.get("https://bitvocation-bot-2-2.onrender.com/health");
        console.log("URL called successfully bitvocation_bot:");
    }
    catch (error) {
        console.error("Error calling URL:", error);
    }
}
exports.callUrl = callUrl;
