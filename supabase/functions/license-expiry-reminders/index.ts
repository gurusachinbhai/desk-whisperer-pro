// Scheduled job: scans software licenses and upserts alerts for expiring/expired ones.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull all licenses with an expiry date
    const { data: licenses, error } = await supabase
      .from("it_software_licenses")
      .select("id, company_id, software_name, expiry_date, renewal_alert_days");
    if (error) throw error;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let upserts = 0;
    let cleared = 0;

    for (const lic of licenses ?? []) {
      if (!lic.expiry_date) continue;
      const expiry = new Date(lic.expiry_date + "T00:00:00Z");
      const days = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
      const window = lic.renewal_alert_days ?? 30;

      let severity: string | null = null;
      if (days < 0) severity = "expired";
      else if (days <= 7) severity = "critical";
      else if (days <= window) severity = "warning";

      if (!severity) {
        // No longer in alert window: clear any active alert
        const { error: delErr, count } = await supabase
          .from("it_license_alerts")
          .delete({ count: "exact" })
          .eq("license_id", lic.id);
        if (!delErr && count) cleared += count;
        continue;
      }

      const message =
        severity === "expired"
          ? `${lic.software_name} expired ${Math.abs(days)} day(s) ago.`
          : `${lic.software_name} expires in ${days} day(s).`;

      const { error: upErr } = await supabase
        .from("it_license_alerts")
        .upsert(
          {
            company_id: lic.company_id,
            license_id: lic.id,
            software_name: lic.software_name,
            expiry_date: lic.expiry_date,
            days_remaining: days,
            severity,
            message,
            last_seen_at: new Date().toISOString(),
            dismissed_at: null,
            dismissed_by: null,
          },
          { onConflict: "license_id" },
        );
      if (!upErr) upserts++;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: licenses?.length ?? 0, upserts, cleared }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
