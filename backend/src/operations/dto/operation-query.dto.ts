import { IsMongoId, IsOptional } from 'class-validator';

export class OperationQueryDto {
  @IsOptional()
  @IsMongoId()
  cursor?: string;
}
