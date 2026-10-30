import { ApiSerialized } from 'src/common/helpers/decorators/api-serialized.decorator';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OnboardingSlidesService } from './onboarding-slides.service';
import { Public } from 'src/common/helpers/decorators/public.decorator';
import { OnboardingSlideResponseDto } from './dto/onboarding-slide-response.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingSlidesController {
  constructor(private readonly service: OnboardingSlidesService) {}

  @Public()
  @Get('/slides')
  @ApiSerialized(OnboardingSlideResponseDto, {
    description: 'List of active onboarding slides',
    isArray: true,
  })
  async list() {
    return await this.service.findActive();
  }
}
