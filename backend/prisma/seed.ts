import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== SPECIALITIES ====================
  const specialities = [
    { name: 'General / Constitutional', academicAlign: 'Organon & Philosophy', description: 'Chronic constitutional cases, miasmatic treatment' },
    { name: 'Skin & Dermatology', academicAlign: 'Practice of Medicine', description: 'Eczema, psoriasis, urticaria, warts, acne' },
    { name: 'Paediatrics', academicAlign: 'MD Paediatrics', description: 'Childhood asthma, behavioural issues, ADHD, growth concerns' },
    { name: 'Mental Health / Psychiatry', academicAlign: 'MD Psychiatry', description: 'Anxiety, depression, OCD, insomnia, phobias' },
    { name: "Women's Health / Gynaecology", academicAlign: 'Practice of Medicine', description: 'PCOS, menstrual disorders, menopause, infertility support' },
    { name: 'Respiratory', academicAlign: 'Practice of Medicine', description: 'Allergic rhinitis, asthma, recurrent sinusitis, bronchitis' },
    { name: 'Gastroenterology', academicAlign: 'Practice of Medicine', description: 'IBS, acid reflux, chronic constipation, liver disorders' },
    { name: 'Musculoskeletal / Rheumatology', academicAlign: 'Practice of Medicine', description: 'Arthritis, spondylitis, sciatica, fibromyalgia' },
    { name: 'Autoimmune Disorders', academicAlign: 'Practice of Medicine', description: 'Thyroid disorders, lupus, vitiligo' },
    { name: 'Oncology Support', academicAlign: 'Practice of Medicine', description: 'Supportive/palliative care alongside conventional treatment' },
  ];

  for (const spec of specialities) {
    await prisma.speciality.upsert({
      where: { name: spec.name },
      update: {},
      create: spec,
    });
  }
  console.log(`✅ Seeded ${specialities.length} specialities`);

  // ==================== ADMIN USER ====================
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  await prisma.admin.upsert({
    where: { email: 'admin@homeopinion.com' },
    update: {},
    create: {
      email: 'admin@homeopinion.com',
      name: 'Super Admin',
      passwordHash: adminPasswordHash,
      mfaEnabled: false,
    },
  });
  console.log('✅ Seeded admin user (admin@homeopinion.com / admin123)');

  // ==================== SAMPLE DOCTOR ====================
  const doctorPasswordHash = await bcrypt.hash('doctor123', 12);
  const doctor = await prisma.doctor.upsert({
    where: { email: 'dr.sharma@homeopinion.com' },
    update: {},
    create: {
      email: 'dr.sharma@homeopinion.com',
      name: 'Dr. Rajesh Sharma',
      passwordHash: doctorPasswordHash,
      cchRegistrationNo: 'CCH-MH-12345',
      qualifications: 'BHMS, MD(Hom.) - Practice of Medicine',
      prescribingApproach: 'classical',
      experienceYears: 15,
      languages: ['English', 'Hindi', 'Marathi'],
      consultationModes: ['online', 'offline'],
      clinicAddress: '204, Health Plaza, Baner Road, Pune 411045',
      initialFee: 800,
      followupFee: 500,
      status: 'approved',
      verifiedAt: new Date(),
    },
  });

  // Assign specialities to doctor
  const allSpecs = await prisma.speciality.findMany();
  const generalSpec = allSpecs.find(s => s.name.includes('General'));
  const skinSpec = allSpecs.find(s => s.name.includes('Skin'));
  const gastroSpec = allSpecs.find(s => s.name.includes('Gastro'));

  if (generalSpec) {
    await prisma.doctorSpeciality.upsert({
      where: { doctorId_specialityId: { doctorId: doctor.id, specialityId: generalSpec.id } },
      update: {},
      create: { doctorId: doctor.id, specialityId: generalSpec.id },
    });
  }
  if (skinSpec) {
    await prisma.doctorSpeciality.upsert({
      where: { doctorId_specialityId: { doctorId: doctor.id, specialityId: skinSpec.id } },
      update: {},
      create: { doctorId: doctor.id, specialityId: skinSpec.id },
    });
  }
  if (gastroSpec) {
    await prisma.doctorSpeciality.upsert({
      where: { doctorId_specialityId: { doctorId: doctor.id, specialityId: gastroSpec.id } },
      update: {},
      create: { doctorId: doctor.id, specialityId: gastroSpec.id },
    });
  }

  // Doctor availability (Mon-Fri, 10am-1pm and 4pm-7pm)
  for (let day = 1; day <= 5; day++) {
    await prisma.doctorAvailability.upsert({
      where: { id: `seed-${doctor.id}-${day}-morning` },
      update: {},
      create: {
        id: `seed-${doctor.id}-${day}-morning`,
        doctorId: doctor.id,
        dayOfWeek: day,
        startTime: '10:00',
        endTime: '13:00',
        slotDurationMin: 30,
        bufferMin: 10,
      },
    });
    await prisma.doctorAvailability.upsert({
      where: { id: `seed-${doctor.id}-${day}-evening` },
      update: {},
      create: {
        id: `seed-${doctor.id}-${day}-evening`,
        doctorId: doctor.id,
        dayOfWeek: day,
        startTime: '16:00',
        endTime: '19:00',
        slotDurationMin: 30,
        bufferMin: 10,
      },
    });
  }
  console.log('✅ Seeded sample doctor (dr.sharma@homeopinion.com / doctor123)');

  // ==================== SAMPLE PATIENT ====================
  const patient = await prisma.patient.upsert({
    where: { email: 'patient@example.com' },
    update: {},
    create: {
      email: 'patient@example.com',
      name: 'Amit Patel',
      age: 35,
      gender: 'Male',
      city: 'Mumbai',
      preferredLang: 'en',
    },
  });
  console.log('✅ Seeded sample patient (patient@example.com)');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('  Admin:   admin@homeopinion.com / admin123');
  console.log('  Doctor:  dr.sharma@homeopinion.com / doctor123');
  console.log('  Patient: patient@example.com (use OTP login - check console for OTP)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
