import { Injectable, BadRequestException } from '@nestjs/common';
import { execSync, spawn } from 'child_process';
import { Response } from 'express';
import sanitize from 'sanitize-filename';

@Injectable()
export class DownloadService {
  async downloadMedia(url: string, type: 'video' | 'audio', res: Response) {
    try {
      const result = execSync(`yt-dlp -j "${url}"`, { encoding: 'utf-8' });
      const data = JSON.parse(result);

      const title = sanitize(data.title || 'media');
      let formatId: string;
      let ext: string;
      let contentType: string;

      if (type === 'audio') {
        // Find best audio-only format
        const bestAudio = data.formats
          .filter((f) => f.vcodec === 'none')
          .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

        if (!bestAudio) {
          throw new BadRequestException('No audio format found');
        }

        formatId = bestAudio.format_id;
        ext = bestAudio.ext || 'm4a';
        contentType = bestAudio.ext === 'webm' ? 'audio/webm' : 'audio/mp4';
      } else {
        // Find best MP4 format with video and audio
        const bestVideo = data.formats
          .filter((f) => f.ext === 'mp4' && f.vcodec !== 'none' && f.acodec !== 'none')
          .sort((a, b) => (b.height || 0) - (a.height || 0))[0];

        if (!bestVideo) {
          throw new BadRequestException('No MP4 video format found');
        }

        formatId = bestVideo.format_id;
        ext = bestVideo.ext || 'mp4';
        contentType = 'video/mp4';
      }

      const filename = `${title}.${ext}`;
      const encodedFilename = encodeURIComponent(filename);

      // Set proper headers
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
      );

      const yt = spawn('yt-dlp', ['-f', formatId, '-o', '-', url]);

      yt.stdout.pipe(res);

      yt.stderr.on('data', (data) => {
        console.error(`yt-dlp error: ${data}`);
      });

      yt.on('close', (code) => {
        if (code !== 0) {
          console.error(`yt-dlp exited with code ${code}`);
        }
      });
    } catch (error) {
      console.error('Download failed:', error.message);
      throw new BadRequestException('Failed to download media');
    }
  }
}
