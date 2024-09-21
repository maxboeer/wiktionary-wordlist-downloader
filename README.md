# wiktionary-wordlist-downloader
Allows you to download all words in the wiktionary of a specified language, including their part of speech and meanings, parsed to a practical JSON file.

## Usage
Run [main.js](main.js) using nodejs. Use the -h flag to see the documentation.

`node main.js -h`

### building executable
If you would like to build the executable yourself, under windows you can run
`.\build.ps1`
inside the root directory. A `wiktionary-downloader.exe` will be generated at `.\build`.

## Supported languages
Currently, the supported languages include:
* de

Please feel free to contribute to this project, by forking it and adding parsing for currently unsupported languages inside the [regex_manager.js](regex_manager.js).