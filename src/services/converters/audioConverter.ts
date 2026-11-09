import type { MediaEditState } from '../../types';

// Convert AudioBuffer to WAV Blob
export function audioBufferToWav(buffer: AudioBuffer, startSec: number = 0, endSec?: number): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const actualStart = Math.max(0, Math.floor(startSec * sampleRate));
  const actualEnd = Math.min(
    buffer.length,
    endSec && endSec > startSec ? Math.floor(endSec * sampleRate) : buffer.length
  );
  const frameCount = Math.max(0, actualEnd - actualStart);

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // Write RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  // Write fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample

  // Write data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM samples
  const channelData: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = actualStart; i < actualEnd; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channelData[c][i];
      // Clamp to -1 to 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    audioCtx.close();
  }
}

export async function convertAudio(
  sourceBlob: Blob,
  targetExt: string,
  edits?: MediaEditState
): Promise<Blob> {
  const audioBuffer = await decodeAudioBlob(sourceBlob);

  const start = edits?.trimStart || 0;
  const end = edits?.trimEnd && edits.trimEnd > start ? edits.trimEnd : audioBuffer.duration;

  // Apply volume multiplier if not 100%
  if (edits?.volume !== undefined && edits.volume !== 100) {
    const vol = edits.volume / 100;
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        data[i] = data[i] * vol;
      }
    }
  }

  const normalizedTarget = targetExt.toLowerCase().replace('.', '');

  // WAV conversion (lossless standard)
  if (normalizedTarget === 'wav') {
    return audioBufferToWav(audioBuffer, start, end);
  }

  // If MP3, OGG, or WebM audio is requested:
  // We can either export standard WAV or encode to webm audio via MediaRecorder
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    if (edits?.playbackRate && edits.playbackRate !== 1) {
      sourceNode.playbackRate.value = edits.playbackRate;
    }

    const dest = ctx.createMediaStreamDestination();
    sourceNode.connect(dest);

    const mime = normalizedTarget === 'ogg' ? 'audio/ogg' : 'audio/webm';
    const recorder = new MediaRecorder(dest.stream);
    const chunks: Blob[] = [];

    const durationToPlay = (end - start) / (edits?.playbackRate || 1);

    const recordingPromise = new Promise<Blob>((resolve) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const resultBlob = new Blob(chunks, { type: mime });
        ctx.close();
        resolve(resultBlob);
      };
    });

    recorder.start(100);
    sourceNode.start(0, start, end - start);

    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, Math.min(durationToPlay * 1000 + 300, 30000)); // Cap at 30s realtime or fallback to wav

    return await recordingPromise;
  } catch {
    // Fallback cleanly to high-fidelity WAV
    return audioBufferToWav(audioBuffer, start, end);
  }
}
