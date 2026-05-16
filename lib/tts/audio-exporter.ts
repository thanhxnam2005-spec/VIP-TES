/**
 * Utility to decode and concatenate multiple audio blobs (from TTS providers)
 * and export them as a single continuous WAV file.
 */

async function decodeAudioBlob(blob: Blob, audioCtx: AudioContext): Promise<AudioBuffer> {
    const arrayBuffer = await blob.arrayBuffer();
    return new Promise((resolve, reject) => {
        audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let result;
    if (numChannels === 2) {
        result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
    } else {
        result = buffer.getChannelData(0);
    }

    return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);

    let index = 0;
    let inputIndex = 0;

    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
}

function encodeWAV(samples: Float32Array, format: number, sampleRate: number, numChannels: number, bitDepth: number): Blob {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * bytesPerSample, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * blockAlign, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * bytesPerSample, true);

    floatTo16BitPCM(view, 44, samples);

    return new Blob([buffer], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/** Combine multiple audio buffers into a single one */
function combineAudioBuffers(buffers: AudioBuffer[], audioCtx: AudioContext): AudioBuffer {
    // Use the highest sample rate among the buffers, usually they should be the same
    const sampleRate = buffers[0]?.sampleRate || audioCtx.sampleRate;
    const numChannels = buffers[0]?.numberOfChannels || 1;

    let totalLength = 0;
    buffers.forEach(b => totalLength += b.length);

    const combined = audioCtx.createBuffer(numChannels, totalLength, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const combinedChannelData = combined.getChannelData(channel);
        let offset = 0;
        buffers.forEach(b => {
            // If a buffer lacks this channel, just fill with 0s
            if (channel < b.numberOfChannels) {
                combinedChannelData.set(b.getChannelData(channel), offset);
            }
            offset += b.length;
        });
    }

    return combined;
}

export async function concatenateAndExportAudio(
    blobs: Blob[],
    onProgress?: (step: string, progress: number) => void
): Promise<Blob> {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();

    try {
        const buffers: AudioBuffer[] = [];

        // Decode sequentially or in parallel? Parallel might consume too much memory if large chapter.
        // Let's do sequential to avoid out of memory.
        for (let i = 0; i < blobs.length; i++) {
            if (onProgress) {
                onProgress("Đang giải mã", Math.round(((i + 1) / blobs.length) * 100));
            }

            const buffer = await decodeAudioBlob(blobs[i], audioCtx);
            buffers.push(buffer);
        }

        if (buffers.length === 0) {
            throw new Error("No audio data to export.");
        }

        if (onProgress) onProgress("Đang lưu...", 100);

        const combinedBuffer = combineAudioBuffers(buffers, audioCtx);
        const finalWavBlob = audioBufferToWav(combinedBuffer);

        return finalWavBlob;
    } finally {
        audioCtx.close().catch(() => { });
    }
}
