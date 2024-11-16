"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfanityFilter = void 0;
class ProfanityFilter {
    // Check if text contains profanity
    containsProfanity(text) {
        const words = text.toLowerCase().split(/\s+/);
        return words.some(word => ProfanityFilter.profanityWords.has(word));
    }
    // Add a word to profanity list
    static addWord(word) {
        return __awaiter(this, void 0, void 0, function* () {
            ProfanityFilter.profanityWords.add(word.toLowerCase());
        });
    }
    // Remove a word from profanity list
    static removeWord(word) {
        return __awaiter(this, void 0, void 0, function* () {
            ProfanityFilter.profanityWords.delete(word.toLowerCase());
        });
    }
    // Get all profanity words
    static getProfanityWords() {
        return Array.from(ProfanityFilter.profanityWords);
    }
}
exports.ProfanityFilter = ProfanityFilter;
ProfanityFilter.profanityWords = new Set();
