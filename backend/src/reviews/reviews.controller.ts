import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post('appointments/:appointmentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('patient')
  async createReview(
    @Req() req: any,
    @Param('appointmentId') appointmentId: string,
    @Body() data: { rating: number; reviewText?: string },
  ) {
    return this.reviewsService.createReview(req.user.sub, appointmentId, data);
  }

  @Get('appointments/:appointmentId/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('patient')
  async getMyReview(@Req() req: any, @Param('appointmentId') appointmentId: string) {
    return this.reviewsService.getMyReview(req.user.sub, appointmentId);
  }

  @Get('doctors/:doctorId')
  async getDoctorReviews(
    @Param('doctorId') doctorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getDoctorReviews(
      doctorId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Patch(':reviewId/moderate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async moderateReview(
    @Req() req: any,
    @Param('reviewId') reviewId: string,
    @Body('isVisible') isVisible: boolean,
  ) {
    return this.reviewsService.moderateReview(reviewId, isVisible, req.user.sub);
  }
}
