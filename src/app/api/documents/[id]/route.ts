import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/api-auth';
import { query } from '@/lib/db';
import { DocumentRecord } from '@/lib/supabase/types';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Deletion allowed ONLY for administrators
    if (!auth.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can delete documents' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingRows = await query<DocumentRecord>(
      'SELECT * FROM public.documents WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = existingRows[0];

    // Remove from database (database audit trigger automatically records DELETE)
    await query('DELETE FROM public.documents WHERE id = $1', [id]);

    // Clean up local file if stored locally
    if (doc.file_url && doc.file_url.startsWith('/uploads/')) {
      try {
        const localPath = path.join(process.cwd(), 'public', doc.file_url);
        await fs.unlink(localPath);
      } catch (fileErr) {
        console.warn('Could not delete local file from disk:', fileErr);
      }
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: unknown) {
    console.error('Error deleting document:', err);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
