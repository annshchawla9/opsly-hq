import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@3.637.0";
import * as XLSX from "npm:xlsx@0.18.5";

/* ---------------- CORS ---------------- */
const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

/* ---------------- Helpers ---------------- */
function mustGetEnv(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function num(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function toISODate(d: any): string | null {
  if (!d) return null;
  if (d instanceof Date && !isNaN(d.getTime()))
    return d.toISOString().slice(0, 10);

  const dt = new Date(String(d).trim());
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

async function streamToBytes(body: any): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (body?.arrayBuffer) return new Uint8Array(await body.arrayBuffer());
  if (body?.transformToByteArray) return await body.transformToByteArray();

  // fallback for web streams
  if (body?.getReader) {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Uint8Array.from(chunks.flat());
  }

  throw new Error("Unsupported S3 Body type");
}

/* ---------------- Handler ---------------- */
serve(async (req) => {
  /* ✅ 1. Handle CORS preflight FIRST */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("🚀 sync_sales_from_s3 invoked");

    /* Optional body (safe now) */
    try {
      const body = await req.json();
      console.log("Request body:", body);
    } catch {
      console.log("No JSON body");
    }

    /* Supabase admin */
    const sb = createClient(
      mustGetEnv("SUPABASE_URL"),
      mustGetEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    /* S3 */
    const s3 = new S3Client({
      region: mustGetEnv("AWS_REGION"),
      credentials: {
        accessKeyId: mustGetEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: mustGetEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });

    const Bucket = mustGetEnv("S3_BUCKET");
    const Key = mustGetEnv("S3_KEY");

    const obj = await s3.send(new GetObjectCommand({ Bucket, Key }));
    if (!obj.Body) throw new Error("S3 object has no body");

    const bytes = await streamToBytes(obj.Body);
    const wb = XLSX.read(bytes.buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

    /* Aggregate */
    const storeAgg = new Map<string, any>();
    const billSets = new Map<string, Set<string>>();

    for (const r of rows) {
      const sale_date = toISODate(r["Bill Date"]);
      const store_code = String(r["STORE"] ?? "").trim();
      const billNo = String(r["Bill No"] ?? "").trim();

      if (!sale_date || !store_code) continue;

      const k = `${sale_date}__${store_code}`;
      if (!storeAgg.has(k)) {
        storeAgg.set(k, {
          sale_date,
          store_code,
          net_sales: 0,
          qty: 0,
          bill_count: 0,
        });
      }

      const agg = storeAgg.get(k);
      agg.net_sales += num(r["Net Amt"]);
      agg.qty += num(r["Qty"]);

      if (billNo) {
        if (!billSets.has(k)) billSets.set(k, new Set());
        billSets.get(k)!.add(billNo);
      }
    }

    for (const [k, agg] of storeAgg.entries()) {
      agg.bill_count = billSets.get(k)?.size ?? 0;
    }

    const payload = Array.from(storeAgg.values()).map((r) => ({
      ...r,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await sb
      .from("daily_store_sales")
      .upsert(payload, { onConflict: "sale_date,store_code" });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        ok: true,
        rows: payload.length,
        sale_dates: [...new Set(payload.map((x) => x.sale_date))],
        stores: [...new Set(payload.map((x) => x.store_code))],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  } catch (e: any) {
    console.error("❌ sync_sales_from_s3 failed:", e);

    return new Response(
      JSON.stringify({
        ok: false,
        error: e?.message ?? String(e),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      }
    );
  }
});