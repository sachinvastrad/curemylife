import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Process a submitted case and generate an AI preliminary report.
   * This is called asynchronously after case submission.
   */
  async processCase(caseId: string) {
    const startTime = Date.now();

    try {
      const caseData = await this.prisma.case.findUnique({
        where: { id: caseId },
        include: {
          documents: true,
          specialities: { include: { speciality: true } },
          patient: { select: { name: true, age: true, gender: true } },
        },
      });

      if (!caseData) {
        this.logger.error(`Case ${caseId} not found`);
        return;
      }

      await this.prisma.case.update({
        where: { id: caseId },
        data: { status: 'ai_processing' },
      });

      // Build the AI prompt
      const prompt = this.buildPrompt(caseData);

      // Call AI API
      let aiResponse: any;
      const apiKey = this.configService.get('OPENAI_API_KEY');

      if (apiKey && apiKey !== 'your-openai-api-key') {
        aiResponse = await this.callOpenAI(prompt);
      } else {
        // Generate a mock AI report for development
        this.logger.warn('No OpenAI API key configured. Generating mock AI report.');
        aiResponse = this.generateMockReport(caseData);
      }

      // Save AI report
      const processingTime = Date.now() - startTime;

      await this.prisma.aiReport.create({
        data: {
          caseId,
          mentalSymptoms: aiResponse.mentalSymptoms || [],
          generalSymptoms: aiResponse.generalSymptoms || [],
          particularSymptoms: aiResponse.particularSymptoms || [],
          parsedLabValues: aiResponse.parsedLabValues || [],
          rubricSuggestions: aiResponse.rubricSuggestions || [],
          constitutionalTypes: aiResponse.constitutionalTypes || [],
          predominantMiasm: aiResponse.predominantMiasm,
          miasmRationale: aiResponse.miasmRationale,
          miasmConfidence: aiResponse.miasmConfidence,
          redFlags: aiResponse.redFlags || [],
          hasRedFlags: (aiResponse.redFlags || []).length > 0,
          overallConfidence: aiResponse.overallConfidence || 0.7,
          processingTimeMs: processingTime,
          modelVersion: aiResponse.modelVersion || 'mock-v1',
          rawResponse: JSON.stringify(aiResponse),
        },
      });

      // Update case status
      await this.prisma.case.update({
        where: { id: caseId },
        data: {
          status: 'awaiting_doctor',
          aiCompletedAt: new Date(),
        },
      });

      this.logger.log(`AI report generated for case ${caseId} in ${processingTime}ms`);
    } catch (error) {
      this.logger.error(`AI processing failed for case ${caseId}:`, error);
      // Mark case for manual review
      await this.prisma.case.update({
        where: { id: caseId },
        data: { status: 'awaiting_doctor' }, // Still move forward
      });
    }
  }

  private buildPrompt(caseData: any): string {
    const specialities = caseData.specialities.map((s: any) => s.speciality.name).join(', ');

    return `You are an AI assistant for homoeopathic case analysis. Analyse the following case and provide a structured preliminary report.

IMPORTANT DISCLAIMER: This is a preliminary analysis tool to assist qualified homoeopathic practitioners. It is NOT a diagnosis or prescription. All clinical decisions rest with the reviewing doctor.

PATIENT INFO:
- Age: ${caseData.patient?.age || 'Not provided'}
- Gender: ${caseData.patient?.gender || 'Not provided'}

CHIEF COMPLAINT:
${caseData.chiefComplaint || 'Not provided'}

DURATION: ${caseData.durationValue || ''} ${caseData.durationUnit || ''}

PREVIOUS TREATMENTS:
${caseData.previousTreatments || 'None mentioned'}

FAMILY HISTORY:
${caseData.familyHistory || 'Not provided'}

PAST ILLNESSES:
${caseData.pastIllnesses || 'Not provided'}

SPECIALITY TAGS: ${specialities}

${caseData.temperament?.length ? `TEMPERAMENT: ${caseData.temperament.join(', ')}` : ''}
${caseData.fears?.length ? `FEARS: ${caseData.fears.join(', ')}` : ''}
${caseData.thermalPreference ? `THERMAL PREFERENCE: ${caseData.thermalPreference}` : ''}
${caseData.foodCravings?.length ? `FOOD CRAVINGS: ${caseData.foodCravings.join(', ')}` : ''}
${caseData.foodAversions?.length ? `FOOD AVERSIONS: ${caseData.foodAversions.join(', ')}` : ''}

Please provide your analysis in the following JSON format:
{
  "mentalSymptoms": ["list of identified mental symptoms"],
  "generalSymptoms": ["list of identified general symptoms"],
  "particularSymptoms": ["list of identified particular symptoms"],
  "rubricSuggestions": [{"rubricText": "Kent's Repertory rubric", "confidence": 0.0-1.0, "sourceRepertory": "Kent"}],
  "constitutionalTypes": [{"type": "constitutional type", "rationale": "why", "confidence": 0.0-1.0}],
  "predominantMiasm": "Psora/Sycosis/Syphilis/Tubercular",
  "miasmRationale": "explanation",
  "miasmConfidence": 0.0-1.0,
  "redFlags": [{"symptom": "concerning symptom", "severity": "high/medium", "recommendation": "action"}],
  "overallConfidence": 0.0-1.0,
  "summary": "brief case summary"
}`;
  }

  private async callOpenAI(prompt: string): Promise<any> {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    const model = this.configService.get('AI_MODEL', 'gpt-4o');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a homoeopathic case analysis AI. Always respond in valid JSON format.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    return JSON.parse(content);
  }

  private generateMockReport(caseData: any): any {
    const complaint = (caseData.chiefComplaint || '').toLowerCase();

    // Generate contextual mock data based on complaint keywords
    const mentalSymptoms = ['Anxiety about health', 'Restlessness'];
    const generalSymptoms = ['Fatigue', 'Weakness'];
    const particularSymptoms = [];

    if (complaint.includes('skin') || complaint.includes('eczema') || complaint.includes('rash')) {
      particularSymptoms.push('Itching < night', 'Dry eruptions', 'Burning sensation on affected area');
    } else if (complaint.includes('headache') || complaint.includes('migraine')) {
      particularSymptoms.push('Throbbing headache', 'Pain > pressure', 'Photophobia');
    } else if (complaint.includes('stomach') || complaint.includes('digest') || complaint.includes('gastric')) {
      particularSymptoms.push('Bloating after eating', 'Acidity', 'Nausea');
    } else {
      particularSymptoms.push('Symptom as described in chief complaint');
    }

    return {
      mentalSymptoms,
      generalSymptoms,
      particularSymptoms,
      parsedLabValues: [],
      rubricSuggestions: [
        { rubricText: 'MIND - ANXIETY - health, about', confidence: 0.8, sourceRepertory: 'Kent' },
        { rubricText: 'GENERALITIES - WEAKNESS', confidence: 0.75, sourceRepertory: 'Kent' },
        { rubricText: 'GENERALITIES - FATIGUE', confidence: 0.7, sourceRepertory: 'Kent' },
      ],
      constitutionalTypes: [
        { type: 'Arsenicum Album', rationale: 'Anxiety about health, restlessness, need for order', confidence: 0.6 },
        { type: 'Phosphorus', rationale: 'General weakness, fatigue pattern', confidence: 0.5 },
      ],
      predominantMiasm: 'Psora',
      miasmRationale: 'Functional disturbances with anxiety and general symptoms suggest predominant Psoric miasm',
      miasmConfidence: 0.65,
      redFlags: [],
      overallConfidence: 0.7,
      modelVersion: 'mock-v1',
      summary: `Preliminary analysis of ${caseData.caseNumber}. Patient presents with ${caseData.chiefComplaint?.substring(0, 100) || 'unspecified complaint'}. Further evaluation by qualified homoeopathic practitioner recommended.`,
    };
  }

  /**
   * Doctor-initiated, internal AI draft. Generates an AiReport to assist the
   * assigned doctor while writing their expert report. Unlike processCase()
   * this does NOT change the case status — the doctor flow owns the status.
   */
  async generateForDoctor(caseId: string, doctorId: string) {
    const caseData = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        documents: true,
        specialities: { include: { speciality: true } },
        patient: { select: { name: true, age: true, gender: true } },
      },
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }
    if (caseData.assignedDoctorId !== doctorId) {
      throw new ForbiddenException('Case not assigned to you');
    }

    const startTime = Date.now();
    const prompt = this.buildPrompt(caseData);

    let aiResponse: any;
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'your-openai-api-key') {
      aiResponse = await this.callOpenAI(prompt);
    } else {
      this.logger.warn('No OpenAI API key configured. Generating mock AI draft.');
      aiResponse = this.generateMockReport(caseData);
    }

    const report = await this.prisma.aiReport.create({
      data: {
        caseId,
        mentalSymptoms: aiResponse.mentalSymptoms || [],
        generalSymptoms: aiResponse.generalSymptoms || [],
        particularSymptoms: aiResponse.particularSymptoms || [],
        parsedLabValues: aiResponse.parsedLabValues || [],
        rubricSuggestions: aiResponse.rubricSuggestions || [],
        constitutionalTypes: aiResponse.constitutionalTypes || [],
        predominantMiasm: aiResponse.predominantMiasm,
        miasmRationale: aiResponse.miasmRationale,
        miasmConfidence: aiResponse.miasmConfidence,
        redFlags: aiResponse.redFlags || [],
        hasRedFlags: (aiResponse.redFlags || []).length > 0,
        overallConfidence: aiResponse.overallConfidence || 0.7,
        processingTimeMs: Date.now() - startTime,
        modelVersion: aiResponse.modelVersion || 'mock-v1',
        rawResponse: JSON.stringify(aiResponse),
      },
    });

    this.logger.log(`Doctor ${doctorId} generated AI draft for case ${caseId}`);
    return report;
  }

  /**
   * Get the latest AI report for a specific case
   */
  async getReport(caseId: string) {
    return this.prisma.aiReport.findFirst({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
