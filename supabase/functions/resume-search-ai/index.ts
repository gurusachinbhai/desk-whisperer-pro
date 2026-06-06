// AI-powered candidate ranking for the Resume Search tool.
// Given a job description / required skills and a list of candidate resumes,
// returns a ranked shortlist with match scores and reasoning.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Candidate = {
  id: string;
  candidate_name: string;
  department_name?: string | null;
  professional_summary?: string | null;
  skills?: string[];
  certifications?: string[];
  work_experience?: { company?: string; designation?: string; period?: string; responsibilities?: string }[];
  education?: { degree?: string; institution?: string; year?: string }[];
  location?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, requiredSkills, candidates } = await req.json() as {
      jobDescription: string;
      requiredSkills?: string[];
      candidates: Candidate[];
    };

    if (!jobDescription?.trim()) {
      return new Response(JSON.stringify({ error: "jobDescription required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Trim candidates to keep prompt small.
    const compact = candidates.slice(0, 60).map((c) => ({
      id: c.id,
      name: c.candidate_name,
      department: c.department_name ?? null,
      summary: (c.professional_summary ?? "").slice(0, 400),
      skills: (c.skills ?? []).slice(0, 30),
      certifications: (c.certifications ?? []).slice(0, 10),
      experience: (c.work_experience ?? []).slice(0, 5).map((w) => ({
        role: w.designation, company: w.company, period: w.period,
        notes: (w.responsibilities ?? "").slice(0, 240),
      })),
      education: (c.education ?? []).slice(0, 3),
      location: c.location ?? null,
    }));

    const systemPrompt = `You are an expert technical recruiter. Rank candidates against a job description.
Return STRICT JSON of the form:
{"matches":[{"id":"<candidate_id>","score":0-100,"matched_skills":["..."],"missing_skills":["..."],"reason":"1-2 sentence justification"}]}
Only include candidates with score >= 30. Sort descending by score. Maximum 15 results. Do not invent candidate IDs.`;

    const userPrompt = `JOB DESCRIPTION:
${jobDescription.trim()}

REQUIRED / PREFERRED SKILLS: ${(requiredSkills ?? []).join(", ") || "(infer from JD)"}

CANDIDATES:
${JSON.stringify(compact)}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: `AI gateway error: ${text}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const matches = Array.isArray(parsed?.matches) ? parsed.matches : [];

    return new Response(JSON.stringify({ matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
