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
import { ItemService } from './item.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';

/**
 * Admin-only CRUD for catalog items.
 * No auth guard yet — will be added when auth is introduced.
 * Prefixed /admin/items to signal intent.
 */
@Controller('admin/items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Get()
  findAll() {
    return this.itemService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateItemDto) {
    return this.itemService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.itemService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemService.remove(id);
  }
}
