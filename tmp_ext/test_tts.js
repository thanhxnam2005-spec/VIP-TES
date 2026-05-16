const fs = require('fs');

async function run() {
    try {
        const text = fs.readFileSync('tmp_ext/tts_online_app.js', 'utf8');
        const apiMatches = text.match(/"\/api\/[^"]+"/g);
        console.log("API paths:", [...new Set(apiMatches)]);

        const fetchMatches = text.match(/fetch\([a-zA-Z0-9_$.]+,/g);
        console.log("Fetch calls:", fetchMatches ? fetchMatches.slice(0, 10) : "None");

        // Let's also search for anything containing "tts"
        const ttsMatches = text.match(/"[^"]*tts[^"]*"/ig);
        console.log("TTS related strings:", ttsMatches ? [...new Set(ttsMatches)].slice(0, 20) : "None");
    } catch (e) {
        console.error(e);
    }
}
run();
