"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mail, Phone, Plus, Search } from "lucide-react";
import { suppliersApi, type Supplier } from "@/lib/api";
import {
  SUPPLIER_TYPES,
  SUPPLIER_TYPE_LABELS,
  SUPPLIER_TYPE_STYLES,
  countryName,
} from "@/lib/constants";
import { ConfirmDialog, ErrorNote } from "@/components/modal";
import { SupplierForm } from "@/components/supplier-form";

const PAGE_SIZE = 30;

export default function SuppliersPage() {
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [items, setItems] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<"new" | Supplier | null>(null);
  const [toDelete, setToDelete] = useState<Supplier | null>(null);
  const loadId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (offset: number) => {
      const id = ++loadId.current;
      setLoading(true);
      setError("");
      try {
        const r = await suppliersApi.list({
          type: type === "all" ? "" : type,
          q,
          active: showInactive ? undefined : true,
          limit: PAGE_SIZE,
          offset,
        });
        if (id !== loadId.current) return;
        setItems((cur) => (offset === 0 ? r.data : [...cur, ...r.data]));
        setTotal(r.total);
        setCounts(r.counts);
      } catch (e) {
        if (id === loadId.current) setError(e instanceof Error ? e.message : "Could not load suppliers.");
      } finally {
        if (id === loadId.current) setLoading(false);
      }
    },
    [type, q, showInactive],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  async function toggleActive(s: Supplier) {
    setError("");
    try {
      await suppliersApi.update(s.id, { isActive: !s.isActive });
      await load(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the supplier.");
    }
  }

  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-600">
          Hotels, transport companies, caterers and other providers STL works with. Record their quotations on a
          request to compare prices and assign a supplier.
        </p>
        <button
          onClick={() => setForm("new")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8]"
        >
          <Plus className="size-4" /> Add supplier
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {["all", ...SUPPLIER_TYPES].map((key) => {
          const active = type === key;
          const n = key === "all" ? allCount : (counts[key] ?? 0);
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setType(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                active ? "bg-[#007cc2] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {key === "all" ? "All" : SUPPLIER_TYPE_LABELS[key as keyof typeof SUPPLIER_TYPE_LABELS]} ({n})
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search suppliers"
            placeholder="Search by name, city or contact"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#007cc2] focus:ring-4 focus:ring-[#007cc2]/15"
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="size-4 accent-[#007cc2]"
          />
          Show inactive
        </label>
      </div>

      <ErrorNote message={error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="app-scroll overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Quotes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-50/60 ${s.isActive ? "" : "opacity-60"}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => setForm(s)} className="text-left font-semibold text-[#007cc2] hover:underline">
                      {s.name}
                    </button>
                    {!s.isActive && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${SUPPLIER_TYPE_STYLES[s.type]}`}>
                      {SUPPLIER_TYPE_LABELS[s.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block font-medium">{s.contactName || "—"}</span>
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#007cc2]">
                        <Mail className="size-3" /> {s.email}
                      </a>
                    )}
                    {s.phone && (
                      <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#007cc2]">
                        <Phone className="size-3" /> {s.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[s.city, countryName(s.country)].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.quotations}
                    {s.accepted > 0 && <span className="text-xs text-[#1c673e]"> · {s.accepted} accepted</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1 text-xs font-semibold">
                      <button onClick={() => setForm(s)} className="rounded-lg px-2.5 py-1.5 text-[#007cc2] hover:bg-slate-50">
                        Edit
                      </button>
                      <button onClick={() => toggleActive(s)} className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50">
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                      {s.quotations === 0 && (
                        <button onClick={() => setToDelete(s)} className="rounded-lg px-2.5 py-1.5 text-red-600 hover:bg-red-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !error && items.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-500">
            {total === 0 && type === "all" && !q
              ? "No suppliers yet. Add your first one."
              : "No suppliers match your filters."}
          </p>
        )}
        {loading && (
          <p className="p-6 text-center text-sm text-slate-500" aria-busy="true">
            Loading…
          </p>
        )}
        {!loading && items.length < total && (
          <div className="border-t border-slate-100 p-3 text-center">
            <button onClick={() => load(items.length)} className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold hover:bg-slate-50">
              Load more
            </button>
          </div>
        )}
      </div>

      {form && (
        <SupplierForm
          supplier={form === "new" ? undefined : form}
          defaultType={type === "all" ? undefined : type}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load(0);
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete supplier?"
          danger
          confirmLabel="Delete"
          message={
            <>
              Delete <strong>{toDelete.name}</strong>? This can&apos;t be undone.
            </>
          }
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            await suppliersApi.remove(toDelete.id);
            setToDelete(null);
            await load(0);
          }}
        />
      )}
    </div>
  );
}
