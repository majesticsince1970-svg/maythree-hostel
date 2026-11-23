const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mztdwkmyedspmohsohzk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WhxDgzaLo4ZWmZzJIZPOHw_IurgT9eP';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const USERS_TO_SEED = [
  {
    user_id: '6fb5cf6c-cef0-4864-8f08-20d3825273e1',
    name: 'System Admin',
    role: 'admin',
    email: 'admin@maythree.com',
    username: 'admin',
    password: 'admin123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'staff-1794661590764',
    name: 'Hadi',
    role: 'admin',
    email: 'hadimajestic@gmail.com',
    username: 'hadi',
    password: 'admin123',
    created_at: '2026-11-14T13:21:33Z'
  },
  {
    user_id: 'demo-admin-1',
    name: 'Admin User',
    role: 'admin',
    email: 'admin@mythreehostels.com',
    username: 'admin_demo',
    password: 'admin123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-staff-1',
    name: 'Staff User',
    role: 'staff',
    email: 'staff@maythree.com',
    username: 'staff',
    password: 'staff123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-staff-2',
    name: 'Staff User (Hostels)',
    role: 'staff',
    email: 'staff@mythreehostels.com',
    username: 'staff_demo',
    password: 'staff123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-store-1',
    name: 'Store Staff',
    role: 'store_staff',
    email: 'store@maythree.com',
    username: 'store',
    password: 'store123',
    created_at: '2026-10-31T14:30:59Z'
  },
  {
    user_id: 'demo-store-2',
    name: 'Store Staff (Hostels)',
    role: 'store_staff',
    email: 'store@mythreehostels.com',
    username: 'store_demo',
    password: 'store123',
    created_at: '2026-10-31T14:30:59Z'
  }
];

async function seed() {
  console.log('Authenticating with Supabase...');
  const { data: auth, error: authErr } = await client.auth.signInWithPassword({
    email: 'admin@maythree.com',
    password: 'admin123'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    process.exit(1);
  }

  console.log('Seeding users into audit_log table_name="app_users"...');
  for (const user of USERS_TO_SEED) {
    const { error: insErr } = await client.from('audit_log').insert({
      action: 'USER_SYNC',
      table_name: 'app_users',
      new_values: user
    });
    if (insErr) {
      console.error(`Error saving user ${user.username}:`, insErr);
    } else {
      console.log(`Saved user: ${user.name} (${user.username} / ${user.email}) [${user.role}]`);
    }
  }

  // Also verify fetch
  const { data: fetched, error: fErr } = await client
    .from('audit_log')
    .select('*')
    .eq('table_name', 'app_users')
    .order('performed_at', { ascending: false });

  console.log('\nFetched app_users count from Supabase:', fetched?.length);
  if (fetched) {
    for (const row of fetched) {
      console.log(' -', row.new_values?.username, row.new_values?.email, row.new_values?.name);
    }
  }
}

seed();
