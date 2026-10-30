import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { Authenticated } from 'src/common/helpers/decorators/authenticated.decorator';
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
  async getAll(): Promise<DoctorCategoryResponseDto[]> {
    return await this.service.findAll();
  }
}
