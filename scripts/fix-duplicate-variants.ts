/**
 * Script to fix duplicate selected variants
 * Run with: npx tsx scripts/fix-duplicate-variants.ts
 */

import { db } from '../lib/drizzle/db';
import { bibleImageVariants } from '../lib/drizzle/schema';
import { eq, desc } from 'drizzle-orm';

async function fixDuplicates(): Promise<void> {
  console.log('🔍 Searching for duplicate selected variants...\n');

  // Get all selected variants
  const selectedVariants = await db
    .select()
    .from(bibleImageVariants)
    .where(eq(bibleImageVariants.is_selected, true))
    .orderBy(desc(bibleImageVariants.updated_at));

  console.log(`Found ${selectedVariants.length} selected variants total\n`);

  // Group by asset_type + asset_id + shot_type
  const groups = new Map<string, typeof selectedVariants>();

  for (const variant of selectedVariants) {
    const key = `${variant.asset_type}|${variant.asset_id}|${variant.shot_type || 'null'}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(variant);
  }

  // Find groups with duplicates
  let fixedCount = 0;
  for (const [key, variants] of groups) {
    if (variants.length > 1) {
      const [assetType, assetId, shotType] = key.split('|');
      console.log(`⚠️ Duplicate found: ${assetType} ${assetId} (${shotType})`);
      console.log(`   ${variants.length} variants selected`);

      // Keep the first one (most recently updated due to ordering), deselect the rest
      const keepVariant = variants[0];
      const deselectVariants = variants.slice(1);

      console.log(`   ✅ Keeping: ${keepVariant.id} (${keepVariant.model})`);

      for (const variant of deselectVariants) {
        console.log(`   ❌ Deselecting: ${variant.id} (${variant.model})`);
        await db
          .update(bibleImageVariants)
          .set({ is_selected: false, status: 'ready', updated_at: new Date() })
          .where(eq(bibleImageVariants.id, variant.id));
        fixedCount++;
      }
      console.log('');
    }
  }

  if (fixedCount === 0) {
    console.log('✅ No duplicate selections found!');
  } else {
    console.log(`🎉 Fixed ${fixedCount} duplicate selections!`);
  }
}

fixDuplicates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
