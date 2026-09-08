import { prisma } from '../config/database';
import { ApiError } from '../utils/response';

/** GET /api/farmers/:id — profile in the shape the frontend store expects. */
export async function getFarmerProfile(id: string) {
  const farmer = await prisma.farmer.findUnique({
    where: { id },
    include: { user: true, primaryCrop: true },
  });
  if (!farmer) throw ApiError.notFound('Farmer not found');

  return {
    id: farmer.id,
    userId: farmer.userId,
    name: farmer.user.name,
    mobile: farmer.user.mobile,
    email: farmer.user.email,
    village: farmer.village,
    location: farmer.location,
    addressLine: farmer.addressLine,
    city: farmer.city,
    district: farmer.district ?? farmer.location.split(',').pop()?.trim() ?? 'Jaipur',
    state: farmer.state ?? 'Rajasthan',
    pincode: farmer.pincode,
    latitude: farmer.latitude,
    longitude: farmer.longitude,
    hasAddress: farmer.latitude != null && farmer.longitude != null,
    language: farmer.preferredLanguage,
    crop: farmer.primaryCrop?.name ?? null,
    cropId: farmer.primaryCropId,
    quantity: farmer.approxQuantity,
    registeredOn: farmer.createdAt,
  };
}

const FARMER_KEYS = [
  'village',
  'location',
  'preferredLanguage',
  'primaryCropId',
  'approxQuantity',
  'addressLine',
  'city',
  'district',
  'state',
  'pincode',
  'latitude',
  'longitude',
] as const;

export async function updateFarmerProfile(
  id: string,
  patch: Record<string, unknown> & { name?: string; mobile?: string },
) {
  const farmer = await prisma.farmer.findUnique({ where: { id }, include: { user: true } });
  if (!farmer) throw ApiError.notFound('Farmer not found');

  const farmerData: Record<string, unknown> = {};
  for (const k of FARMER_KEYS) if (k in patch && patch[k] !== undefined) farmerData[k] = patch[k];

  await prisma.$transaction(async (tx) => {
    if (Object.keys(farmerData).length) await tx.farmer.update({ where: { id }, data: farmerData });

    const userData: Record<string, unknown> = {};
    if (patch.name) userData.name = patch.name;
    if (patch.mobile && patch.mobile !== farmer.user.mobile) {
      const dupe = await tx.user.findUnique({ where: { mobile: patch.mobile } });
      if (dupe && dupe.id !== farmer.userId) throw ApiError.conflict('That mobile number is already in use');
      userData.mobile = patch.mobile;
    }
    if (patch.preferredLanguage) userData.language = patch.preferredLanguage;
    if (Object.keys(userData).length) await tx.user.update({ where: { id: farmer.userId }, data: userData });
  });

  return getFarmerProfile(id);
}

/** Farmer procurement history (for the "My History" screen). */
export async function getFarmerHistory(id: string) {
  const procurements = await prisma.procurement.findMany({
    where: { farmerId: id },
    orderBy: { createdAt: 'desc' },
    include: { crop: true, center: true, payment: true },
  });

  return procurements.map((p) => ({
    id: p.id,
    date: p.createdAt,
    crop: p.crop.name,
    quantity: p.actualQuantity ?? p.declaredQuantity,
    center: p.center.name,
    status: p.status === 'COMPLETED' ? 'Completed' : 'In progress',
    amount: p.totalAmount ? `₹${p.totalAmount.toLocaleString('en-IN')}` : undefined,
    paymentStatus: p.payment?.status ?? null,
  }));
}

/** GET /api/centers/:id/farmers — farmers booked at a centre (officer view). */
export async function listCenterFarmers(centerId: string) {
  const tokens = await prisma.token.findMany({
    where: { centerId, status: { in: ['BOOKED', 'WAITING', 'SERVING', 'COMPLETED'] } },
    orderBy: { createdAt: 'desc' },
    include: { farmer: { include: { user: true } }, crop: true },
  });

  const seen = new Set<string>();
  const rows: {
    farmerId: string;
    name: string;
    village: string;
    mobile: string;
    crop: string;
    quantity: number;
    tokenNumber: string;
    tokenStatus: string;
  }[] = [];

  for (const t of tokens) {
    const key = `${t.farmerId}:${t.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      farmerId: t.farmer.id,
      name: t.farmer.user.name,
      village: t.farmer.village,
      mobile: t.farmer.user.mobile,
      crop: t.crop.name,
      quantity: t.quantity,
      tokenNumber: t.tokenNumber,
      tokenStatus: t.status,
    });
  }
  return rows;
}

export async function listAllFarmers() {
  const farmers = await prisma.farmer.findMany({
    orderBy: { createdAt: 'asc' },
    include: { user: true, primaryCrop: true },
  });
  return farmers.map((f) => ({
    id: f.id,
    name: f.user.name,
    mobile: f.user.mobile,
    village: f.village,
    district: f.location.split(',').pop()?.trim() ?? f.location,
    crop: f.primaryCrop?.name ?? 'Other',
    quantity: f.approxQuantity,
    language: f.preferredLanguage,
    registeredOn: f.createdAt,
  }));
}
