/**
 * Supabase Storage Bucket Creation Script
 * This script creates all necessary storage buckets with proper configuration
 * 
 * Usage:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. or use this directly in your Next.js server actions or admin panel
 * 
 * Note: This requires Supabase Admin API key or proper authentication
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://dvxgytiknttrrotqairdjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2eGd5dGlrbnR0cm90cWFpcmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4ODgzMTksImV4cCI6MjA4NTQ2NDMxOX0.WwhxdeLP-yoc-zXbcUIdZcEmt3-WyJZHDhV2irI8ul0';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2eGd5dGlrbnR0cm90cWFpcmRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg4ODMxOSwiZXhwIjoyMDg1NDY0MzE5fQ.B4KMnclpbqL5QWSTyfp0MiI8JBYtsb92G07Q9zh5Hlc'; // Replace with your service role key

// Bucket definitions
const BUCKETS = [
    {
        name: 'avatars',
        public: true,
        description: 'User profile avatars'
    },
    {
        name: 'products',
        public: true,
        description: 'Product icons and images'
    },
    {
        name: 'banners',
        public: true,
        description: 'Homepage and category banners'
    },
    {
        name: 'payment-methods',
        public: true,
        description: 'Payment method logos'
    },
    {
        name: 'receipts',
        public: false,
        description: 'Deposit verification receipts'
    },
    {
        name: 'admin-documents',
        public: false,
        description: 'Admin reports and documents'
    },
    {
        name: 'gaming-assets',
        public: true,
        description: 'Game icons and promotional assets'
    }
];

/**
 * Create storage buckets in Supabase
 * Note: You need Service Role Key for bucket creation
 */
async function createStorageBuckets() {
    try {
        // Use service role key for bucket management
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log('Starting storage bucket creation...\n');

        for (const bucket of BUCKETS) {
            try {
                // Create bucket
                const { data, error } = await supabase
                    .storage
                    .createBucket(bucket.name, {
                        public: bucket.public,
                        fileSizeLimit: getMaxFileSizeForBucket(bucket.name),
                        allowedMimeTypes: getAllowedMimeTypesForBucket(bucket.name)
                    });

                if (error && error.message !== 'Bucket already exists') {
                    console.error(`❌ Error creating bucket '${bucket.name}':`, error.message);
                } else if (error && error.message === 'Bucket already exists') {
                    console.log(`⚠️  Bucket '${bucket.name}' already exists`);
                } else {
                    console.log(`✅ Created bucket: ${bucket.name} (Public: ${bucket.public})`);
                }
            } catch (err) {
                console.error(`❌ Exception creating bucket '${bucket.name}':`, err.message);
            }
        }

        console.log('\n✅ Storage bucket creation completed!');
        console.log('\nNext steps:');
        console.log('1. Run the SQL setup: supabase/storage-setup.sql');
        console.log('2. Configure CORS policies in Supabase dashboard if needed');
        console.log('3. Update your application to use the storage buckets');

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

/**
 * Set up storage bucket policies (via SQL is preferred, but here's the API version)
 */
async function setupBucketPolicies() {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log('\nSetting up storage policies...\n');

        // For each public bucket, make everything public
        for (const bucket of BUCKETS.filter(b => b.public)) {
            try {
                // This is typically done via RLS policies in SQL
                // The REST endpoint version may have limitations
                console.log(`⚠️  Configure public access for '${bucket.name}' in Supabase Dashboard`);
            } catch (err) {
                console.error(`Error setting policy for ${bucket.name}:`, err.message);
            }
        }

    } catch (error) {
        console.error('Error setting up policies:', error);
    }
}

/**
 * Helper function to get max file size for bucket
 */
function getMaxFileSizeForBucket(bucketName) {
    const sizes = {
        'avatars': 2 * 1024 * 1024,        // 2MB
        'products': 2 * 1024 * 1024,       // 2MB
        'banners': 5 * 1024 * 1024,        // 5MB
        'payment-methods': 1 * 1024 * 1024, // 1MB
        'receipts': 10 * 1024 * 1024,      // 10MB
        'admin-documents': 50 * 1024 * 1024, // 50MB
        'gaming-assets': 5 * 1024 * 1024   // 5MB
    };
    return sizes[bucketName] || 5 * 1024 * 1024; // Default 5MB
}

/**
 * Helper function to get allowed mime types for bucket
 */
function getAllowedMimeTypesForBucket(bucketName) {
    const mimeTypes = {
        'avatars': ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        'products': ['image/jpeg', 'image/png', 'image/webp'],
        'banners': ['image/jpeg', 'image/png', 'image/webp'],
        'payment-methods': ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        'receipts': ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        'admin-documents': ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
        'gaming-assets': ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    };
    return mimeTypes[bucketName] || ['image/jpeg', 'image/png', 'image/webp'];
}

/**
 * Verify buckets are created
 */
async function verifyBuckets() {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        console.log('\nVerifying storage buckets...\n');

        const { data: buckets, error } = await supabase
            .storage
            .listBuckets();

        if (error) {
            console.error('Error listing buckets:', error.message);
            return;
        }

        const existingBuckets = buckets.map(b => b.name);
        console.log(`Found ${existingBuckets.length} buckets:`);
        
        for (const bucket of BUCKETS) {
            if (existingBuckets.includes(bucket.name)) {
                console.log(`✅ ${bucket.name}`);
            } else {
                console.log(`❌ ${bucket.name} - NOT FOUND`);
            }
        }

    } catch (error) {
        console.error('Error verifying buckets:', error);
    }
}

// Export for use in other modules
module.exports = {
    createStorageBuckets,
    setupBucketPolicies,
    verifyBuckets,
    BUCKETS
};

// Run if executed directly
if (require.main === module) {
    (async () => {
        await createStorageBuckets();
        await verifyBuckets();
    })();
}
