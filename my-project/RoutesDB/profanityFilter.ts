import pool from './db';

export class ProfanityFilter {
    private static profanityWords: Set<string> = new Set();

    // Check if text contains profanity
    public containsProfanity(text: string): boolean {
        const words = text.toLowerCase().split(/\s+/);
        return words.some(word => ProfanityFilter.profanityWords.has(word));
    }

    // Add a word to profanity list
    public static async addWord(word: string): Promise<void> {
        ProfanityFilter.profanityWords.add(word.toLowerCase());
    }

    // Remove a word from profanity list
    public static async removeWord(word: string): Promise<void> {
        ProfanityFilter.profanityWords.delete(word.toLowerCase());
    }

    // Get all profanity words
    public static getProfanityWords(): string[] {
        return Array.from(ProfanityFilter.profanityWords);
    }
}
