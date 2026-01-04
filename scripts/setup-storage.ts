import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   - SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface BucketConfig {
  name: string;
  public: boolean;
  fileSizeLimit?: number;
  allowedMimeTypes?: string[];
}

const buckets: BucketConfig[] = [
  {
    name: "pdfs",
    public: true, // Public for demo mode
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["application/pdf"],
  },
  {
    name: "images",
    public: false, // Private with signed URLs
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: "videos",
    public: false, // Private with signed URLs
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ["video/mp4", "video/webm"],
  },
  {
    name: "audio",
    public: false, // Private with signed URLs
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/webm"],
  },
  {
    name: "reels",
    public: true, // Public read for shareable previews
    fileSizeLimit: 200 * 1024 * 1024, // 200MB
    allowedMimeTypes: ["video/mp4"],
  },
  // Bible asset uploads (user-uploaded reference images)
  {
    name: "bible-characters-uploads",
    public: true, // Public for easy access
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: "bible-locations-uploads",
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    name: "bible-props-uploads",
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  // Scene images (generated AI images for scenes)
  {
    name: "scene-images",
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
];

async function setupStorage(): Promise<void> {
  console.log("🚀 Setting up Supabase Storage buckets...\n");

  for (const bucketConfig of buckets) {
    try {
      // Check if bucket exists
      const { data: existingBucket } = await supabase.storage.getBucket(
        bucketConfig.name
      );

      if (existingBucket) {
        console.log(`✅ Bucket "${bucketConfig.name}" already exists`);
        continue;
      }

      // Create bucket
      const { error } = await supabase.storage.createBucket(
        bucketConfig.name,
        {
          public: bucketConfig.public,
          fileSizeLimit: bucketConfig.fileSizeLimit,
          allowedMimeTypes: bucketConfig.allowedMimeTypes,
        }
      );

      if (error) {
        console.error(`❌ Failed to create bucket "${bucketConfig.name}":`, error.message);
        continue;
      }

      console.log(`✅ Created bucket "${bucketConfig.name}" (${bucketConfig.public ? "public" : "private"})`);
    } catch (error) {
      console.error(`❌ Error processing bucket "${bucketConfig.name}":`, error);
    }
  }

  console.log("\n✅ Storage setup complete!");
  console.log("\n📋 Bucket Configuration Summary:");
  console.log("==================================================");
  buckets.forEach((bucket) => {
    console.log(`\n📦 ${bucket.name}:`);
    console.log(`   - Access: ${bucket.public ? "Public" : "Private"}`);
    console.log(`   - Max Size: ${(bucket.fileSizeLimit! / 1024 / 1024).toFixed(0)}MB`);
    console.log(`   - Allowed Types: ${bucket.allowedMimeTypes?.join(", ") || "all"}`);
  });
}

setupStorage().catch((error) => {
  console.error("❌ Storage setup failed:", error);
  process.exit(1);
});
