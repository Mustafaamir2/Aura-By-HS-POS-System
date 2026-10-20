import type { Staff, StaffRole, StaffShift, Weekday } from '@/types';
import { CATEGORY_IDS, services } from './catalog';
import { SHOP_IDS } from './shops';

const NOW = '2026-01-05T09:00:00.000Z';
const base = (id: string) => ({ id, createdAt: NOW, updatedAt: NOW });

const idsIn = (categoryId: string): string[] =>
  services.filter((s) => s.categoryId === categoryId).map((s) => s.id);

/** Qualification sets, expressed by category so they stay in step with the catalogue. */
const QUALIFIED = {
  hairAll: idsIn(CATEGORY_IDS.hair),
  hairBasic: ['svc_0001', 'svc_0002', 'svc_0003', 'svc_0004', 'svc_0010', 'svc_0011'],
  colour: ['svc_0005', 'svc_0006', 'svc_0007', 'svc_0008', 'svc_0009', 'svc_0012'],
  skin: idsIn(CATEGORY_IDS.skin),
  nails: idsIn(CATEGORY_IDS.nails),
  makeup: idsIn(CATEGORY_IDS.makeup),
  removal: idsIn(CATEGORY_IDS.removal),
};

/**
 * Build a weekly rota. `off` lists the recurring days off; Monday (1) is always
 * off because every branch is closed then.
 */
function rota(
  start: string,
  end: string,
  off: Weekday[],
  breakStart: string | null = '14:00',
  breakEnd: string | null = '14:45',
): StaffShift[] {
  const offDays = new Set<Weekday>([1, ...off]);
  return ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((weekday) => ({
    weekday,
    working: !offDays.has(weekday),
    start,
    end,
    breakStart,
    breakEnd,
  }));
}

interface StaffSeed {
  id: string;
  shopId: string;
  name: string;
  role: StaffRole;
  phone: string;
  specializations: string[];
  schedule: StaffShift[];
  commissionRate: number;
  joinedOn: string;
  timeOff?: string[];
  active?: boolean;
}

const seeds: StaffSeed[] = [
  // ---------- Gulberg ----------
  {
    id: 'stf_0001',
    shopId: SHOP_IDS.gulberg,
    name: 'Sana Tariq',
    role: 'Salon Manager',
    phone: '0301 4477120',
    specializations: [...QUALIFIED.hairBasic, ...QUALIFIED.skin],
    schedule: rota('10:00', '19:00', [0]),
    commissionRate: 0.08,
    joinedOn: '2019-03-12',
  },
  {
    id: 'stf_0002',
    shopId: SHOP_IDS.gulberg,
    name: 'Mehreen Akhtar',
    role: 'Senior Stylist',
    phone: '0321 7784510',
    specializations: [...QUALIFIED.hairAll],
    schedule: rota('10:00', '20:00', [2]),
    commissionRate: 0.15,
    joinedOn: '2019-05-20',
  },
  {
    id: 'stf_0003',
    shopId: SHOP_IDS.gulberg,
    name: 'Farah Jamil',
    role: 'Colour Specialist',
    phone: '0333 9012774',
    specializations: [...QUALIFIED.colour, 'svc_0001', 'svc_0004'],
    schedule: rota('11:00', '20:00', [3]),
    commissionRate: 0.18,
    joinedOn: '2020-01-15',
    timeOff: ['2026-09-24', '2026-09-25'],
  },
  {
    id: 'stf_0004',
    shopId: SHOP_IDS.gulberg,
    name: 'Nadia Perveen',
    role: 'Beauty Therapist',
    phone: '0345 3390118',
    specializations: [...QUALIFIED.skin, ...QUALIFIED.removal],
    schedule: rota('10:00', '19:00', [4]),
    commissionRate: 0.12,
    joinedOn: '2020-07-01',
  },
  {
    id: 'stf_0005',
    shopId: SHOP_IDS.gulberg,
    name: 'Ayesha Noor',
    role: 'Nail Technician',
    phone: '0302 5567431',
    specializations: [...QUALIFIED.nails],
    schedule: rota('11:00', '20:00', [0], '15:00', '15:30'),
    commissionRate: 0.14,
    joinedOn: '2022-02-14',
  },
  {
    id: 'stf_0006',
    shopId: SHOP_IDS.gulberg,
    name: 'Zunaira Hashmi',
    role: 'Makeup Artist',
    phone: '0311 8823064',
    specializations: [...QUALIFIED.makeup, 'svc_0004'],
    schedule: rota('12:00', '21:00', [2, 3]),
    commissionRate: 0.2,
    joinedOn: '2021-11-08',
  },

  // ---------- DHA Phase 6 ----------
  {
    id: 'stf_0007',
    shopId: SHOP_IDS.dha,
    name: 'Hina Raza',
    role: 'Salon Manager',
    phone: '0322 6690455',
    specializations: [...QUALIFIED.hairBasic, ...QUALIFIED.removal],
    schedule: rota('11:00', '19:30', [0]),
    commissionRate: 0.08,
    joinedOn: '2021-08-02',
  },
  {
    id: 'stf_0008',
    shopId: SHOP_IDS.dha,
    name: 'Rida Shahbaz',
    role: 'Senior Stylist',
    phone: '0347 1129983',
    specializations: [...QUALIFIED.hairAll],
    schedule: rota('11:00', '20:30', [4]),
    commissionRate: 0.15,
    joinedOn: '2021-09-10',
  },
  {
    id: 'stf_0009',
    shopId: SHOP_IDS.dha,
    name: 'Komal Yousaf',
    role: 'Beauty Therapist',
    phone: '0300 4471256',
    specializations: [...QUALIFIED.skin, ...QUALIFIED.removal],
    schedule: rota('11:00', '20:00', [5]),
    commissionRate: 0.12,
    joinedOn: '2022-03-21',
  },
  {
    id: 'stf_0010',
    shopId: SHOP_IDS.dha,
    name: 'Tehmina Aslam',
    role: 'Nail Technician',
    phone: '0334 7712009',
    specializations: [...QUALIFIED.nails, 'svc_0036'],
    schedule: rota('12:00', '20:30', [0], '16:00', '16:30'),
    commissionRate: 0.14,
    joinedOn: '2023-01-09',
  },
  {
    id: 'stf_0011',
    shopId: SHOP_IDS.dha,
    name: 'Sidra Baig',
    role: 'Stylist',
    phone: '0321 3308876',
    specializations: [...QUALIFIED.hairBasic, 'svc_0006'],
    schedule: rota('11:00', '20:00', [3]),
    commissionRate: 0.11,
    joinedOn: '2023-06-19',
  },

  // ---------- Clifton ----------
  {
    id: 'stf_0012',
    shopId: SHOP_IDS.clifton,
    name: 'Rabia Naseem',
    role: 'Salon Manager',
    phone: '0333 2145098',
    specializations: [...QUALIFIED.hairBasic, ...QUALIFIED.skin],
    schedule: rota('11:00', '20:00', [0]),
    commissionRate: 0.08,
    joinedOn: '2023-11-18',
  },
  {
    id: 'stf_0013',
    shopId: SHOP_IDS.clifton,
    name: 'Anum Shakeel',
    role: 'Colour Specialist',
    phone: '0345 9903321',
    specializations: [...QUALIFIED.colour, 'svc_0001', 'svc_0004', 'svc_0010'],
    schedule: rota('12:00', '21:00', [2]),
    commissionRate: 0.18,
    joinedOn: '2023-11-25',
  },
  {
    id: 'stf_0014',
    shopId: SHOP_IDS.clifton,
    name: 'Mahnoor Ali',
    role: 'Beauty Therapist',
    phone: '0302 8817740',
    specializations: [...QUALIFIED.skin, ...QUALIFIED.removal],
    schedule: rota('11:00', '20:00', [5]),
    commissionRate: 0.12,
    joinedOn: '2024-02-05',
  },
  {
    id: 'stf_0015',
    shopId: SHOP_IDS.clifton,
    name: 'Bushra Kamal',
    role: 'Makeup Artist',
    phone: '0311 2240097',
    specializations: [...QUALIFIED.makeup, 'svc_0004', 'svc_0019'],
    schedule: rota('13:00', '22:00', [2, 3]),
    commissionRate: 0.2,
    joinedOn: '2024-04-17',
  },
  {
    id: 'stf_0016',
    shopId: SHOP_IDS.clifton,
    name: 'Iqra Sohail',
    role: 'Nail Technician',
    phone: '0322 4471180',
    specializations: [...QUALIFIED.nails],
    schedule: rota('12:00', '21:00', [4], '17:00', '17:30'),
    commissionRate: 0.14,
    joinedOn: '2024-08-30',
  },
  {
    id: 'stf_0017',
    shopId: SHOP_IDS.clifton,
    name: 'Hafsa Idrees',
    role: 'Receptionist',
    phone: '0300 6672215',
    specializations: [],
    schedule: rota('11:00', '20:00', [6]),
    commissionRate: 0,
    joinedOn: '2024-09-12',
    active: false,
  },
];

export const staff: Staff[] = seeds.map((s) => ({
  ...base(s.id),
  shopId: s.shopId,
  name: s.name,
  role: s.role,
  phone: s.phone,
  email: `${s.name.toLowerCase().replace(/\s+/g, '.')}@aurabyhs.pk`,
  photoUrl: null,
  specializations: s.specializations,
  schedule: s.schedule,
  timeOff: s.timeOff ?? [],
  commissionRate: s.commissionRate,
  active: s.active ?? true,
  joinedOn: s.joinedOn,
}));

/** Staff who actually take bookings — receptionists and managers-on-desk aside. */
export const bookableStaff = staff.filter((s) => s.active && s.specializations.length > 0);
