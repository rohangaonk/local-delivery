import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityResponseDto, AvailableItemDto } from './dto/availability-response.dto';

@Controller('v1/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAvailability(
    @Query() queryDto: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto<AvailableItemDto>> {
    return this.availabilityService.getAvailability(queryDto);
  }
}
