// Manages the regexes used to parse articles
class RegexManager {
    static #regexes = {
        'de': {
            article: /== ([a-zA-ZäöüßÄÖÜẞ]+) \(\{\{Sprache\|Deutsch\}\}\) ==\n=== (\{\{([^}]+)\}\}[, ]{0,2})/,
            pos_filter: {
                "Substantiv": 'noun',
                "Adjektiv": 'adjective',
                "Verb": 'verb',
                "Adverb": 'adverb',
            },
            meaning: /{{Bedeutungen}}\n(.*?)(?=\n\n|\n{{Sprache|$)/s,
            pos: /Wortart\|([^|]+)\|Deutsch/
        },
        'en': {

        }
    };

    static getRegexes(language) {
        return this.#regexes[language] || null;
    }
}

module.exports = RegexManager;
