import 'dotenv/config';
import { db } from '@/lib/drizzle/db.server';
import { bibleImageVariants } from '@/lib/drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
  console.log('🔍 Checking Bible Image Variants...\n');

  const variants = await db
    .select()
    .from(bibleImageVariants)
    .orderBy(desc(bibleImageVariants.created_at))
    .limit(20);

  console.log(`Found ${variants.length} recent variants:\n`);

  for (const v of variants) {
    const hasUrl = !!v.image_url && v.image_url.length > 0;
    const isSupabaseUrl = v.image_url?.includes('supabase.co');
    const isTempUrl = v.image_url?.includes('tempfile.aiquickdraw.com');

    console.log(`ID: ${v.id.substring(0, 8)}...`);
    console.log(`  Model: ${v.model}`);
    console.log(`  Status: ${v.status}`);
    console.log(`  Shot Type: ${v.shot_type || 'N/A'}`);
    console.log(`  Has URL: ${hasUrl ? '✅' : '❌'}`);
    console.log(`  URL Type: ${isSupabaseUrl ? '✅ Supabase' : isTempUrl ? '⚠️ Temp CDN' : hasUrl ? '❓ Unknown' : '❌ None'}`);
    console.log(`  URL Preview: ${v.image_url ? v.image_url.substring(0, 60) + '...' : 'EMPTY'}`);
    console.log(`  Created: ${v.created_at?.toISOString()}`);
    console.log('');
  }

  // Check for problematic variants
  const problemVariants = variants.filter(v =>
    (v.status === 'ready' && (!v.image_url || v.image_url.length === 0)) ||
    (v.status === 'ready' && v.image_url?.includes('tempfile.aiquickdraw.com'))
  );

  if (problemVariants.length > 0) {
    console.log('\n⚠️ PROBLEM VARIANTS (ready but missing/temp URL):');
    for (const v of problemVariants) {
      console.log(`  - ${v.id} (${v.model}): ${v.image_url || 'NO URL'}`);
    }
  } else {
    console.log('\n✅ No problematic variants found!');
  }
}

main().catch(console.error).finally(() => process.exit(0));
