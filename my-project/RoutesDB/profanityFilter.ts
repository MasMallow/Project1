export class ProfanityFilter {
    private static profanityWords: Set<string> = new Set();

    public static async initialize(pool: any) {
        const result = await pool.query('SELECT word FROM profanity_words');
        result.rows.forEach((row: { word: string }) => {
            ProfanityFilter.profanityWords.add(row.word.toLowerCase());
        });
    }

    public static filterText(text: string): string {
        if (!text) return text;
        
        return text.split(' ').map(word => {
            return ProfanityFilter.profanityWords.has(word.toLowerCase()) 
                ? '***' 
                : word;
        }).join(' ');
    }

    public static async addWord(pool: any, word: string): Promise<void> {
        await pool.query(
            'INSERT INTO profanity_words (word) VALUES ($1) ON CONFLICT DO NOTHING',
            [word.toLowerCase()]
        );
        ProfanityFilter.profanityWords.add(word.toLowerCase());
    }

    public static async removeWord(pool: any, word: string): Promise<void> {
        await pool.query('DELETE FROM profanity_words WHERE word = $1', [word.toLowerCase()]);
        ProfanityFilter.profanityWords.delete(word.toLowerCase());
    }
}