import { Controller, Post, Body, Get, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password, req.headers['user-agent'], req.ip);
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge });
    return result;
  }

  @Post('google')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async googleLogin(@Body() body: GoogleLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.googleLogin(body.idToken, req.headers['user-agent'], req.ip);
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge });
    return result;
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('verify-otp')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.resetToken, body.newPassword);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async refresh(@Body() body: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.refresh(body.refreshToken);
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    res.cookie('accessToken', result.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge });
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response, @CurrentUser('id') userId: string) {
    res.clearCookie('accessToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    return this.authService.logout(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('sessions')
  getSessions(@CurrentUser('id') userId: string, @Req() req: Request) {
    return this.authService.getSessions(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('sessions/:id')
  revokeSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.authService.revokeSession(userId, id);
  }
}
