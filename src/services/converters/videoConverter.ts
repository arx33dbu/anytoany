import type { MediaEditState } from '../../types';
import { audioBufferToWav, decodeAudioBlob } from './audioConverter';

export function loadVideoElement(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(blob);
    video.src = url;

    video.onloadedmetadata = () => {
      resolve(video);
    };
    video.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video element: ' + e));
    };
  });
}

// Extract a still snapshot frame from video at specified time
export async function captureVideoFrame(
  videoBlob: Blob,
  timeSec: number = 0,
  targetFormat: 'png' | 'jpg' | 'webp' = 'png'
): Promise<Blob> {
  const video = await loadVideoElement(videoBlob);
  video.currentTime = Math.min(Math.max(0, timeSec), video.duration || 1);

  await new Promise((resolve) => {
    video.onseeked = resolve;
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const mime = targetFormat === 'jpg' ? 'image/jpeg' : targetFormat === 'webp' ? 'image/webp' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create frame blob'));
    }, mime, 0.92);
  });
}

// Extract audio track from video
export async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  try {
    const audioBuffer = await decodeAudioBlob(videoBlob);
    return audioBufferToWav(audioBuffer);
  } catch (err) {
    throw new Error('Unable to extract audio track from this video file. It may have no audio or an unsupported codec.');
  }
}

// Convert video to GIF / WebM / Frame / Audio
export async function convertVideo(
  sourceBlob: Blob,
  targetExt: string,
  edits?: MediaEditState,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const normalizedTarget = targetExt.toLowerCase().replace('.', '');

  // 1. Audio extraction
  if (['mp3', 'wav', 'ogg'].includes(normalizedTarget)) {
    onProgress?.(50);
    const audioBlob = await extractAudioFromVideo(sourceBlob);
    onProgress?.(100);
    return audioBlob;
  }

  // 2. Still image extraction
  if (['png', 'jpg', 'jpeg', 'webp'].includes(normalizedTarget)) {
    onProgress?.(50);
    const fmt = normalizedTarget === 'jpg' || normalizedTarget === 'jpeg' ? 'jpg' : normalizedTarget === 'webp' ? 'webp' : 'png';
    const frameBlob = await captureVideoFrame(sourceBlob, edits?.trimStart || 0, fmt);
    onProgress?.(100);
    return frameBlob;
  }

  // 3. Video clip / GIF generation
  const video = await loadVideoElement(sourceBlob);
  const start = edits?.trimStart || 0;
  const end = edits?.trimEnd && edits.trimEnd > start ? edits.trimEnd : Math.min(video.duration, 15);
  const duration = end - start;

  if (normalizedTarget === 'gif') {
    // Render animated GIF or high quality animated sequence
    // We capture frames into a canvas
    const fps = 10;
    const totalFrames = Math.max(1, Math.min(Math.floor(duration * fps), 60)); // cap at 60 frames for performance
    const interval = duration / totalFrames;

    const canvas = document.createElement('canvas');
    // Scale down for GIF efficiency
    const scale = Math.min(1, 480 / (video.videoWidth || 640));
    canvas.width = Math.floor((video.videoWidth || 640) * scale);
    canvas.height = Math.floor((video.videoHeight || 480) * scale);
    const ctx = canvas.getContext('2d');

    const frames: ImageData[] = [];
    for (let i = 0; i < totalFrames; i++) {
      video.currentTime = start + i * interval;
      await new Promise((r) => { video.onseeked = r; });
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (ctx) {
        frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      }
      onProgress?.(Math.round(((i + 1) / totalFrames) * 85));
    }

    // Convert frames into an animated WebM or GIF container
    // Fallback or animated webm blob
    const captureStream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(captureStream, { mimeType: 'video/webm' });
    const chunks: Blob[] = [];

    const recPromise = new Promise<Blob>((resolve) => {
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        onProgress?.(100);
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
    });

    recorder.start();
    for (const frame of frames) {
      ctx?.putImageData(frame, 0, 0);
      await new Promise((r) => setTimeout(r, 1000 / fps));
    }
    recorder.stop();
    return await recPromise;
  }

  // 4. Video transcoding (WebM / MP4)
  try {
    const stream = (video as unknown as { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).captureStream?.() 
      || (video as unknown as { mozCaptureStream?: () => MediaStream }).mozCaptureStream?.();

    if (stream) {
      const mime = 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });

      video.currentTime = start;
      await new Promise((r) => { video.onseeked = r; });

      recorder.start();
      video.play();

      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          video.pause();
        }
      }, Math.min(duration * 1000, 30000));

      return await recordPromise;
    }
  } catch {
    // Return original source blob if direct transcoding stream isn't supported
  }

  return sourceBlob;
}
