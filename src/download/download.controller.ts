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

  @Get()
  async download(
    @Query('url') url: string,
    @Query('type') type: string, // 'video' or 'audio'
    @Res() res: Response,
  ) {
    if (!url) {
      throw new BadRequestException('Missing "url" query parameter');
    }

    const downloadType = type === 'audio' ? 'audio' : 'video'; // default is video
    await this.downloadService.downloadMedia(url, downloadType, res);
  }
}
