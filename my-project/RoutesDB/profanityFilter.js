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
    static initialize(pool) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield pool.query('SELECT word FROM profanity_words');
            result.rows.forEach((row) => {
                ProfanityFilter.profanityWords.add(row.word.toLowerCase());
            });
        });
    }
    static filterText(text) {
        if (!text)
            return text;
        return text.split(' ').map(word => {
            return ProfanityFilter.profanityWords.has(word.toLowerCase())
                ? '***'
                : word;
        }).join(' ');
    }
    static addWord(pool, word) {
        return __awaiter(this, void 0, void 0, function* () {
            yield pool.query('INSERT INTO profanity_words (word) VALUES ($1) ON CONFLICT DO NOTHING', [word.toLowerCase()]);
            ProfanityFilter.profanityWords.add(word.toLowerCase());
        });
    }
    static removeWord(pool, word) {
        return __awaiter(this, void 0, void 0, function* () {
            yield pool.query('DELETE FROM profanity_words WHERE word = $1', [word.toLowerCase()]);
            ProfanityFilter.profanityWords.delete(word.toLowerCase());
        });
    }
}
exports.ProfanityFilter = ProfanityFilter;
ProfanityFilter.profanityWords = new Set();
