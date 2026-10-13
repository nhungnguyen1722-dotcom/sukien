'use client';

import { getContractTerm, getContractTermStatus, getVietnamDate } from '@/lib/contractTerms';

type Props = {
  contractDate: string;
  contractType?: string | null;
};

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function ContractTermBadge({ contractDate, contractType }: Props) {
  const term = getContractTerm(contractDate, contractType);
  const status = getContractTermStatus(contractDate, contractType, getVietnamDate());
  if (!status || status === 'active' || !term.expiresOn) return null;

  if (status === 'expired') {
    return (
      <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
        Hết hạn {dateLabel(term.expiresOn)} · dừng phân bổ
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
      Tháng cuối · hết hạn {dateLabel(term.expiresOn)}
    </span>
  );
}
