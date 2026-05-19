import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard, RolesGuard, Roles } from './guards/auth.guard';
import {
  PatientGoogleLoginDto,
  PatientOtpRequestDto,
  PatientOtpVerifyDto,
  DoctorRegisterDto,
  DoctorLoginDto,
  AdminLoginDto,
  RefreshTokenDto,
} from './dto/auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // ==================== PATIENT AUTH ====================

  @Post('patient/google')
  async patientGoogleLogin(@Body() dto: PatientGoogleLoginDto) {
    return this.authService.patientGoogleLogin(dto);
  }

  @Post('patient/otp/request')
  async patientRequestOtp(@Body() dto: PatientOtpRequestDto) {
    return this.authService.patientRequestOtp(dto);
  }

  @Post('patient/otp/verify')
  async patientVerifyOtp(@Body() dto: PatientOtpVerifyDto) {
    return this.authService.patientVerifyOtp(dto);
  }

  // ==================== DOCTOR AUTH ====================

  @Post('doctor/register')
  async doctorRegister(@Body() dto: DoctorRegisterDto) {
    return this.authService.doctorRegister(dto);
  }

  @Post('doctor/login')
  async doctorLogin(@Body() dto: DoctorLoginDto) {
    return this.authService.doctorLogin(dto);
  }

  // ==================== ADMIN AUTH ====================

  @Post('admin/login')
  async adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  // ==================== TOKEN ====================

  @Post('refresh')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // ==================== PROFILE ====================

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub, req.user.role);
  }
}
