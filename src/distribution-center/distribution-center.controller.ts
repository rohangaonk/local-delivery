import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { DistributionCenterService } from './distribution-center.service';
import {
  CreateDistributionCenterDto,
  UpdateDistributionCenterDto,
} from './dto/distribution-center.dto';

@Controller('admin/distribution-centers')
export class DistributionCenterController {
  constructor(private readonly dcService: DistributionCenterService) {}

  @Get()
  findAll() {
    return this.dcService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dcService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDistributionCenterDto) {
    return this.dcService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDistributionCenterDto,
  ) {
    return this.dcService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.dcService.remove(id);
  }
}
