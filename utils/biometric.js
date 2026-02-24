import bcrypt from 'bcrypt';

export async function hashBiometric(raw) {
  return await bcrypt.hash(raw, 10); 
}

export async function compareBiometric(raw, hash) {
  try {
    if (!raw || !hash) { console.error('Biometric compare error: Missing parameters'); return false;}
    return await bcrypt.compare(raw, hash);
  } catch (err) {
    console.error('Biometric compare error:', err);
    return false;
  }
}
    

