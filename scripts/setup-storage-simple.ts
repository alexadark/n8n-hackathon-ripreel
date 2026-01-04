import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupRemainingBuckets(): Promise<void> {
  console.log("🚀 Creating remaining storage buckets...\n");

  // Create screenplays bucket (for PDF and text uploads)
  try {
    const { error: screenplaysError } = await supabase.storage.createBucket("screenplays", {
      public: false,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ["application/pdf", "text/plain"],
    });

    if (screenplaysError) {
      if (screenplaysError.message.includes("already exists")) {
        console.log(`ℹ️  Bucket "screenplays" already exists`);
      } else {
        console.error(`❌ Failed to create screenplays bucket:`, screenplaysError.message);
      }
    } else {
      console.log(`✅ Created bucket "screenplays" (private, 50MB limit)`);
    }
  } catch (error) {
    console.error(`❌ Error creating screenplays bucket:`, error);
  }

  // Create videos bucket (simplified config)
  try {
    const { error: videoError } = await supabase.storage.createBucket("videos", {
      public: false,
    });

    if (videoError) {
      if (videoError.message.includes("already exists")) {
        console.log(`ℹ️  Bucket "videos" already exists`);
      } else {
        console.error(`❌ Failed to create videos bucket:`, videoError.message);
      }
    } else {
      console.log(`✅ Created bucket "videos" (private)`);
    }
  } catch (error) {
    console.error(`❌ Error creating videos bucket:`, error);
  }

  // Create reels bucket (simplified config)
  try {
    const { error: reelsError } = await supabase.storage.createBucket("reels", {
      public: true,
    });

    if (reelsError) {
      if (reelsError.message.includes("already exists")) {
        console.log(`ℹ️  Bucket "reels" already exists`);
      } else {
        console.error(`❌ Failed to create reels bucket:`, reelsError.message);
      }
    } else {
      console.log(`✅ Created bucket "reels" (public)`);
    }
  } catch (error) {
    console.error(`❌ Error creating reels bucket:`, error);
  }

  console.log("\n✅ Storage setup complete!");
}

setupRemainingBuckets().catch((error) => {
  console.error("❌ Storage setup failed:", error);
  process.exit(1);
});
