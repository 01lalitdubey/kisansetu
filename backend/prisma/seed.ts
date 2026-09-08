import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import {
  ADMIN,
  BASE_NOTIFICATIONS,
  CENTERS,
  CROPS,
  DEFAULT_SUPPORTED_CROPS,
  DEMO_FARMER,
  DEMO_FARMER_ADDRESS,
  FARMERS,
  OFFICERS,
  SCHEDULE_SLOTS,
  TOKEN_SEED_COUNT,
  TOKEN_SEED_START,
} from './seedData';

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234';

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function predict(queueAhead: number, avg: number, counters: number): number {
  const base = (queueAhead * avg) / Math.max(1, counters);
  const congestion = queueAhead > 50 ? 1.3 : queueAhead > 25 ? 1.12 : 1;
  return Math.max(0, Math.round(base * congestion));
}

async function wipe() {
  // Child -> parent order to satisfy FKs
  await prisma.payment.deleteMany();
  await prisma.transport.deleteMany();
  await prisma.procurement.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.token.deleteMany();
  await prisma.aiPrediction.deleteMany();
  await prisma.centerRecommendation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.procurementSchedule.deleteMany();
  await prisma.officer.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.farmer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.procurementCenter.deleteMany();
  await prisma.crop.deleteMany();
}

async function main() {
  console.log('🌱 Seeding KisanSetu AI database…');
  await wipe();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- crops ---
  const crops = await Promise.all(
    CROPS.map((c) => prisma.crop.create({ data: { name: c.name, msp: c.msp } })),
  );
  const cropByName = new Map(crops.map((c) => [c.name, c]));
  const wheat = cropByName.get('Wheat')!;

  // --- centres + queues ---
  const centers = await Promise.all(
    CENTERS.map((c) =>
      prisma.procurementCenter.create({
        data: {
          name: c.name,
          location: c.location,
          latitude: c.latitude,
          longitude: c.longitude,
          capacity: c.capacity,
          currentQueue: c.currentQueue,
          farmersServed: c.farmersServed,
          activeCounters: c.activeCounters,
          averageProcessingTime: c.averageProcessingTime,
          status: c.status,
          mapX: c.mapX,
          mapY: c.mapY,
          // Phase 5 — seeded government centres are pre-approved
          isSeed: true,
          approvalStatus: 'APPROVED',
          contactNumber: '0141-2345678',
          addressLine: `${c.location} — Krishi Upaj Mandi Samiti`,
          city: c.location.split(',')[0].trim(),
          district: 'Jaipur',
          state: 'Rajasthan',
          pincode: '3020' + String(10 + (c.mapX % 90)).padStart(2, '0'),
          supportedCrops: DEFAULT_SUPPORTED_CROPS,
          queue: { create: { running: true, status: c.status === 'OVERLOADED' ? 'OVERLOADED' : 'ACTIVE' } },
        },
        include: { queue: true },
      }),
    ),
  );
  const centerByName = new Map(centers.map((c) => [c.name, c]));
  const primary = centerByName.get('Jaipur Grain Center')!;

  // --- admin ---
  await prisma.user.create({
    data: {
      name: ADMIN.name,
      mobile: ADMIN.mobile,
      email: ADMIN.email,
      passwordHash,
      role: 'ADMIN',
      language: 'en',
      admin: { create: {} },
    },
  });

  // --- officers (one per centre) ---
  for (const o of OFFICERS) {
    const center = CENTERS.find((c) => c.key === o.centerKey)!;
    const dbCenter = centerByName.get(center.name)!;
    await prisma.user.create({
      data: {
        name: o.name,
        mobile: o.mobile,
        email: o.email,
        passwordHash,
        role: 'CENTER_OFFICER',
        language: 'en',
        officer: { create: { centerId: dbCenter.id } },
      },
    });
  }

  // --- farmers ---
  const farmerRecords: { id: string; name: string }[] = [];
  for (const f of FARMERS) {
    const crop = cropByName.get(f.crop) ?? cropByName.get('Other')!;
    const user = await prisma.user.create({
      data: {
        name: f.name,
        mobile: f.mobile,
        email: f.email ?? null,
        passwordHash,
        role: 'FARMER',
        language: f.language,
        farmer: {
          create: {
            village: f.village,
            location: f.location,
            preferredLanguage: f.language,
            primaryCropId: crop.id,
            approxQuantity: f.quantity,
            ...(f.name === DEMO_FARMER.name
              ? DEMO_FARMER_ADDRESS
              : {
                  district: 'Jaipur',
                  state: 'Rajasthan',
                  city: f.village,
                }),
          },
        },
      },
      include: { farmer: true },
    });
    farmerRecords.push({ id: user.farmer!.id, name: user.name });
  }
  const demoFarmer = farmerRecords.find((f) => f.name === DEMO_FARMER.name)!;
  const otherFarmers = farmerRecords.filter((f) => f.id !== demoFarmer.id);

  // --- schedules: every centre gets today's slot list (Wheat) ---
  const scheduleByCenterAndStart = new Map<string, string>();
  for (const center of centers) {
    for (const slot of SCHEDULE_SLOTS) {
      const s = await prisma.procurementSchedule.create({
        data: {
          centerId: center.id,
          cropId: wheat.id,
          date: today(),
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxFarmers: slot.maxFarmers,
          bookedFarmers: slot.booked,
          status: slot.status,
        },
      });
      scheduleByCenterAndStart.set(`${center.id}:${slot.startTime}`, s.id);
    }
  }
  const activeScheduleId = scheduleByCenterAndStart.get(`${primary.id}:11:00`)!;

  // --- seeded live queue at the primary centre: A113 … A126 ---
  const primaryQueue = primary.queue!;
  let waiting = 0;
  for (let i = 0; i < TOKEN_SEED_COUNT; i++) {
    const tokenNumber = `A${TOKEN_SEED_START + i}`;
    const farmer = otherFarmers[i % otherFarmers.length];
    const isServing = i === 0;
    const position = i + 1;
    const estimatedWait = predict(Math.max(0, position - 1), primary.averageProcessingTime, primary.activeCounters);

    const token = await prisma.token.create({
      data: {
        tokenNumber,
        farmerId: farmer.id,
        centerId: primary.id,
        scheduleId: activeScheduleId,
        cropId: wheat.id,
        quantity: 15 + ((i * 7) % 25),
        date: today(),
        slotStart: '11:00',
        slotEnd: '11:30',
        queuePosition: position,
        estimatedWait,
        status: isServing ? 'SERVING' : 'WAITING',
      },
    });

    await prisma.queueEntry.create({
      data: {
        queueId: primaryQueue.id,
        tokenId: token.id,
        position,
        status: isServing ? 'SERVING' : 'WAITING',
        joinedAt: new Date(Date.now() - (TOKEN_SEED_COUNT - i) * 60_000),
        startedAt: isServing ? new Date() : null,
      },
    });
    if (!isServing) waiting += 1;
  }
  await prisma.queue.update({
    where: { id: primaryQueue.id },
    data: { nowServingTokenId: (await prisma.token.findFirst({ where: { centerId: primary.id, status: 'SERVING' } }))?.id ?? null },
  });
  await prisma.procurementCenter.update({
    where: { id: primary.id },
    data: { currentQueue: waiting + 1 },
  });

  // --- history for the demo farmer: two completed procurements + payments ---
  const historySchedule = scheduleByCenterAndStart.get(`${primary.id}:09:00`)!;
  const history = [
    { tokenNumber: 'A090', qty: 20, grade: 'A', days: 6 },
    { tokenNumber: 'A091', qty: 30, grade: 'A', days: 12 },
  ];
  for (const h of history) {
    const token = await prisma.token.create({
      data: {
        tokenNumber: h.tokenNumber,
        farmerId: demoFarmer.id,
        centerId: primary.id,
        scheduleId: historySchedule,
        cropId: wheat.id,
        quantity: h.qty,
        date: daysAgo(h.days),
        slotStart: '09:00',
        slotEnd: '09:30',
        queuePosition: 0,
        estimatedWait: 0,
        status: 'COMPLETED',
      },
    });
    const actual = Math.round(h.qty * 0.99 * 100) / 100;
    const total = Math.round(actual * (wheat.msp ?? 2425) * 100) / 100;
    const procurement = await prisma.procurement.create({
      data: {
        tokenId: token.id,
        farmerId: demoFarmer.id,
        centerId: primary.id,
        cropId: wheat.id,
        declaredQuantity: h.qty,
        actualQuantity: actual,
        qualityGrade: h.grade,
        msp: wheat.msp ?? 2425,
        totalAmount: total,
        status: 'COMPLETED',
      },
    });
    await prisma.payment.create({
      data: {
        kind: 'PROCUREMENT',
        procurementId: procurement.id,
        farmerId: demoFarmer.id,
        amount: total,
        status: 'PAID',
        expectedDate: daysAgo(h.days - 3),
        paidAt: daysAgo(h.days - 3),
      },
    });

    // one historical transport (DELIVERED + paid via Stripe demo) for A091
    if (h.tokenNumber === 'A091') {
      const distanceKm = 14.2;
      const transportAmount = Math.round((900 + 32 * distanceKm) * 100) / 100;
      const platformFee = Math.round(transportAmount * 0.01 * 100) / 100;
      const transport = await prisma.transport.create({
        data: {
          farmerId: demoFarmer.id,
          procurementId: procurement.id,
          centerId: primary.id,
          vehicleType: 'MEDIUM',
          pickupLocation: primary.name,
          destination: 'Bassi, Jaipur',
          distanceKm,
          estimatedCost: transportAmount,
          platformFee,
          totalCost: Math.round((transportAmount + platformFee) * 100) / 100,
          status: 'DELIVERED',
          driverName: 'Ravi Kumar',
          driverPhone: '+91 90000 11111',
        },
      });
      await prisma.payment.create({
        data: {
          kind: 'TRANSPORT',
          transportId: transport.id,
          farmerId: demoFarmer.id,
          amount: transport.totalCost,
          transportAmount,
          platformFee,
          currency: 'inr',
          status: 'PAID',
          stripeCheckoutSessionId: `cs_demo_seed_${transport.id}`,
          paidAt: daysAgo(h.days - 2),
        },
      });
    }
  }

  // --- base notifications for the demo farmer ---
  for (const n of BASE_NOTIFICATIONS) {
    await prisma.notification.create({
      data: {
        farmerId: demoFarmer.id,
        type: n.type,
        title: n.title,
        message: n.message,
        meta: n.meta,
        read: n.read,
      },
    });
  }

  console.log('✅ Seed complete');
  console.log('\nDemo logins (password for all):', DEMO_PASSWORD);
  console.log('  Farmer  : farmer@demo.com   (Rajesh)');
  console.log('  Officer : officer@demo.com  (Jaipur Grain Center)');
  console.log('  Admin   : admin@demo.com');
  console.log(`\nDemo farmer id : ${demoFarmer.id}`);
  console.log(`Primary centre : ${primary.name} (${primary.id})`);
  console.log(`Next token will be : A${TOKEN_SEED_START + TOKEN_SEED_COUNT}\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
