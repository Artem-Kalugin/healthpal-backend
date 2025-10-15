import { Controller, Get, SerializeOptions } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DoctorCategoryService } from './doctor-category.service';
import { DoctorCategoryResponseDto } from './dto/doctor-category-response.dto';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/config';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';

@ApiTags('Doctors')
@Controller('/doctor-categories')
@ApiBearerJwtAuth()
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
export class DoctorCategoryController {
  constructor(private readonly service: DoctorCategoryService) {}

  @Get()
  @ApiOkResponse({
    description: 'Список категорий врачей',
    type: DoctorCategoryResponseDto,
    isArray: true,
  })
  @SerializeOptions({ type: DoctorCategoryResponseDto })
  async getAll(): Promise<DoctorCategoryResponseDto[]> {
    return await this.service.findAll();
  }
}
