const {dirname, isAbsolute} = require('path');
const axios = require('axios');
const fs = require('fs');
const unbzip2Stream = require('unbzip2-stream');
const sax = require('sax');
const zlib = require('zlib');
const commandLineArgs = require('command-line-args')
const commandLineUsage = require("command-line-usage");
const regexManager = require('./regex_manager');
let regexes;

const optionDefinitions = [
    {
        name: 'language',
        alias: 'l',
        type: String,
        defaultOption: true,
        description: 'The language to download the wordlist in.\n Currently supported: [ de ]',
    },
    {
        name: 'output',
        alias: 'o',
        type: String,
        description: 'Desired output file path.'
    },
    {
        name: 'help',
        alias: 'h',
        type: Boolean,
        description: 'Print this usage guide.'
    }
]

const sections = [
    {
        header: 'Wiktionary JSON wordlist downloader',
        content: 'Generate a complete JSON wordlist including meanings and part of speech for multiple languages from the according wiktionary'
    },
    {
        header: 'Options',
        optionList: optionDefinitions
    }
]
const usage = commandLineUsage(sections)
const options = commandLineArgs(optionDefinitions)


//main part
if (options.help || !options.language  || (options.language !== 'de')) {
    console.log(usage);
}else{
    regexes = regexManager.getRegexes(options.language);
    let outputPath = options.output ? (isAbsolute(options.output) ? options.output : (__dirname + "/" + options.output)) : `${__dirname}/out/wordlist_${options.language}.json`;
    let outputFolder = dirname(outputPath);
    try {
        if (!fs.existsSync(outputFolder))
            fs.mkdirSync(outputFolder);
    } catch (e) {
        console.error(`Cannot create Folder at '${outputFolder}': `, e);
    }

    downloadAndParseDump(options.language, outputPath);
}


//function to clean up the markup
function cleanMarkup(text) {
    // Remove templates (everything in {{ ... }})
    text = text.replace(/\{\{[^}]+\}\}/g, '');
    // Replace links in the form [[Text|DisplayedText]] -> DisplayedText
    text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2');
    // Replace simple links in the form [[Text]] -> Text
    text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
    // Remove bold formatting in the form '''Text''' -> Text
    text = text.replace(/'''([^']+)'''/g, '$1');
    // Remove italic formatting in the form ''Text'' -> Text
    text = text.replace(/''([^']+)''/g, '$1');
    // Reformat lists, e.g.: :[1] -> 1:
    text = text.replace(/^:\[([\d]+)\]/gm, "$1:");  // gm: multi-line support for start of line `^`
    // Remove duplicate blank lines
    text = text.replace(/\n\n/g, '\n');
    // Trim the beginning and end of the text
    text = text.trim();
    // Remove references: <ref ...>...</ref>
    text = text.replace(/<ref[^>]*>.*?<\/ref>/g, '');

    return text;
}


// Main function: download and parse
async function downloadAndParseDump(language, outputFile) {
    const totalWordCount = 135000;//await getWiktionaryWordCount(language);
    let wordCount = 0;
    let lastLoggingTime = Date.now();
    const dumpUrl = `https://dumps.wikimedia.org/${language}wiktionary/latest/${language}wiktionary-latest-pages-articles.xml.bz2`;

    try {
        // open JSON file to write data stream
        const outputStream = fs.createWriteStream(outputFile);
        outputStream.write('[\n');

        // download dump from wiktionary
        const response = await axios({
            method: 'get',
            url: dumpUrl,
            responseType: 'stream'
        });

        console.log('Download gestartet...');

        // unpack stream
        const xmlStream = response.data.pipe(unbzip2Stream());

        // initialize SAX-Parser
        const parser = sax.createStream(true, { trim: true });

        let currentTag = null;
        let currentPageTitle = '';
        let currentPageText = '';
        let isFirstEntry = true;

        parser.on('opentag', (node) => {
            currentTag = node.name;
        });

        parser.on('text', (text) => {
            if (currentTag === 'title') {
                currentPageTitle = text;
            }
            if (currentTag === 'text') {
                currentPageText += text;
            }
        });

        parser.on('closetag', (name) => {
            if (name === 'page') {
                const parsedEntry = parseWiktionaryEntry(currentPageTitle, currentPageText);

                if (parsedEntry) {
                    if (!isFirstEntry) {
                        outputStream.write(',\n');
                    }
                    isFirstEntry = false;

                    // Write to JSON file
                    outputStream.write(JSON.stringify(parsedEntry, null, 2));

                    ++wordCount;
                    if ((Date.now() - lastLoggingTime) > 1000){
                        let progress = (parseFloat(wordCount) / totalWordCount * 100);
                        if (progress < 100)
                            console.log(`Downloading wordlist_${language}: ${(progress).toFixed(2)}%`);
                        lastLoggingTime = Date.now();
                    }
                }


                // Reset for next page
                currentPageTitle = '';
                currentPageText = '';
            }
        });

        parser.on('end', () => {
            console.log(`Downloading wordlist_${language}: 100%`);
            outputStream.write('\n]');
            outputStream.end();
            console.log(`Successfully processed wordlist_${language}.json`);
        });

        // Start parsing
        xmlStream.pipe(parser);

    } catch (error) {
        console.error('Error while downloading or parsing:', error);
    }
}

// function to extract word, part_of_speech, and meanings
function parseWiktionaryEntry(title, text) {
    // search for word articles
    const match = regexes.article.exec(text);
    if (!match) return null;

    // extract parts of speech
    const posCandidates = [match[2]].filter(Boolean);
    const partsOfSpeech = posCandidates.map(pos => {
        const posMatch = regexes.pos.exec(pos);
        return posMatch ? posMatch[1] : null;
    }).filter(Boolean);

    // filter for desired parts of speech
    const filteredPartsOfSpeech = partsOfSpeech.filter(pos => regexes.pos_filter[pos]);

    if (filteredPartsOfSpeech.length === 0) {
        return null;  // Skip undesired words
    }

    // extract meanings
    const meaningMatch = regexes.meaning.exec(text);
    let meanings = [];
    if (meaningMatch) {
        meanings = meaningMatch[1].split('\n').map(cleanMarkup).filter(Boolean);
    }

    return {
        word: title,
        part_of_speech: regexes.pos_filter[filteredPartsOfSpeech[0]],
        meanings: meanings
    };
}

//wrong! using all articles
async function getWiktionaryWordCount(languageCode) {
    try {
        // URL der MediaWiki API für die entsprechende Sprachversion von Wiktionary
        const url = `https://${languageCode}.wiktionary.org/w/api.php?action=query&meta=siteinfo&siprop=statistics&format=json`;

        const response = await axios.get(url);

        // Extrahiere die Anzahl der Artikel aus der API-Antwort
        const count = response.data.query.statistics.articles;

        return count;
    } catch (error) {
        console.error(`Fehler beim Abrufen der Daten für ${languageCode}: ${error}`);
    }
}
