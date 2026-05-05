import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @MinLength(1)
  category: string;

  @IsInt()
  @Min(0)
  priceInPaise: number;
}

export class UpdateItemDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceInPaise?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
