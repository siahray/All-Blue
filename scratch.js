const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://woxbcojmwiguzktsunnm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndveGJjb2ptd2lndXprdHN1bm5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjQyNjUsImV4cCI6MjA5Mzc0MDI2NX0.8UGLiPSymyc2malVX_8za7zxmtvWT_mLvOJmUhbly_E';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Error:', error);
  console.log('Columns:', data ? Object.keys(data[0] || {}) : 'No data');
}
check();
