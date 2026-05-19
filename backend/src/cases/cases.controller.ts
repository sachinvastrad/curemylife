import {
  Controller, Get, Post, Put, Param, Body, Query,
  UseGuards, Req, UseInterceptors, UploadedFile, UploadedFiles,
  BadRequestException, Delete,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CasesService } from './cases.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards/auth.guard';
import { CreateCaseDto, UpdateCaseDto, AddDocumentLabelDto } from './dto/case.dto';
import { PrismaService } from '../prisma/prisma.service';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

const storage = diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestException(`File type ${ext} not supported. Allowed: PDF, JPEG, PNG`), false);
  }
};

@Controller('api/cases')
@UseGuards(JwtAuthGuard)
export class CasesController {
  constructor(
    private casesService: CasesService,
    private prisma: PrismaService,
  ) {}

  // ==================== PATIENT ENDPOINTS ====================

  @Post()
  @UseGuards(RolesGuard)
  @Roles('patient')
  async create(@Req() req: any, @Body() dto: CreateCaseDto) {
    return this.casesService.create(req.user.sub, dto);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async getMyCase(@Req() req: any, @Query('status') status?: string) {
    return this.casesService.findAllForPatient(req.user.sub, status);
  }

  @Get(':id')
  async getCase(@Param('id') id: string, @Req() req: any) {
    return this.casesService.findById(id, req.user.sub, req.user.role);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async updateCase(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateCaseDto) {
    return this.casesService.update(id, req.user.sub, dto);
  }

  @Post(':id/submit')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async submitCase(@Param('id') id: string, @Req() req: any) {
    return this.casesService.submit(id, req.user.sub);
  }

  // ==================== DOCUMENT UPLOAD ====================

  @Post(':id/documents')
  @UseGuards(RolesGuard)
  @Roles('patient')
  @UseInterceptors(FilesInterceptor('files', 10, { storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadDocuments(
    @Param('id') caseId: string,
    @Req() req: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // Verify case ownership
    const existing = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!existing || existing.patientId !== req.user.sub) {
      throw new BadRequestException('Case not found or access denied');
    }
    if (existing.status !== 'draft') {
      throw new BadRequestException('Cannot upload documents to a submitted case');
    }

    // Check total size
    const existingDocs = await this.prisma.caseDocument.findMany({ where: { caseId } });
    const existingSize = existingDocs.reduce((sum, d) => sum + Number(d.fileSizeBytes), 0);
    const newSize = files.reduce((sum, f) => sum + f.size, 0);
    if (existingSize + newSize > 100 * 1024 * 1024) {
      throw new BadRequestException('Total document size exceeds 100 MB limit');
    }

    const documents = await Promise.all(
      files.map((file) =>
        this.prisma.caseDocument.create({
          data: {
            caseId,
            fileName: file.originalname,
            fileType: extname(file.originalname).replace('.', ''),
            fileSizeBytes: file.size,
            storageKey: file.filename,
          },
        }),
      ),
    );

    return documents;
  }

  @Put(':caseId/documents/:docId/label')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async updateDocumentLabel(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Req() req: any,
    @Body() dto: AddDocumentLabelDto,
  ) {
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id: docId, caseId },
      include: { case_: true },
    });
    if (!doc || doc.case_.patientId !== req.user.sub) {
      throw new BadRequestException('Document not found');
    }
    return this.prisma.caseDocument.update({
      where: { id: docId },
      data: { label: dto.label },
    });
  }

  @Delete(':caseId/documents/:docId')
  @UseGuards(RolesGuard)
  @Roles('patient')
  async deleteDocument(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Req() req: any,
  ) {
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id: docId, caseId },
      include: { case_: true },
    });
    if (!doc || doc.case_.patientId !== req.user.sub) {
      throw new BadRequestException('Document not found');
    }
    if (doc.case_.status !== 'draft') {
      throw new BadRequestException('Cannot delete documents from a submitted case');
    }
    await this.prisma.caseDocument.delete({ where: { id: docId } });
    return { message: 'Document deleted' };
  }

  // ==================== DOCTOR ENDPOINTS ====================

  @Get('doctor/queue')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async getDoctorQueue(@Req() req: any, @Query('specialityId') specialityId?: string) {
    return this.casesService.findQueueForDoctor(req.user.sub, specialityId ? parseInt(specialityId) : undefined);
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async acceptCase(@Param('id') id: string, @Req() req: any) {
    return this.casesService.acceptCase(id, req.user.sub);
  }

  @Get('doctor/assigned')
  @UseGuards(RolesGuard)
  @Roles('doctor')
  async getDoctorCases(@Req() req: any, @Query('status') status?: string) {
    return this.casesService.getDoctorCases(req.user.sub, status);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAllCases(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.casesService.findAllCases(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status,
    );
  }

  @Post('admin/:id/reassign')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async reassignCase(@Param('id') id: string, @Body('doctorId') doctorId: string) {
    return this.casesService.reassignCase(id, doctorId);
  }
}
