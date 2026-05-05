import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  long: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
