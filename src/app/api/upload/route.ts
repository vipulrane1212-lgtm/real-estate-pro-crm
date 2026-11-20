import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Verify session via local cookie or Supabase
    let userId: string | null = null;
    const localSession = await getSession();
    if (localSession?.userId) {
      userId = localSession.userId;
    } else {
      try {
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch {
        // fallback
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'company-assets';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedBuckets = [
      'company-assets',
      'documents',
      'property-photos',
      'call-recordings',
      'attendance',
      'expenses',
    ];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid storage bucket target' }, { status: 400 });
    }

    // Generate unique sanitized filename
    const fileExt = file.name.split('.').pop() || 'dat';
    const timestamp = Date.now();
    const safeBaseName = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const cleanFileName = `${userId}/${safeBaseName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try Supabase Storage first if configured
    let uploadedViaSupabase = false;
    let publicUrl: string | null = null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.includes('placeholder') && !supabaseUrl.includes('localhost:54321')) {
      try {
        const adminSupabase = createAdminClient();
        const { error: uploadError } = await adminSupabase.storage
          .from(bucket)
          .upload(cleanFileName, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!uploadError) {
          uploadedViaSupabase = true;
          if (bucket === 'company-assets' || bucket === 'property-photos') {
            const { data: urlData } = adminSupabase.storage
              .from(bucket)
              .getPublicUrl(cleanFileName);
            publicUrl = urlData.publicUrl;
          }
        }
      } catch (sbErr) {
        console.warn('Supabase upload skipped or failed, falling back to local filesystem:', sbErr);
      }
    }

    // Local filesystem storage fallback
    if (!uploadedViaSupabase) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', bucket, userId);
      await fs.mkdir(uploadDir, { recursive: true });
      const localFilePath = path.join(uploadDir, safeBaseName);
      await fs.writeFile(localFilePath, buffer);
      publicUrl = `/uploads/${bucket}/${userId}/${safeBaseName}`;
    }

    return NextResponse.json({
      success: true,
      bucket,
      filePath: cleanFileName,
      publicUrl: publicUrl || `/uploads/${bucket}/${cleanFileName}`,
    });
  } catch (err: unknown) {
    console.error('Upload API error:', err);
    return NextResponse.json(
      { error: 'An unexpected upload failure occurred' },
      { status: 500 }
    );
  }
}
