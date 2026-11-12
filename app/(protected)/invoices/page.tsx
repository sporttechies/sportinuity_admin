"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { invoicesApi, type Invoice } from "@/lib/api";
import { INVOICE_STATUS_LABELS, formatDate, formatMoney } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";
import { InvoicePreview } from "@/components/invoice-preview";
import { InvoiceStatusBadge } from "@/components/invoice-status";

const PAGE_SIZE = 20;
const TABS = [{ key: "", label: "All" }, ...(["draft", "issued", "paid", "void"] as const).map((s) => ({ key: s, label: INVOICE_STATUS_LABELS[s] }))];

function InvoiceList() {
  const router = useRouter();
  const params = useSearchParams();
  const status = params.get("status") || "";
  const q = params.get("q") || "";
  const [search, setSearch] = useState(q);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState<Invoice | null>(null);
  const loadId = useRef(0);

  const setFilter = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      setPage(0);
      router.replace(`/invoices${next.toString() ? `?${next}` : ""}`);
    },
    [params, router],
  );

  useEffect(() => setSearch(q), [q]);
  useEffect(() => {
    if (search.trim() === q) return;
    const timer = setTimeout(() => setFilter({ q: search.trim() }), 400);
    return () => clearTimeout(timer);
  }, [search, q, setFilter]);

  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    try {
      const result = await invoicesApi.list({ status, q, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      if (id !== loadId.current) return;
      setRows(result.data);
      setTotal(result.total);
      setError("");
    } catch (err) {
      if (id === loadId.current) setError(err instanceof Error ? err.message : "Could not load invoices.");
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        {total} invoice{total === 1 ? "" : "s"}. Create invoices from a request&apos;s page.
      </p>
      <div className="app-scroll flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setFilter({ status: t.key })}
            aria-pressed={status === t.key}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              status === t.key ? "bg-[#007cc2] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search invoices"
          placeholder="Invoice number, request or team"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
        />
      </div>
      <ErrorNote message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="app-scroll overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <span className="block font-semibold">{inv.number || "Draft"}</span>
                    <Link href={`/requests/${encodeURIComponent(inv.requestReference)}`} className="text-xs font-semibold text-[#007cc2] hover:underline">
                      {inv.requestReference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{inv.team}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(inv.total, inv.currency)}</td>
                  <td className="px-4 py-3 text-slate-500">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                  <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setPreviewing(inv)} aria-label={`View ${inv.number || "draft"}`} className="rounded-lg p-2 text-[#007cc2] hover:bg-[#e8f4fb]">
                      <Eye className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && <p className="py-12 text-center text-sm text-slate-500">No invoices found.</p>}
        {loading && <p className="py-6 text-center text-sm text-slate-500" aria-busy="true">Loading…</p>}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page" className="rounded-xl border border-slate-200 bg-white p-2 disabled:opacity-40"><ChevronLeft className="size-4" /></button>
            <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page" className="rounded-xl border border-slate-200 bg-white p-2 disabled:opacity-40"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      )}

      {previewing && (
        <InvoicePreview
          invoice={previewing}
          onClose={() => setPreviewing(null)}
          onChanged={(invoice) => {
            setPreviewing(invoice);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <InvoiceList />
    </Suspense>
  );
}
