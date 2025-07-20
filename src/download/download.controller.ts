import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { DownloadService } from './download.service';
import { Response } from 'express';

@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get('formats')
  async getFormats(@Query('url') url: string, @Res() res: Response) {
    if (!url) throw new BadRequestException('Missing "url" query parameter');

    try {
      const result = await this.downloadService.getAvailableFormats(url);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  @Get()
  download(
    @Query('url') url: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (!url || !format) {
      throw new BadRequestException(
        'Missing "url" or "format" query parameter',
      );
    }

    this.downloadService.downloadVideo(url, format, res);
  }
}
