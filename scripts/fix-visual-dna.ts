/**
 * One-time script to clean up visual_dna fields
 * Removes shot framing text like "Extreme close-up portrait" from visual_dna
 * Run with: npx tsx scripts/fix-visual-dna.ts
 */

import { db } from '@/lib/drizzle/db.server';
import { projectCharacters } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';

async function fixVisualDna() {
  console.log('🔧 Starting visual_dna cleanup...\n');

  // Fetch all characters
  const characters = await db.select().from(projectCharacters);

  console.log(`📊 Found ${characters.length} characters\n`);

  let updatedCount = 0;

  for (const character of characters) {
    const originalVisualDna = character.visual_dna;

    // Remove common shot framing phrases
    let cleanedVisualDna = originalVisualDna
      .replace(/Extreme close-up portrait,?\s*/gi, '')
      .replace(/Extreme close-up,?\s*/gi, '')
      .replace(/Close-up portrait,?\s*/gi, '')
      .replace(/Portrait shot,?\s*/gi, '')
      .replace(/Three-quarter view,?\s*/gi, '')
      .replace(/Medium shot,?\s*/gi, '')
      .replace(/Full body shot,?\s*/gi, '')
      .replace(/Wide shot,?\s*/gi, '')
      .replace(/Head to toe,?\s*/gi, '')
      .replace(/Professional headshot style,?\s*/gi, '')
      .replace(/showing upper body and posture,?\s*/gi, '')
      .replace(/showing complete silhouette,?\s*/gi, '')
      .replace(/45-degree angle,?\s*/gi, '')
      .replace(/waist up,?\s*/gi, '')
      .trim();

    // Remove leading comma if present
    cleanedVisualDna = cleanedVisualDna.replace(/^,\s*/, '');

    if (cleanedVisualDna !== originalVisualDna) {
      console.log(`🔄 Updating character: ${character.name}`);
      console.log(`   Before: ${originalVisualDna.substring(0, 100)}...`);
      console.log(`   After:  ${cleanedVisualDna.substring(0, 100)}...\n`);

      await db
        .update(projectCharacters)
        .set({ visual_dna: cleanedVisualDna, updated_at: new Date() })
        .where(eq(projectCharacters.id, character.id));

      updatedCount++;
    } else {
      console.log(`✅ Character OK: ${character.name} (no changes needed)\n`);
    }
  }

  console.log(`\n✅ Cleanup complete! Updated ${updatedCount} of ${characters.length} characters`);
}

// Run the script
fixVisualDna()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
