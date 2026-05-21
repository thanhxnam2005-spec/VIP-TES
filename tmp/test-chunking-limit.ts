import { chunkText } from "../lib/text-utils";

function test() {
    const line = "一二三".repeat(200); // 600 characters per line
    const text = `${line}\n${line}\n${line}\n${line}`; // 4 lines, total ~2400 chars

    console.log(`Input text length (characters): ${text.length}`);
    const chunks = chunkText(text, 1200);
    console.log(`Number of chunks generated: ${chunks.length}`);
    chunks.forEach((chunk, i) => {
        console.log(`Chunk ${i}: length = ${chunk.length} characters`);
    });

    // Verify that chunks are correct
    if (chunks.length >= 2) {
        const allWithinLimit = chunks.every(c => c.length <= 1800); // Max margin since we don't break lines
        if (allWithinLimit) {
            console.log("SUCCESS: Chunking works with the new chunk size!");
            return;
        }
    }
    console.error("FAILURE: Unexpected chunk sizes or counts!");
    process.exit(1);
}

test();
