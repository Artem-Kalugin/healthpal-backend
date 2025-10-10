import { Controller, Get, SerializeOptions } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OnboardingSlidesService } from './onboarding-slides.service';
import { Public } from 'src/common/decorators/public.decorator';
import { OnboardingSlideResponseDto } from './dto/onboarding-slide-response.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingSlidesController {
  constructor(private readonly service: OnboardingSlidesService) {}

  @Public()
  @Get()
  @ApiOkResponse({
    description: 'Список активных onboarding-слайдов',
    type: OnboardingSlideResponseDto,
    isArray: true,
  })
  @SerializeOptions({ type: OnboardingSlideResponseDto })
  async getAll(): Promise<OnboardingSlideResponseDto[]> {
    const res = await this.service.findAll(true, true);
    console.log(res);
    return res;
  }
}
