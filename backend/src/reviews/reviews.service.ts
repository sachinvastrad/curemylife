import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(patientId: string, appointmentId: string, data: {
    rating: number;
    reviewText?: string;
  }) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { review: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.patientId !== patientId) throw new BadRequestException('Access denied');
    if (appointment.status !== 'completed') {
      throw new BadRequestException('Can only review completed appointments');
    }
    if (appointment.review) {
      throw new ConflictException('This appointment has already been reviewed');
    }

    const review = await this.prisma.doctorReview.create({
      data: {
        doctorId: appointment.doctorId,
        patientId,
        appointmentId,
        rating: data.rating,
        reviewText: data.reviewText,
      },
    });

    // Update doctor's average rating
    const stats = await this.prisma.doctorReview.aggregate({
      where: { doctorId: appointment.doctorId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.doctor.update({
      where: { id: appointment.doctorId },
      data: {
        avgRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating,
      },
    });

    return review;
  }

  async getDoctorReviews(doctorId: string, page = 1, limit = 10) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const [reviews, total] = await Promise.all([
      this.prisma.doctorReview.findMany({
        where: { doctorId, isVisible: true },
        include: {
          patient: { select: { name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.doctorReview.count({ where: { doctorId, isVisible: true } }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      avgRating: doctor.avgRating,
      totalReviews: doctor.totalReviews,
    };
  }

  async getMyReview(patientId: string, appointmentId: string) {
    return this.prisma.doctorReview.findFirst({
      where: { appointmentId, patientId },
    });
  }

  async moderateReview(reviewId: string, isVisible: boolean, adminId: string) {
    const review = await this.prisma.doctorReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.doctorReview.update({
      where: { id: reviewId },
      data: { isVisible, moderatedBy: adminId },
    });

    // Recalculate avg rating after moderation
    const stats = await this.prisma.doctorReview.aggregate({
      where: { doctorId: review.doctorId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.doctor.update({
      where: { id: review.doctorId },
      data: {
        avgRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating,
      },
    });

    return updated;
  }
}
