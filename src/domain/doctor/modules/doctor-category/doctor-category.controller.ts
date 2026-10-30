import { ApiSerialized } from 'src/common/decorators/api-serialized.decorator';
import { Authenticated } from 'src/common/decorators/authenticated.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DoctorCategoryService } from './doctor-category.service';
import { DoctorCategoryResponseDto } from './dto/doctor-category-response.dto';

@ApiTags('Doctors')
@Controller('/doctor-categories')
@Authenticated()
export class DoctorCategoryController {
  constructor(private readonly service: DoctorCategoryService) {}

  @Get()
  @ApiSerialized(DoctorCategoryResponseDto, {
    description: 'List of doctor categories',
    isArray: true,
  })
  list() {
    return this.service.find();
  }
}
