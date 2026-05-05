export class AvailabilityResponseDto<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

export class AvailableItemDto {
  id: string;
  name: string;
  priceInPaise: number;
  totalQuantity: number;
}
