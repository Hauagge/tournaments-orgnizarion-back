import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  UsePipes,
} from '@nestjs/common';
import { AthleteService } from './athlete.service';
import { Athlete } from './entities/athlete.entity';
import { ZodValidationPipe } from 'src/core/pipe/zod-validation.pipe';
import { ListAthletesDTO, ListAthletesSchema } from './dto/list-athletes.dto';
import { CreateAthleteDTO } from './dto/create-athlete.dto';

@Controller('athletes')
export class AthleteController {
  constructor(private readonly service: AthleteService) {}

  @Post()
  create(@Body() athlete: CreateAthleteDTO) {
    return this.service.create(athlete);
  }

  @Patch(':id/confirm-weigh-in')
  confirmWeighIn(@Param('id') id: number, @Body('eligible') eligible: boolean) {
    return this.service.confirmWeighIn(id, eligible);
  }

  @Get()
  @UsePipes(new ZodValidationPipe(ListAthletesSchema))
  findAll(query: ListAthletesDTO) {
    return this.service.findAll(query);
  }
}
