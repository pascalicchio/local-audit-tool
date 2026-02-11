#!/usr/bin/env node
/**
 * Audio Transcription using faster_whisper
 */

const { spawn } = require('child_process');

const WHISPER_VENV = '/root/.openclaw/venv-whisper/bin/python';
const TRANSCRIBE_SCRIPT = `
import sys
import os

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from faster_whisper import WhisperModel
import ffmpeg
import tempfile
import wave

def transcribe(audio_path):
    try:
        # Use tiny model for speed
        model = WhisperModel("tiny", compute_type="int8")
        segments, info = model.transcribe(audio_path, beam_size=5)
        
        text = ""
        for segment in segments:
            text += segment.text + " "
        
        return {"success": True, "text": text.strip(), "language": info.language}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    audio_path = sys.argv[1]
    result = transcribe(audio_path)
    print(result)
`;

async function transcribeAudio(audioPath) {
  return new Promise((resolve, reject) => {
    const python = spawn(WHISPER_VENV, ['-c', TRANSCRIBE_SCRIPT, audioPath]);
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => { stdout += data.toString(); });
    python.stderr.on('data', (data) => { stderr += data.toString(); });
    
    python.on('close', (code) => {
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        resolve({ success: False, error: stderr || stdout || 'Parse error' });
      }
    });
  });
}

// CLI
if (require.main === module) {
  const audioPath = process.argv[2];
  if (!audioPath) {
    console.log('Usage: node transcribe-audio.js <audiofile>');
    process.exit(1);
  }
  transcribeAudio(audioPath).then(console.log);
}

module.exports = { transcribeAudio };
