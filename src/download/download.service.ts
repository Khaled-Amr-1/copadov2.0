import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { Response } from 'express';

@Injectable()
export class DownloadService {
  async getAvailableFormats(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn('yt-dlp', ['-j', url]); // Get full JSON info

      let output = '';
      let error = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(error || 'yt-dlp failed'));
        }

        try {
          const json = JSON.parse(output);

          const formats = json.formats.map((f) => ({
            format_id: f.format_id,
            extension: f.ext,
            resolution: f.resolution || `${f.width || '?'}x${f.height || '?'}`,
            fps: f.fps || null,
            audio_only: !f.vcodec || f.vcodec === 'none',
            video_only: !f.acodec || f.acodec === 'none',
            filesize_mb: f.filesize
              ? (f.filesize / (1024 * 1024)).toFixed(2)
              : null,
            note: f.format_note || f.format,
          }));

          resolve({
            title: json.title,
            duration_seconds: json.duration,
            duration_hms: this.secondsToHMS(json.duration),
            thumbnail: json.thumbnail,
            uploader: json.uploader,
            formats,
          });
        } catch (err) {
          reject(new Error('Failed to parse yt-dlp JSON output'));
        }
      });
    });
  }

  downloadVideo(url: string, format: string, res: Response): void {
    const args = ['-f', format, '-o', '-', url];
    const process = spawn('yt-dlp', args);

    res.set({
      'Content-Disposition': `attachment; filename="video-${format}.mp4"`,
      'Content-Type': 'video/mp4',
    });

    process.stdout.pipe(res);

    process.stderr.on('data', (data) => {
      console.error(`yt-dlp error: ${data}`);
    });

    process.on('close', (code) => {
      if (code !== 0) {
        res.status(500).send('Failed to download video.');
      }
    });
  }

  private secondsToHMS(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  }
}
