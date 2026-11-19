import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE, getToken } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: string;
  orderId: string;
  type: 'EFATURA' | 'EARSIVFATURA';
  status: 'DRAFT' | 'QUEUED' | 'SENT' | 'REJECTED' | 'ERROR' | 'CANCELLED';
  invoiceNo: string | null;
  ettn: string | null;
  profile: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  order: {
    id: string;
    total: number;
    createdAt: string;
    address: { firstName: string; lastName: string } | null;
    user: {
      email: string;
      profile: { firstName: string; lastName: string } | null;
    };
  };
}

interface ListResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Lookups ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  DRAFT:     { label: 'Taslak',    bg: 'bg-gray-100',   text: 'text-gray-600'   },
  QUEUED:    { label: 'Kuyrukta',  bg: 'bg-blue-100',   text: 'text-blue-700'   },
  SENT:      { label: 'Gönderildi',bg: 'bg-green-100',  text: 'text-green-700'  },
  REJECTED:  { label: 'Reddedildi',bg: 'bg-red-100',    text: 'text-red-700'    },
  ERROR:     { label: 'Hata',      bg: 'bg-red-100',    text: 'text-red-700'    },
  CANCELLED: { label: 'İptal',     bg: 'bg-neutral-100',text: 'text-neutral-500'},
};

const TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  EFATURA:      { label: 'e-Fatura',  bg: 'bg-indigo-100', text: 'text-indigo-700' },
  EARSIVFATURA: { label: 'e-Arşiv',   bg: 'bg-purple-100', text: 'text-purple-700' },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Number(n).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

function customerName(inv: Invoice) {
  const p = inv.order.user.profile;
  if (p?.firstName) return `${p.firstName} ${p.lastName ?? ''}`.trim();
  const a = inv.order.address;
  if (a?.firstName) return `${a.firstName} ${a.lastName ?? ''}`.trim();
  return inv.order.user.email;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [data, setData]       = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Filtreler
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType]     = useState('');

  // PDF yükleme durumu (invoiceId → loading)
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (type)   params.set('type', type);
      const r = await api.get<{ success: boolean; data: ListResponse }>(`/admin/invoices?${params}`);
      setData(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faturalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, type]);

  useEffect(() => { load(); }, [load]);

  // Arama değiştiğinde sayfayı sıfırla
  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleStatus(v: string) { setStatus(v); setPage(1); }
  function handleType(v: string)   { setType(v);   setPage(1); }

  async function openPdf(inv: Invoice) {
    setPdfLoading((p) => ({ ...p, [inv.id]: true }));
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${inv.orderId}/e-invoice/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { alert('PDF alınamadı'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      alert('PDF alınamadı');
    } finally {
      setPdfLoading((p) => ({ ...p, [inv.id]: false }));
    }
  }

  const invoices = data?.invoices ?? [];

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      {/* Başlık */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">Fatura Listesi</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `Toplam ${data.total} fatura` : 'Yükleniyor…'}
          </p>
        </div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          ← Siparişlere Dön
        </Link>
      </div>

      {/* Filtreler */}
      <div className="rounded-xl border border-stroke bg-white dark:border-strokedark dark:bg-boxdark p-4 mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Fatura no, ETTN veya sipariş ID…"
          className="flex-1 min-w-[200px] rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm outline-none focus:border-primary dark:border-strokedark dark:text-white"
        />
        <select
          value={status}
          onChange={(e) => handleStatus(e.target.value)}
          className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
        >
          <option value="">Tüm Durumlar</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => handleType(e.target.value)}
          className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm dark:border-strokedark dark:bg-boxdark dark:text-white"
        >
          <option value="">Tüm Tipler</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-opacity-90"
        >
          Yenile
        </button>
      </div>

      {/* Tablo */}
      <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark overflow-x-auto">
        {error && (
          <div className="px-6 py-4 text-red-600 text-sm">{error}</div>
        )}

        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50 dark:bg-meta-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <th className="px-5 py-4">Fatura No</th>
              <th className="px-5 py-4">Müşteri</th>
              <th className="px-5 py-4">Tip</th>
              <th className="px-5 py-4">Durum</th>
              <th className="px-5 py-4 text-right">Tutar</th>
              <th className="px-5 py-4">Gönderim Tarihi</th>
              <th className="px-5 py-4">Sipariş</th>
              <th className="px-5 py-4 text-center">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stroke dark:divide-strokedark">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-gray-100 dark:bg-meta-4 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                  {search || status || type ? 'Filtreyle eşleşen fatura bulunamadı.' : 'Henüz fatura kaydı yok.'}
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const sm = STATUS_META[inv.status] ?? STATUS_META.DRAFT;
                const tm = TYPE_META[inv.type]     ?? TYPE_META.EARSIVFATURA;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-meta-4 transition-colors">
                    {/* Fatura No / ETTN */}
                    <td className="px-5 py-4">
                      {inv.invoiceNo ? (
                        <span className="font-mono text-sm font-semibold text-black dark:text-white">
                          {inv.invoiceNo}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                      )}
                      {inv.ettn && (
                        <p className="font-mono text-[10px] text-gray-400 mt-0.5 break-all">{inv.ettn}</p>
                      )}
                    </td>

                    {/* Müşteri */}
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-black dark:text-white">{customerName(inv)}</p>
                      <p className="text-xs text-gray-400">{inv.order.user.email}</p>
                    </td>

                    {/* Tip */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${tm.bg} ${tm.text}`}>
                        {tm.label}
                      </span>
                      {inv.profile && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{inv.profile}</p>
                      )}
                    </td>

                    {/* Durum */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${sm.bg} ${sm.text}`}>
                        {sm.label}
                      </span>
                      {(inv.status === 'ERROR' || inv.status === 'REJECTED') && inv.errorMessage && (
                        <p className="text-[10px] text-red-500 mt-0.5 max-w-[160px] truncate" title={inv.errorMessage}>
                          {inv.errorMessage}
                        </p>
                      )}
                    </td>

                    {/* Tutar */}
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-medium text-black dark:text-white">
                        {fmt(Number(inv.order.total))}
                      </span>
                    </td>

                    {/* Gönderim Tarihi */}
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {inv.sentAt ? fmtDate(inv.sentAt) : <span className="text-gray-400 italic text-xs">—</span>}
                      </span>
                    </td>

                    {/* Sipariş linki */}
                    <td className="px-5 py-4">
                      <Link
                        to={`/orders/${inv.orderId}`}
                        className="text-xs font-mono text-primary hover:underline"
                      >
                        #{inv.orderId.slice(-8).toUpperCase()}
                      </Link>
                    </td>

                    {/* PDF */}
                    <td className="px-5 py-4 text-center">
                      {inv.status === 'SENT' ? (
                        <button
                          onClick={() => openPdf(inv)}
                          disabled={pdfLoading[inv.id]}
                          title="PDF'i aç"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-stroke dark:border-strokedark hover:bg-red-50 dark:hover:bg-meta-4 text-red-500 transition disabled:opacity-40"
                        >
                          {pdfLoading[inv.id] ? (
                            <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2v6h6M16 13H8m8 4H8m2-8H8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-300 text-lg">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-stroke dark:border-strokedark">
            <p className="text-sm text-gray-500">
              Sayfa {data.page} / {data.pages} — {data.total} kayıt
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
              >
                ← Önceki
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="px-3 py-1.5 rounded border border-stroke text-sm disabled:opacity-40 hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
