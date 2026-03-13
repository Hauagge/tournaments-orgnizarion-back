import { Controller, Get } from '@nestjs/common';
import { BracketService } from './bracket.service';

@Controller('brackets')
export class BracketController {
  constructor(private readonly service: BracketService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
