'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Plus,
  Trash2,
  Printer,
  Copy,
  Check,
  FileSpreadsheet,
  Link as LinkIcon,
  Send,
  Save,
  User,
  ShieldCheck,
  Calendar,
  Phone,
  Clock,
  Wallet,
  Landmark,
  MessageSquare,
  FileText,
  Sparkles,
} from 'lucide-react';
import { TransactionMember, TransactionLogItem, TransactionLog, EventFundExpense } from './TransactionLogManagement';
import { numberToVietnameseWords } from '@/lib/numberToWords';

const FUND_OPTIONS = [
  'Quỹ đào tạo',
  'Hoa hồng sale trực tiếp',
  'Quỹ hỗ trợ khách hàng',
  'Quỹ TeamLead',
  'Quỹ công tác phí',
  'Quỹ Sự kiện & Chốt hợp đồng',
  'Quỹ Vận hành',
  'Sale trực tiếp - Pro sale (Nguồn khách)',
  'Tri ân kết nối sale trực tiếp',
  'Tri ân hỗ trợ sale',
  'Tri ân giới thiệu',
  'Quỹ Chăm sóc khách hàng',
  'Quỹ Đào tạo Chuyên môn & Kỹ năng',
  'Quỹ Thi đua & Chương trình thúc đẩy',
  'Chi phí Công tác phí',
  'BP hỗ trợ KT',
  'BP hỗ trợ CN',
  'Leader team - giám đốc Kd',
];

const APPROVER_OPTIONS = [
  'Ban Giám Đốc (Nguyễn Kim Tươi)',
  'Ban Giám Đốc (Đinh Văn Bắc)',
  'Vũ Thị Cúc (Phó Tổng)',
  'Nguyễn Hùng Vĩ (Giám Đốc)',
];

const DEMO_PRESET_ITEMS: TransactionLogItem[] = [
  {
    order: 1,
    title: 'Thù lao Đào tạo Chuyên môn',
    subtitle: '(Đào tạo nội bộ)',
    fundSource: 'Quỹ đào tạo',
    beneficiaryName: 'Vũ Thị Cúc',
    beneficiaryPhone: '0904123456',
    beneficiaryBankAccount: '0904123456',
    beneficiaryBankName: 'Techcombank',
    amount: 3095000,
    note: '',
  },
  {
    order: 2,
    title: 'Hoa hồng Sale trực tiếp',
    subtitle: '(Pro sale)',
    fundSource: 'Hoa hồng sale trực tiếp',
    beneficiaryName: 'Nguyễn Hùng Vĩ',
    beneficiaryPhone: '0988776655',
    beneficiaryBankAccount: '0988776655',
    beneficiaryBankName: 'MB Bank',
    amount: 6000000,
    note: '',
  },
  {
    order: 3,
    title: 'Chi phí Hỗ trợ Khách hàng',
    subtitle: '(Chăm sóc khách hàng)',
    fundSource: 'Quỹ hỗ trợ khách hàng',
    beneficiaryName: 'Phạm Thị Hương',
    beneficiaryPhone: '1028374792',
    beneficiaryBankAccount: '1028374792',
    beneficiaryBankName: 'Vietcombank',
    amount: 2063333,
    note: '',
  },
  {
    order: 4,
    title: 'Thù lao TeamLead tuần 1',
    subtitle: '(Team One Vàng)',
    fundSource: 'Quỹ TeamLead',
    beneficiaryName: 'Phạm Minh Tuấn',
    beneficiaryPhone: '190348271',
    beneficiaryBankAccount: '190348271',
    beneficiaryBankName: 'Techcombank',
    amount: 3166800,
    note: '',
  },
  {
    order: 5,
    title: 'Công tác phí thị trường',
    subtitle: '(Chuyến công tác)',
    fundSource: 'Quỹ công tác phí',
    beneficiaryName: 'Vũ Hùng Vỹ',
    beneficiaryPhone: '0941000123',
    beneficiaryBankAccount: '0941000123',
    beneficiaryBankName: 'Vietcombank',
    amount: 3095000,
    note: '',
  },
  {
    order: 6,
    title: 'Thù lao Giảng viên Đào tạo',
    subtitle: '(Đào tạo chuyên sâu)',
    fundSource: 'Quỹ đào tạo',
    beneficiaryName: 'Nguyễn Kim Tươi',
    beneficiaryPhone: '012398471',
    beneficiaryBankAccount: '012398471',
    beneficiaryBankName: 'MB Bank',
    amount: 3095000,
    note: '',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  members: TransactionMember[];
  eventExpenses?: EventFundExpense[];
  onSuccess: (newLog: TransactionLog) => void;
  onTriggerPrint: (tempLog: TransactionLog) => void;
}

export default function CreatePaymentProposalModal({
  isOpen,
  onClose,
  members,
  eventExpenses = [],
  onSuccess,
  onTriggerPrint,
}: Props) {
  // Form top fields
  const [requestCode] = useState(() => `YC${String(Math.floor(10000 + Math.random() * 90000))}`);
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [requesterName, setRequesterName] = useState('Vũ Thị Cúc');
  const [requesterPhone, setRequesterPhone] = useState('0904123456');
  const [approverName, setApproverName] = useState('Ban Giám Đốc (Nguyễn Kim Tươi)');
  const [status, setStatus] = useState('Chờ duyệt');
  const [fundSource, setFundSource] = useState('Sale trực tiếp - Pro sale (Nguồn khách)');
  const [note, setNote] = useState(
    'Đề nghị Kế toán thanh toán thù lao hoa hồng và đào tạo theo bảng kê phân bổ tuần 1 tháng 10/2026 đã được duyệt.'
  );

  // Multi-line table items
  const [items, setItems] = useState<TransactionLogItem[]>(() => DEMO_PRESET_ITEMS);

  // Status flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  // Quick lookup map for members
  const memberMap = useMemo(() => {
    const map = new Map<string, TransactionMember>();
    members.forEach((m) => {
      map.set(m.full_name.trim().toLowerCase(), m);
    });
    return map;
  }, [members]);

  // Sync phone when requesterName changes
  const handleRequesterChange = (name: string) => {
    setRequesterName(name);
    const m = memberMap.get(name.trim().toLowerCase());
    if (m && m.phone) {
      setRequesterPhone(m.phone);
    }
  };

  // Total amount calculated dynamically from items
  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [items]);

  // Amount in Vietnamese words
  const amountInWords = useMemo(() => {
    return numberToVietnameseWords(totalAmount);
  }, [totalAmount]);

  // Add line item
  const handleAddItem = () => {
    const nextOrder = items.length + 1;
    const defaultMember = members[0];
    const newItem: TransactionLogItem = {
      order: nextOrder,
      title: '',
      subtitle: '',
      fundSource: fundSource || FUND_OPTIONS[0],
      beneficiaryName: defaultMember ? defaultMember.full_name : '',
      beneficiaryPhone: defaultMember?.phone || '',
      beneficiaryBankAccount: defaultMember?.bank_account || '',
      beneficiaryBankName: 'MB Bank',
      beneficiaryUserId: defaultMember?.id || null,
      amount: 0,
      note: '',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('Phiếu chi cần có ít nhất 1 dòng khoản mục.');
      return;
    }
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((it, idx) => ({ ...it, order: idx + 1 }));
    });
  };

  // Update line item property
  const handleItemChange = (index: number, field: keyof TransactionLogItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const target = { ...next[index], [field]: value };

      // Auto populate bank and phone if beneficiary changes
      if (field === 'beneficiaryName') {
        const found = memberMap.get(String(value).trim().toLowerCase());
        if (found) {
          if (found.phone) target.beneficiaryPhone = found.phone;
          if (found.bank_account) target.beneficiaryBankAccount = found.bank_account;
          target.beneficiaryUserId = found.id;
        }
      }

      next[index] = target;
      return next;
    });
  };

  // Copy batch transfer command (chuẩn MB Bank)
  const handleCopyBatchTransfer = async () => {
    try {
      const headers = ['Tên chủ tài khoản', 'Số tài khoản', 'Ngân hàng', 'Số tiền', 'Nội dung chuyển tiền'];
      const rows = items.map((it) => [
        it.beneficiaryName || '',
        it.beneficiaryBankAccount || '',
        it.beneficiaryBankName || '',
        String(it.amount || 0),
        `${requestCode} - ${it.title || ''}`,
      ]);
      const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');

      await navigator.clipboard.writeText(tsvContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      alert('Không thể sao chép tự động vào bộ nhớ tạm.');
    }
  };

  // Export batch transfer Excel file (chuẩn MB Bank)
  const handleExportExcel = () => {
    try {
      const exportData = items.map((it, idx) => ({
        STT: idx + 1,
        'Tên chủ tài khoản': it.beneficiaryName || '',
        'Số tài khoản': it.beneficiaryBankAccount || '',
        'Ngân hàng thụ hưởng': it.beneficiaryBankName || '',
        'Số tiền (VNĐ)': Number(it.amount) || 0,
        'Khoản mục chi': it.title || '',
        'Nguồn quỹ trích': it.fundSource || '',
        'Nội dung chuyển tiền': `${requestCode} - ${it.title || ''}`,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Lenh_Chuyen_Tien_MBBank');

      // Add width
      worksheet['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 28 },
        { wch: 22 },
        { wch: 32 },
      ];

      XLSX.writeFile(workbook, `Lenh_Chuyen_Khoan_MBBank_${requestCode}.xlsx`);
    } catch (err: any) {
      alert('Không thể xuất file Excel: ' + (err?.message || 'Có lỗi xảy ra'));
    }
  };

  // Apply Demo Presets (6 items from mockup)
  const handleApplyDemoPresets = () => {
    setItems(DEMO_PRESET_ITEMS);
    setIsPresetsOpen(false);
  };

  // Save Proposal
  const handleSaveProposal = async (customStatus?: string) => {
    if (items.length === 0) {
      alert('Vui lòng thêm ít nhất 1 dòng chi.');
      return;
    }

    const invalidItem = items.find((it) => !it.title.trim() || Number(it.amount) <= 0);
    if (invalidItem) {
      alert('Mỗi dòng khoản chi phải có Nội dung chi và Số tiền lớn hơn 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalStatus = customStatus || status || 'Chờ duyệt';
      const firstItem = items[0];

      const payload = {
        requestCode,
        requestDate,
        fundSource: firstItem?.fundSource || fundSource,
        requesterName,
        requesterPhone,
        approverName,
        status: finalStatus,
        beneficiaryName: firstItem?.beneficiaryName || '',
        beneficiaryPhone: firstItem?.beneficiaryPhone || '',
        beneficiaryBankAccount: firstItem?.beneficiaryBankAccount || '',
        beneficiaryBankName: firstItem?.beneficiaryBankName || '',
        beneficiaryUserId: firstItem?.beneficiaryUserId || null,
        proposedAmount: totalAmount,
        note,
        items,
      };

      const response = await fetch('/api/admin/transaction-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không tạo được phiếu đề xuất chi.');
      }

      onSuccess(result.log);
      alert('Tạo phiếu đề xuất chi thành công!');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi lưu phiếu chi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcut listener (P for print, Escape for close)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === 'Escape') {
        onClose();
      } else if ((e.key === 'p' || e.key === 'P') && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        triggerCurrentPrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, requestCode, requestDate, requesterName, approverName, totalAmount, items, note]);

  const triggerCurrentPrint = () => {
    const tempLog: TransactionLog = {
      id: Date.now(),
      request_code: requestCode,
      request_date: requestDate,
      fund_source: items[0]?.fundSource || fundSource,
      detail_content: note || items.map((it) => `${it.title}: ${it.amount} đ`).join('\n'),
      requester_name: requesterName,
      requester_phone: requesterPhone,
      approver_name: approverName,
      beneficiary_name: items[0]?.beneficiaryName || '',
      beneficiary_phone: items[0]?.beneficiaryPhone || '',
      beneficiary_bank_account: items[0]?.beneficiaryBankAccount || '',
      beneficiary_bank_name: items[0]?.beneficiaryBankName || '',
      proposed_amount: totalAmount,
      available_balance: null,
      fund_alert: 'An toàn',
      status: status || 'Chờ duyệt',
      expense_type: 'Thủ công',
      items,
      note,
    };
    onTriggerPrint(tempLog);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="my-auto max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col text-xs">
        {/* MODAL HEADER */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 rounded-t-3xl shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Tạo phiếu đề xuất chi</h2>
              <p className="text-xs text-slate-500">Hệ thống quản lý sự kiện & phân bổ nguồn quỹ tự động</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Đóng modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* TOP SECTION: GENERAL INFO & TOTAL AMOUNT CARD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT 8 COLS: FORM FIELDS */}
            <div className="lg:col-span-8 space-y-4">
              {/* ROW 1: 4 FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Mã phiếu đề xuất */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Mã phiếu đề xuất (*)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <FileText className="h-4 w-4" />
                    </div>
                    <input
                      readOnly
                      disabled
                      tabIndex={-1}
                      value={`${requestCode} (Tự động sinh)`}
                      className="w-full rounded-xl border border-slate-300 bg-slate-200/90 pl-8 pr-3 py-2 text-xs font-mono font-bold text-slate-600 cursor-not-allowed select-none shadow-inner"
                    />
                  </div>
                </div>

                {/* 2. Người đề xuất */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Người đề xuất (*)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      list="create-requester-list"
                      value={requesterName}
                      onChange={(e) => handleRequesterChange(e.target.value)}
                      placeholder="Chọn người đề xuất"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                    />
                    <datalist id="create-requester-list">
                      {members.map((m) => (
                        <option key={m.id} value={m.full_name}>
                          {m.phone ? `${m.phone} · ` : ''}{m.team_name ? `Đội ${m.team_name}` : ''}
                        </option>
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* 3. Người phê duyệt */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Người phê duyệt (*)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <select
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs cursor-pointer truncate"
                    >
                      {APPROVER_OPTIONS.map((appr) => (
                        <option key={appr} value={appr}>{appr}</option>
                      ))}
                      {members.map((m) => (
                        <option key={`m-${m.id}`} value={m.full_name}>{m.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Ngày đề xuất */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Ngày đề xuất (*)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input
                      type="date"
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* ROW 2: SĐT, TRẠNG THÁI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Số điện thoại người đề xuất
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      value={requesterPhone}
                      onChange={(e) => setRequesterPhone(e.target.value)}
                      placeholder="Nhập số điện thoại"
                      className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Trạng thái phiếu
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-amber-500">
                      <Clock className="h-4 w-4" />
                    </div>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full rounded-xl border border-amber-200 bg-amber-50/70 pl-8 pr-3 py-2 text-xs font-bold text-amber-800 outline-none focus:border-amber-400 shadow-2xs cursor-pointer"
                    >
                      <option value="Chờ duyệt">CHỜ DUYỆT</option>
                      <option value="Đã duyệt">ĐÃ DUYỆT</option>
                      <option value="Đã thanh toán">ĐÃ THANH TOÁN</option>
                      <option value="Lưu nháp">LƯU NHÁP</option>
                      <option value="Từ chối">TỪ CHỐI</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 4 COLS: TỔNG TIỀN ĐỀ XUẤT CHI HIGHLIGHT CARD */}
            <div className="lg:col-span-4 flex flex-col justify-center rounded-2xl border border-rose-200/80 bg-rose-50/60 p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-xs">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                    TỔNG TIỀN ĐỀ XUẤT CHI
                  </div>
                  <div className="text-2xl lg:text-3xl font-black text-rose-600 tracking-tight">
                    {totalAmount.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="mt-1 text-[11px] text-rose-600/90 italic leading-snug line-clamp-2" title={amountInWords}>
                    Bằng chữ: {amountInWords}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ITEM LIST SECTION: MULTI-LINE ITEM TABLE */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Danh sách các khoản mục chi</h3>
                  <p className="text-[11px] text-slate-500">Mỗi dòng gồm khoản chi, nguồn quỹ trích, người thụ hưởng và số tiền</p>
                </div>
              </div>
            </div>

            {/* THE MULTI-LINE TABLE */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[960px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-3 text-center w-12">STT</th>
                      <th className="py-3 px-3 min-w-[240px]">Khoản mục & nội dung chi</th>
                      <th className="py-3 px-3 min-w-[190px]">Nguồn quỹ trích</th>
                      <th className="py-3 px-3 min-w-[170px]">Người thụ hưởng</th>
                      <th className="py-3 px-3 min-w-[210px]">
                        <div>Thông tin chuyển khoản</div>
                        <div className="text-[9px] font-normal normal-case text-slate-400">(Tên chủ TK / SĐT)</div>
                      </th>
                      <th className="py-3 px-3 text-right min-w-[150px]">Số tiền (VND)</th>
                      <th className="py-3 px-3 text-center w-12">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition">
                        {/* STT */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500 align-middle">
                          {index + 1}
                        </td>

                        {/* KHOẢN MỤC & NỘI DUNG CHI */}
                        <td className="py-2.5 px-3 align-top space-y-1">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                            placeholder="Nhập tên khoản mục chi"
                            className="w-full font-bold text-slate-900 border-0 bg-transparent p-0 text-xs focus:ring-0 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                          />
                          <input
                            type="text"
                            value={item.subtitle || ''}
                            onChange={(e) => handleItemChange(index, 'subtitle', e.target.value)}
                            placeholder="(Ghi chú / chi tiết khoản chi)"
                            className="w-full text-[11px] text-blue-600 border-0 bg-transparent p-0 focus:ring-0 focus:outline-none placeholder:text-slate-400"
                          />
                        </td>

                        {/* NGUỒN QUỸ TRÍCH */}
                        <td className="py-2.5 px-3 align-top">
                          <select
                            value={item.fundSource}
                            onChange={(e) => handleItemChange(index, 'fundSource', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 cursor-pointer"
                          >
                            {FUND_OPTIONS.map((fund) => (
                              <option key={fund} value={fund}>{fund}</option>
                            ))}
                          </select>
                        </td>

                        {/* NGƯỜI THỤ HƯỞNG */}
                        <td className="py-2.5 px-3 align-top">
                          <input
                            list={`beneficiary-list-${index}`}
                            value={item.beneficiaryName}
                            onChange={(e) => handleItemChange(index, 'beneficiaryName', e.target.value)}
                            placeholder="Tên người nhận"
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                          />
                          <datalist id={`beneficiary-list-${index}`}>
                            {members.map((m) => (
                              <option key={m.id} value={m.full_name}>
                                {m.full_name} · {m.phone || ''}
                              </option>
                            ))}
                          </datalist>
                        </td>

                        {/* THÔNG TIN CHUYỂN KHOẢN */}
                        <td className="py-2.5 px-3 align-top space-y-1">
                          <div className="text-[11px] font-medium text-slate-800">
                            {item.beneficiaryName || 'Chưa chọn'} / {item.beneficiaryPhone || item.beneficiaryBankAccount || '—'}
                          </div>
                          <input
                            type="text"
                            value={item.beneficiaryBankName || ''}
                            onChange={(e) => handleItemChange(index, 'beneficiaryBankName', e.target.value)}
                            placeholder="Tên ngân hàng (e.g. MB Bank, Techcombank)"
                            className="w-full text-[11px] font-medium text-blue-600 border-0 bg-transparent p-0 focus:ring-0 focus:outline-none placeholder:text-slate-400"
                          />
                        </td>

                        {/* SỐ TIỀN */}
                        <td className="py-2.5 px-3 text-right align-top">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={item.amount || ''}
                            onChange={(e) => handleItemChange(index, 'amount', Number(e.target.value))}
                            placeholder="0"
                            className="w-full text-right font-bold text-slate-900 border-0 bg-transparent p-0 text-xs focus:ring-0 focus:outline-none placeholder:text-slate-400"
                          />
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {Number(item.amount || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </td>

                        {/* NÚT XÓA */}
                        <td className="py-2.5 px-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            title="Xóa dòng"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BUTTONS UNDER TABLE & SUMMARY */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50/50 px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Thêm dòng chi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPresetsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/50 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-2xs hover:bg-emerald-100 transition cursor-pointer"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>Chọn định mức đào tạo / sự kiện</span>
                </button>
              </div>

              <div className="text-right">
                <div className="text-xs font-black uppercase text-rose-600">
                  TỔNG CỘNG ({items.length} KHOẢN CHI): {totalAmount.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>
          </div>

          {/* PRESETS MODAL / POPUP */}
          {isPresetsOpen && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>Khoản mục & định mức đào tạo / sự kiện có sẵn</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPresetsOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleApplyDemoPresets}
                  className="flex flex-col text-left p-3 rounded-xl bg-white border border-emerald-200 hover:border-emerald-500 hover:shadow-xs transition"
                >
                  <span className="font-bold text-emerald-800 text-xs">Nạp trọn bộ 6 khoản chuẩn mẫu</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Theo bảng kê tuần 1 tháng 10 (28.650.000 đ)</span>
                </button>

                {eventExpenses.slice(0, 5).map((exp, idx) => (
                  <button
                    key={`ev-${idx}`}
                    type="button"
                    onClick={() => {
                      setItems((prev) => [
                        ...prev,
                        {
                          order: prev.length + 1,
                          title: `Chi phí sự kiện · ${exp.expense_role}`,
                          subtitle: `Sự kiện ${exp.event_code}`,
                          fundSource: 'Quỹ Sự kiện & Chốt hợp đồng',
                          beneficiaryName: exp.beneficiary_name,
                          beneficiaryPhone: exp.beneficiary_phone,
                          beneficiaryBankAccount: exp.beneficiary_phone,
                          beneficiaryBankName: 'MB Bank',
                          amount: exp.proposed_amount,
                          note: '',
                        },
                      ]);
                      setIsPresetsOpen(false);
                    }}
                    className="flex flex-col text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs transition"
                  >
                    <span className="font-semibold text-slate-800 text-xs">{exp.beneficiary_name} · {exp.expense_role}</span>
                    <span className="text-[11px] text-blue-600 mt-0.5 font-bold">
                      {Number(exp.proposed_amount).toLocaleString('vi-VN')} đ
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: ĐỐI SOÁT & XUẤT LỆNH CHUYỂN KHOẢN LÔ (CHUẨN MB BANK) */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs">
                    Đối soát & xuất lệnh chuyển khoản lô (chuẩn MB Bank)
                  </h4>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-emerald-800">
                    <li>• Thông tin chuyển khoản theo 4 cột chuẩn: Tên chủ tài khoản, Số tài khoản, Ngân hàng, Số tiền</li>
                    <li>• Có thể sao chép hoặc xuất Excel để lập lệnh chuyển khoản</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyBatchTransfer}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-50 transition cursor-pointer"
                >
                  {copySuccess ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-emerald-600" />}
                  <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép lệnh chuyển tiền'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Xuất Excel chuyển khoản lô</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION: GHI CHÚ / CĂN CỨ ĐỀ XUẤT THANH TOÁN */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <span>Ghi chú / căn cứ đề xuất thanh toán</span>
            </label>
            <div className="relative">
              <textarea
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Đề nghị Kế toán thanh toán thù lao hoa hồng và đào tạo theo bảng kê phân bổ..."
                className="w-full rounded-2xl border border-slate-200 bg-white p-3 pb-6 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
              <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono">
                {note.length}/500
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4 rounded-b-3xl shadow-2xs">
          <div>
            <button
              type="button"
              onClick={triggerCurrentPrint}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>In phiếu chi (P)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>

            <button
              type="button"
              onClick={() => handleSaveProposal('Lưu nháp')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveProposal('Chờ duyệt')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Đang lưu…' : 'Lưu & gửi duyệt chi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
