import { Controller, Get, SerializeOptions } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { DoctorCategoryService } from './doctor-category.service';
import { DoctorCategoryResponseDto } from './dto/doctor-category-response.dto';
import { AuthRegistrationGuardType } from 'src/common/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/types/auth-guard-by-registration-completion.config';
import { ApiBearerJwtAuth } from 'src/common/decorators/api-bearer-auth.decorator';

@ApiTags('Doctor')
@Controller('/doctor/categories')
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
