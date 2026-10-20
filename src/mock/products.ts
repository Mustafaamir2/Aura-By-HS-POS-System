import type { Product, ProductCategory } from '@/types';
import { makeRng } from '@/utils/random';
import { SHOP_IDS } from './shops';

const NOW = '2026-01-05T09:00:00.000Z';

interface ProductSeed {
  name: string;
  brand: string;
  category: ProductCategory;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  supplier: string;
  backBarOnly?: boolean;
  active?: boolean;
}

/**
 * The catalogue is shared, but stock is per shop — each branch gets its own
 * Product row so counts, minimums and suppliers can diverge.
 */
const catalogue: ProductSeed[] = [
  { name: 'Repair Shampoo 300ml', brand: 'Kérastase', category: 'Hair Care', costPrice: 3200, sellingPrice: 5400, unit: 'bottle', supplier: 'Beauty Depot Pvt Ltd' },
  { name: 'Repair Conditioner 250ml', brand: 'Kérastase', category: 'Hair Care', costPrice: 3400, sellingPrice: 5800, unit: 'bottle', supplier: 'Beauty Depot Pvt Ltd' },
  { name: 'Argan Hair Oil 100ml', brand: 'Moroccanoil', category: 'Hair Care', costPrice: 4100, sellingPrice: 7200, unit: 'bottle', supplier: 'Beauty Depot Pvt Ltd' },
  { name: 'Purple Toning Shampoo 250ml', brand: 'Fudge', category: 'Hair Care', costPrice: 2400, sellingPrice: 4200, unit: 'bottle', supplier: 'Glow Traders' },
  { name: 'Heat Protection Spray 200ml', brand: 'Tresemmé', category: 'Hair Care', costPrice: 950, sellingPrice: 1750, unit: 'bottle', supplier: 'Glow Traders' },
  { name: 'Hair Serum 60ml', brand: 'Schwarzkopf', category: 'Hair Care', costPrice: 1300, sellingPrice: 2400, unit: 'bottle', supplier: 'Beauty Depot Pvt Ltd' },
  { name: 'Deep Conditioning Mask 500ml', brand: 'Olaplex', category: 'Hair Care', costPrice: 6800, sellingPrice: 11500, unit: 'tub', supplier: 'Karachi Salon Supply' },
  { name: 'Dry Shampoo 150ml', brand: 'Batiste', category: 'Hair Care', costPrice: 780, sellingPrice: 1450, unit: 'can', supplier: 'Glow Traders' },

  { name: 'Vitamin C Serum 30ml', brand: 'The Ordinary', category: 'Skin Care', costPrice: 2100, sellingPrice: 3800, unit: 'bottle', supplier: 'Derma Line' },
  { name: 'Hyaluronic Moisturiser 50ml', brand: 'Neutrogena', category: 'Skin Care', costPrice: 1650, sellingPrice: 2900, unit: 'jar', supplier: 'Derma Line' },
  { name: 'SPF 50 Sunscreen 60ml', brand: 'La Roche-Posay', category: 'Skin Care', costPrice: 3400, sellingPrice: 5600, unit: 'tube', supplier: 'Derma Line' },
  { name: 'Gentle Foaming Cleanser 150ml', brand: 'Cetaphil', category: 'Skin Care', costPrice: 1400, sellingPrice: 2450, unit: 'bottle', supplier: 'Derma Line' },
  { name: 'Clay Detox Mask 100g', brand: 'Innisfree', category: 'Skin Care', costPrice: 1900, sellingPrice: 3300, unit: 'tub', supplier: 'Glow Traders' },
  { name: 'Under-Eye Gel 15ml', brand: 'Clinique', category: 'Skin Care', costPrice: 4200, sellingPrice: 7100, unit: 'tube', supplier: 'Derma Line' },

  { name: 'Gel Polish — Rosewood', brand: 'OPI', category: 'Nail Care', costPrice: 1600, sellingPrice: 2800, unit: 'bottle', supplier: 'Nail Atelier' },
  { name: 'Gel Polish — Midnight', brand: 'OPI', category: 'Nail Care', costPrice: 1600, sellingPrice: 2800, unit: 'bottle', supplier: 'Nail Atelier' },
  { name: 'Cuticle Oil 15ml', brand: 'Essie', category: 'Nail Care', costPrice: 620, sellingPrice: 1250, unit: 'bottle', supplier: 'Nail Atelier' },
  { name: 'Nail Strengthener 14ml', brand: 'Sally Hansen', category: 'Nail Care', costPrice: 980, sellingPrice: 1850, unit: 'bottle', supplier: 'Nail Atelier' },
  { name: 'Top Coat 15ml', brand: 'Essie', category: 'Nail Care', costPrice: 850, sellingPrice: 1600, unit: 'bottle', supplier: 'Nail Atelier' },

  { name: 'Ceramic Hair Straightener', brand: 'GHD', category: 'Styling Tools', costPrice: 28000, sellingPrice: 42000, unit: 'piece', supplier: 'Karachi Salon Supply' },
  { name: 'Ionic Hair Dryer 2200W', brand: 'Philips', category: 'Styling Tools', costPrice: 11500, sellingPrice: 17500, unit: 'piece', supplier: 'Karachi Salon Supply' },
  { name: 'Wide Tooth Detangling Comb', brand: 'Tangle Teezer', category: 'Styling Tools', costPrice: 900, sellingPrice: 1800, unit: 'piece', supplier: 'Glow Traders' },
  { name: 'Round Blow Dry Brush 53mm', brand: 'Denman', category: 'Styling Tools', costPrice: 1700, sellingPrice: 3100, unit: 'piece', supplier: 'Glow Traders' },

  { name: 'Ammonia-Free Colour — Natural Black', brand: 'Wella', category: 'Colour & Chemicals', costPrice: 1450, sellingPrice: 2600, unit: 'tube', supplier: 'Beauty Depot Pvt Ltd', backBarOnly: true },
  { name: 'Ammonia-Free Colour — Chocolate Brown', brand: 'Wella', category: 'Colour & Chemicals', costPrice: 1450, sellingPrice: 2600, unit: 'tube', supplier: 'Beauty Depot Pvt Ltd', backBarOnly: true },
  { name: 'Developer 20 Vol 1L', brand: 'Wella', category: 'Colour & Chemicals', costPrice: 1800, sellingPrice: 3000, unit: 'bottle', supplier: 'Beauty Depot Pvt Ltd', backBarOnly: true },
  { name: 'Bleach Powder 500g', brand: 'Schwarzkopf', category: 'Colour & Chemicals', costPrice: 3600, sellingPrice: 5900, unit: 'tub', supplier: 'Beauty Depot Pvt Ltd', backBarOnly: true },
  { name: 'Keratin Treatment Solution 1L', brand: 'Brazilian Blowout', category: 'Colour & Chemicals', costPrice: 24000, sellingPrice: 36000, unit: 'bottle', supplier: 'Karachi Salon Supply', backBarOnly: true },

  { name: 'Rica Wax Brazilian 800ml', brand: 'Rica', category: 'Consumables', costPrice: 2600, sellingPrice: 4200, unit: 'tin', supplier: 'Glow Traders', backBarOnly: true },
  { name: 'Waxing Strips (pack of 100)', brand: 'Generic', category: 'Consumables', costPrice: 450, sellingPrice: 850, unit: 'pack', supplier: 'Glow Traders', backBarOnly: true },
  { name: 'Disposable Towels (pack of 50)', brand: 'Generic', category: 'Consumables', costPrice: 700, sellingPrice: 1200, unit: 'pack', supplier: 'Glow Traders', backBarOnly: true },
  { name: 'Nitrile Gloves (box of 100)', brand: 'Generic', category: 'Consumables', costPrice: 1100, sellingPrice: 1900, unit: 'box', supplier: 'Karachi Salon Supply', backBarOnly: true },
  { name: 'Cotton Pads (pack of 200)', brand: 'Generic', category: 'Consumables', costPrice: 320, sellingPrice: 650, unit: 'pack', supplier: 'Glow Traders', backBarOnly: true },
  { name: 'Foil Roll 100m', brand: 'Generic', category: 'Consumables', costPrice: 900, sellingPrice: 1500, unit: 'roll', supplier: 'Beauty Depot Pvt Ltd', backBarOnly: true, active: false },
];

/**
 * Seeded so the demo opens with a believable mix: mostly healthy stock, a
 * handful low, one or two out — enough to make the alerts panel meaningful.
 */
export function buildProducts(): Product[] {
  const rng = makeRng(4711);
  const rows: Product[] = [];
  let n = 0;

  for (const shopId of [SHOP_IDS.gulberg, SHOP_IDS.dha, SHOP_IDS.clifton]) {
    const shopIndex = [SHOP_IDS.gulberg, SHOP_IDS.dha, SHOP_IDS.clifton].indexOf(shopId);
    for (const seed of catalogue) {
      n += 1;
      const minStock = seed.category === 'Styling Tools' ? 2 : rng.int(4, 10);
      // 8% out of stock, 17% low, rest comfortable.
      const roll = rng.next();
      let stock: number;
      if (roll < 0.08) stock = 0;
      else if (roll < 0.25) stock = rng.int(1, minStock);
      else stock = minStock + rng.int(4, 30);

      rows.push({
        id: `prd_${String(n).padStart(4, '0')}`,
        shopId,
        createdAt: NOW,
        updatedAt: NOW,
        name: seed.name,
        brand: seed.brand,
        category: seed.category,
        sku: `${['LMG', 'LMD', 'LMC'][shopIndex]}-${String(n).padStart(4, '0')}`,
        imageUrl: null,
        costPrice: seed.costPrice,
        sellingPrice: seed.sellingPrice,
        stock,
        minStock,
        unit: seed.unit,
        supplier: seed.supplier,
        backBarOnly: seed.backBarOnly ?? false,
        active: seed.active ?? true,
      });
    }
  }

  return rows;
}
