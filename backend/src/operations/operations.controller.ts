import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { OperationQueryDto } from './dto/operation-query.dto';

import { SubmitScrapingOperationDto } from './dto/submit-scraping-operation.dto';

import { ScrapingOperationsService } from './operations.service';

@ApiTags('scraping-operations')
@Controller('v1/scraping-operations')
export class OperationsController {
  constructor(private readonly operationsService: ScrapingOperationsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Submit one or more restaurant URLs for background scraping',
  })
  @ApiBody({
    type: SubmitScrapingOperationDto,
  })
  @ApiResponse({
    status: 202,
    description: 'Scraping operation accepted.',
  })
  @ApiResponse({
    status: 422,
    description: 'No submitted URLs belong to a supported platform.',
  })
  submit(
    @Body()
    dto: SubmitScrapingOperationDto,
  ) {
    return this.operationsService.submit(dto);
  }

  @Get(':operationId')
  @ApiOperation({
    summary: 'Get operation status and paginated task details',
  })
  getOperation(
    @Param('operationId')
    operationId: string,

    @Query()
    query: OperationQueryDto,
  ) {
    return this.operationsService.getOperation(operationId, query);
  }

  @Get(':operationId/results')
  @ApiOperation({
    summary: 'Get normalized restaurant results for an operation',
  })
  getResults(
    @Param('operationId')
    operationId: string,
  ) {
    return this.operationsService.getResults(operationId);
  }
}
