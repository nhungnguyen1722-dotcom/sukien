import { NextResponse } from 'next/server';
import { generateAutomaticContractSlips, getTransactionLogRows } from '@/lib/transactionLogs';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await generateAutomaticContractSlips();
    const logs = await getTransactionLogRows();
    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    console.error('Automatic contract slip generation failed:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Không thể tạo phiếu tự động.' }, { status: 500 });
  }
}
