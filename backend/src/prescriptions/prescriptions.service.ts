import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(doctorId: string, data: {
    caseId: string;
    appointmentId?: string;
    patientId: string;
    remedyName: string;
    potency: string;
    dosage: string;
    frequency: string;
    duration: string;
    dietaryRestrictions?: string;
    expectedAggravation?: string;
    followupTimeline?: string;
  }) {
    const caseData = await this.prisma.case.findUnique({ where: { id: data.caseId } });
    if (!caseData) throw new NotFoundException('Case not found');
    if (caseData.assignedDoctorId !== doctorId) throw new BadRequestException('Case not assigned to you');

    const prescription = await this.prisma.prescription.create({
      data: {
        caseId: data.caseId,
        appointmentId: data.appointmentId,
        doctorId,
        patientId: data.patientId,
        remedyName: data.remedyName,
        potency: data.potency,
        dosage: data.dosage,
        frequency: data.frequency,
        duration: data.duration,
        dietaryRestrictions: data.dietaryRestrictions,
        expectedAggravation: data.expectedAggravation,
        followupTimeline: data.followupTimeline,
        // In production: generate digital signature and PDF
        digitalSignature: `sig_${doctorId}_${Date.now()}`,
        pdfStorageKey: null, // PDF generation would happen here
      },
      include: {
        doctor: { select: { name: true, cchRegistrationNo: true, qualifications: true } },
        patient: { select: { name: true, age: true, gender: true } },
      },
    });

    return prescription;
  }

  async getByCaseId(caseId: string) {
    return this.prisma.prescription.findMany({
      where: { caseId },
      include: {
        doctor: { select: { name: true, cchRegistrationNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByPatientId(patientId: string) {
    return this.prisma.prescription.findMany({
      where: { patientId },
      include: {
        doctor: { select: { name: true, cchRegistrationNo: true } },
        case_: { select: { caseNumber: true, chiefComplaint: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        doctor: { select: { name: true, cchRegistrationNo: true, qualifications: true } },
        patient: { select: { name: true, age: true, gender: true } },
        case_: { select: { caseNumber: true } },
      },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');
    return prescription;
  }

  async generatePdf(id: string): Promise<Buffer> {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        doctor: { select: { name: true, cchRegistrationNo: true, qualifications: true, phone: true } },
        patient: { select: { name: true, age: true, gender: true } },
        case_: { select: { caseNumber: true } },
      },
    });
    if (!prescription) throw new NotFoundException('Prescription not found');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('HomeoOpinion', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text('AI-Powered Homoeopathic Second Opinion Portal', 50, 75);
      doc.moveTo(50, 95).lineTo(545, 95).stroke('#cccccc');

      // Title
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a')
        .text('E-Prescription', 50, 110);
      doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text(`Date: ${new Date(prescription.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 130)
        .text(`Case No: ${prescription.case_?.caseNumber || '-'}`, 350, 130);

      // Patient info
      doc.moveTo(50, 150).lineTo(545, 150).stroke('#eeeeee');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text('Patient Details', 50, 160);
      doc.fontSize(10).font('Helvetica').fillColor('#555')
        .text(`Name: ${prescription.patient?.name || '-'}`, 50, 178)
        .text(`Age: ${prescription.patient?.age || '-'}  |  Gender: ${prescription.patient?.gender || '-'}`, 50, 193);

      // Doctor info
      doc.moveTo(50, 213).lineTo(545, 213).stroke('#eeeeee');
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333').text('Prescribing Doctor', 50, 223);
      doc.fontSize(10).font('Helvetica').fillColor('#555')
        .text(`Dr. ${prescription.doctor?.name || '-'}`, 50, 241)
        .text(`Qualifications: ${prescription.doctor?.qualifications || '-'}`, 50, 256)
        .text(`CCH Reg. No: ${prescription.doctor?.cchRegistrationNo || '-'}`, 50, 271);

      // Prescription details
      doc.moveTo(50, 291).lineTo(545, 291).stroke('#eeeeee');
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#2563eb').text('Rx', 50, 301);

      let y = 320;
      const field = (label: string, value: string | null | undefined) => {
        if (!value) return;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text(`${label}:`, 50, y);
        doc.fontSize(10).font('Helvetica').fillColor('#555').text(value, 200, y, { width: 345 });
        y += Math.max(15, doc.heightOfString(value, { width: 345 })) + 8;
      };

      field('Remedy', prescription.remedyName);
      field('Potency', prescription.potency);
      field('Dosage', prescription.dosage);
      field('Frequency', prescription.frequency);
      field('Duration', prescription.duration);
      if (prescription.dietaryRestrictions) field('Dietary Restrictions', prescription.dietaryRestrictions);
      if (prescription.expectedAggravation) field('Expected Aggravation', prescription.expectedAggravation);
      if (prescription.followupTimeline) field('Follow-up Timeline', prescription.followupTimeline);

      // Disclaimer
      doc.moveTo(50, y + 10).lineTo(545, y + 10).stroke('#eeeeee');
      y += 25;
      doc.fontSize(8).font('Helvetica').fillColor('#999')
        .text(
          'This prescription is issued as per CCH Telemedicine Practice Guidelines 2020. ' +
          'This is a digital prescription issued by a registered homoeopathic practitioner. ' +
          'AI analysis is preliminary and for practitioner use only.',
          50, y, { width: 495 }
        );

      // Digital signature area
      y += 50;
      doc.fontSize(10).font('Helvetica').fillColor('#333')
        .text('Digitally signed by:', 350, y)
        .text(`Dr. ${prescription.doctor?.name || '-'}`, 350, y + 15)
        .text(`CCH Reg. No: ${prescription.doctor?.cchRegistrationNo || '-'}`, 350, y + 30);

      doc.end();
    });
  }
}
