import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  SerializeOptions,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { DoctorService } from './doctor.service';
import { DoctorResponseDto } from './dto/doctor-response.dto';
import {
  PaginatedResponseDto,
  PaginatedResponseOf,
} from 'src/common/helpers/pagination/paginated-response.dto';
import type { Request } from 'express';
import { DoctorSearchQueryDto } from './dto/doctor-search-query.dto';
import { AuthRegistrationGuardType } from 'src/common/helpers/decorators/auth-registration-type.decorator';
import { AuthGuardsByRegistration } from 'src/common/config';
import { ApiBearerJwtAuth } from 'src/common/helpers/decorators/api-bearer-auth.decorator';

const PaginatedDoctorResponse = PaginatedResponseOf(DoctorResponseDto);

@ApiTags('Doctors')
@ApiBearerJwtAuth()
@Controller('doctors')
@AuthRegistrationGuardType(AuthGuardsByRegistration.COMPLETE_REGISTRATION)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('search')
  @ApiOkResponse({ type: PaginatedResponseDto<DoctorResponseDto> })
  @SerializeOptions({
    type: PaginatedDoctorResponse,
  })
  async searchDoctors(
    @Req() request: Request,
    @Query() query: DoctorSearchQueryDto,
  ): Promise<PaginatedResponseDto<DoctorResponseDto>> {
    const result = await this.doctorService.searchDoctorsForUser({
      ...query,
      userId: request.user!.id,
    });

    return new PaginatedDoctorResponse(result);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: DoctorResponseDto })
  @SerializeOptions({
    type: DoctorResponseDto,
  })
  async getDoctorById(
    @Req() request: Request,
    @Param('id') id: string,
  ): Promise<DoctorResponseDto> {
    return await this.doctorService.findOneForUser(request.user!.id, id);
  }
}
