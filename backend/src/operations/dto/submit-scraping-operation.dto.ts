import { Transform } from 'class-transformer';

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class SubmitScrapingOperationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(2_048, { each: true })
  @IsUrl(
    {
      protocols: ['https'],
      require_protocol: true,
    },
    {
      each: true,
    },
  )
  @Transform(({ value }: { value: string[] }) =>
    Array.isArray(value)
      ? value.map((url) => (typeof url === 'string' ? url.trim() : url))
      : value,
  )
  urls!: string[];
}
