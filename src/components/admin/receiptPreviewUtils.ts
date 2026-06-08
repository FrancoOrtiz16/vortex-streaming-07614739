import { supabase } from '@/integrations/supabase/client';

const RECEIPTS_BUCKET = 'receipts';
const PUBLIC_RECEIPT_URL_PATTERN = /\/storage\/v1\/object\/public\/receipts\/(.+)$/;

const extractReceiptPathFromPublicUrl = (receiptUrl: string): string | null => {
  try {
    const url = new URL(receiptUrl);
    const match = url.pathname.match(PUBLIC_RECEIPT_URL_PATTERN);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

const buildReceiptPathCandidates = (receiptUrl: string, userId?: string | null) => {
  const normalized = receiptUrl.trim();
  const paths = new Set<string>();

  const addCandidate = (path?: string | null) => {
    if (!path) return;
    const trimmed = path.trim();
    if (!trimmed) return;
    paths.add(trimmed.replace(/^[\/]+/, ''));
  };

  addCandidate(normalized);
  addCandidate(normalized.replace(/^receipts[\/]+/, ''));
  if (userId) {
    addCandidate(`${userId}/${normalized}`);
    addCandidate(`${userId}/${normalized.replace(/^receipts[\/]+/, '')}`);
  }

  const publicPath = extractReceiptPathFromPublicUrl(normalized);
  if (publicPath) addCandidate(publicPath);

  return Array.from(paths);
};

const getSignedReceiptUrl = async (path: string): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
};

export const resolveReceiptPublicUrl = async (receiptUrl: string | null, userId?: string | null): Promise<string | null> => {
  if (!receiptUrl) return null;

  const normalized = receiptUrl.trim();
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    const storagePath = extractReceiptPathFromPublicUrl(normalized);
    if (storagePath) {
      const signedUrl = await getSignedReceiptUrl(storagePath);
      if (signedUrl) return signedUrl;
    }
    return normalized;
  }

  const candidates = buildReceiptPathCandidates(normalized, userId);
  for (const candidate of candidates) {
    const signedUrl = await getSignedReceiptUrl(candidate);
    if (signedUrl) return signedUrl;
  }

  return null;
};
