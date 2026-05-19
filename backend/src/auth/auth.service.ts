import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  PatientGoogleLoginDto,
  PatientOtpRequestDto,
  PatientOtpVerifyDto,
  DoctorRegisterDto,
  DoctorLoginDto,
  AdminLoginDto,
  RefreshTokenDto,
} from './dto/auth.dto';

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ==================== TOKEN HELPERS ====================

  private generateTokens(payload: { sub: string; role: string; email?: string }) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });
    return { accessToken, refreshToken };
  }

  // ==================== PATIENT AUTH ====================

  async patientGoogleLogin(dto: PatientGoogleLoginDto) {
    // In production, verify the Google ID token via Google's API
    // For now, we decode it (mock) or use a library like google-auth-library
    // Simplified: assume the token contains user info
    try {
      // Mock Google token verification - in production use google-auth-library
      const googlePayload = this.decodeGoogleToken(dto.token);
      // Normalise email so capitalisation can't create duplicate accounts
      if (googlePayload.email) googlePayload.email = googlePayload.email.trim().toLowerCase();

      let patient = await this.prisma.patient.findUnique({
        where: { googleId: googlePayload.sub },
      });

      if (!patient) {
        // Check if email already exists
        if (googlePayload.email) {
          const existing = await this.prisma.patient.findUnique({
            where: { email: googlePayload.email },
          });
          if (existing) {
            // Link Google account to existing patient
            patient = await this.prisma.patient.update({
              where: { id: existing.id },
              data: { googleId: googlePayload.sub, avatarUrl: googlePayload.picture },
            });
          }
        }

        if (!patient) {
          patient = await this.prisma.patient.create({
            data: {
              email: googlePayload.email,
              name: googlePayload.name || 'User',
              googleId: googlePayload.sub,
              avatarUrl: googlePayload.picture,
            },
          });
        }
      }

      const tokens = this.generateTokens({ sub: patient.id, role: 'patient', email: patient.email || undefined });
      return { ...tokens, user: this.sanitizePatient(patient), isNewUser: !patient.age };
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  private decodeGoogleToken(token: string) {
    // In production, verify with google-auth-library
    // This is a placeholder - the frontend should send the decoded user info
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload;
      }
    } catch {
      // ignore
    }
    // Fallback: treat token as a JSON string with user info (for dev/testing)
    try {
      return JSON.parse(token);
    } catch {
      throw new Error('Cannot decode token');
    }
  }

  async patientRequestOtp(dto: PatientOtpRequestDto) {
    // Normalise email so capitalisation/whitespace can't create duplicate accounts
    if (dto.email) dto.email = dto.email.trim().toLowerCase();
    const key = dto.email || dto.phone;
    if (!key) throw new BadRequestException('Email or phone is required');

    // Check rate limiting
    const existing = otpStore.get(key);
    if (existing && existing.attempts >= 3 && new Date() < existing.expiresAt) {
      throw new BadRequestException('Too many attempts. Please wait 15 minutes.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    otpStore.set(key, { otp, expiresAt, attempts: 0 });

    if (dto.email) {
      await this.sendOtpEmail(dto.email, otp);
    } else {
      // SMS not yet implemented — log for dev
      console.log(`[DEV] OTP for ${key}: ${otp}`);
    }

    return { message: 'OTP sent successfully', expiresIn: 300 };
  }

  async patientVerifyOtp(dto: PatientOtpVerifyDto) {
    // Normalise email to match patientRequestOtp (case/whitespace-insensitive)
    if (dto.email) dto.email = dto.email.trim().toLowerCase();
    const key = dto.email || dto.phone;
    if (!key) throw new BadRequestException('Email or phone is required');

    const stored = otpStore.get(key);
    if (!stored) throw new BadRequestException('No OTP requested. Please request a new OTP.');

    if (new Date() > stored.expiresAt) {
      otpStore.delete(key);
      throw new BadRequestException('OTP expired. Please request a new one.');
    }

    stored.attempts += 1;
    if (stored.attempts > 3) {
      stored.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Block 15 min
      throw new BadRequestException('Too many attempts. Blocked for 15 minutes.');
    }

    if (stored.otp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    otpStore.delete(key);

    // Find or create patient
    let patient = dto.email
      ? await this.prisma.patient.findUnique({ where: { email: dto.email } })
      : await this.prisma.patient.findFirst({ where: { phone: dto.phone } });

    if (!patient) {
      patient = await this.prisma.patient.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          name: dto.email?.split('@')[0] || 'User',
        },
      });
    }

    const tokens = this.generateTokens({ sub: patient.id, role: 'patient', email: patient.email || undefined });
    return { ...tokens, user: this.sanitizePatient(patient), isNewUser: !patient.age };
  }

  // ==================== DOCTOR AUTH ====================

  async doctorRegister(dto: DoctorRegisterDto) {
    if (dto.email) dto.email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.doctor.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const doctor = await this.prisma.doctor.create({
      data: {
        email: dto.email,
        name: dto.name,
        phone: dto.phone,
        passwordHash,
        cchRegistrationNo: dto.cchRegistrationNo,
        qualifications: dto.qualifications,
        status: 'pending',
      },
    });

    return {
      message: 'Registration successful. Your account is pending admin verification.',
      doctorId: doctor.id,
    };
  }

  async doctorLogin(dto: DoctorLoginDto) {
    if (dto.email) dto.email = dto.email.trim().toLowerCase();
    const doctor = await this.prisma.doctor.findUnique({ where: { email: dto.email } });
    if (!doctor || !doctor.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, doctor.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (doctor.status === 'pending') {
      throw new UnauthorizedException('Your account is pending verification. Please wait for admin approval.');
    }
    if (doctor.status === 'suspended') {
      throw new UnauthorizedException('Your account has been suspended. Please contact support.');
    }
    if (doctor.status === 'rejected') {
      throw new UnauthorizedException('Your registration was rejected. Reason: ' + (doctor.rejectionReason || 'Not specified'));
    }

    const tokens = this.generateTokens({ sub: doctor.id, role: 'doctor', email: doctor.email });
    return { ...tokens, user: this.sanitizeDoctor(doctor) };
  }

  // ==================== ADMIN AUTH ====================

  async adminLogin(dto: AdminLoginDto) {
    if (dto.email) dto.email = dto.email.trim().toLowerCase();
    const admin = await this.prisma.admin.findUnique({ where: { email: dto.email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const isValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    if (admin.mfaEnabled) {
      if (!dto.mfaCode) {
        return { requireMfa: true, message: 'MFA code required' };
      }
      // In production: verify TOTP code using speakeasy or otplib
      // For now, accept any 6-digit code in dev
      if (dto.mfaCode.length !== 6) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    const tokens = this.generateTokens({ sub: admin.id, role: 'admin', email: admin.email });
    return { ...tokens, user: { id: admin.id, email: admin.email, name: admin.name, role: 'admin' } };
  }

  // ==================== TOKEN REFRESH ====================

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const tokens = this.generateTokens({ sub: payload.sub, role: payload.role, email: payload.email });
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ==================== PROFILE ====================

  async getProfile(userId: string, role: string) {
    if (role === 'patient') {
      const patient = await this.prisma.patient.findUnique({ where: { id: userId } });
      if (!patient) throw new UnauthorizedException('User not found');
      return this.sanitizePatient(patient);
    }
    if (role === 'doctor') {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: userId },
        include: { specialities: { include: { speciality: true } } },
      });
      if (!doctor) throw new UnauthorizedException('User not found');
      return this.sanitizeDoctor(doctor);
    }
    if (role === 'admin') {
      const admin = await this.prisma.admin.findUnique({ where: { id: userId } });
      if (!admin) throw new UnauthorizedException('User not found');
      return { id: admin.id, email: admin.email, name: admin.name, role: 'admin' };
    }
    throw new UnauthorizedException('Invalid role');
  }

  // ==================== HELPERS ====================

  private async sendOtpEmail(email: string, otp: string) {
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get('SMTP_PORT', '587')),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: this.configService.get('SMTP_FROM', 'HomeoOpinion <noreply@homeopinion.in>'),
      to: email,
      subject: 'Your HomeoOpinion Login OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#2563eb">HomeoOpinion</h2>
          <p>Your one-time password (OTP) is:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f1f5f9;border-radius:8px;text-align:center">${otp}</div>
          <p style="color:#64748b;font-size:13px;margin-top:16px">This OTP expires in 5 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
  }

  private sanitizePatient(patient: any) {
    const { ...safe } = patient;
    return { ...safe, role: 'patient' };
  }

  private sanitizeDoctor(doctor: any) {
    const { passwordHash, ...safe } = doctor;
    return { ...safe, role: 'doctor' };
  }
}
