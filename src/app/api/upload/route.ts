import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'company-assets';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedBuckets = ['company-assets', 'documents', 'property-photos', 'call-recordings'];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid storage bucket target' }, { status: 400 });
    }

    // Generate unique sanitized filename
    const fileExt = file.name.split('.').pop() || 'dat';
    const timestamp = Date.now();
    const cleanFileName = `${user.id}/${timestamp}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const adminSupabase = createAdminClient();

    const { error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(cleanFileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // For company-assets (public), get public URL; for private buckets return file path
    let publicUrl: string | null = null;
    if (bucket === 'company-assets') {
      const { data: urlData } = adminSupabase.storage
        .from(bucket)
        .getPublicUrl(cleanFileName);
      publicUrl = urlData.publicUrl;
    }

    return NextResponse.json({
      success: true,
      bucket,
      filePath: cleanFileName,
      publicUrl: publicUrl || `/api/storage/${bucket}/${cleanFileName}`,
    });
  } catch (err: unknown) {
    console.error('Upload API error:', err);
    return NextResponse.json(
      { error: 'An unexpected upload failure occurred' },
      { status: 500 }
    );
  }
}
