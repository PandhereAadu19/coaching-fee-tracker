export interface RiskSignals {
    score: number;
    overdueCount?: number;
    maxDaysOverdue?: number;
    attendanceDrop?: number;
    testDropPercent?: number;
  }
  
  /** Reads the stored reasons (array of {key,value} or an object) into anonymised signals. */
  export function signalsFromReasons(reasons: unknown, score: number): RiskSignals {
    const s: RiskSignals = { score };
    const set = (key: string, value: unknown) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return;
      if (key === "overdue_instalments") s.overdueCount = n;
      else if (key === "max_days_overdue") s.maxDaysOverdue = n;
      else if (key === "attendance_drop") s.attendanceDrop = n;
      else if (key === "test_drop_percent") s.testDropPercent = n;
    };
    if (Array.isArray(reasons)) {
      for (const r of reasons) {
        if (r && typeof r === "object") {
          const o = r as Record<string, unknown>;
          if (typeof o.key === "string") set(o.key, o.value);
        }
      }
    } else if (reasons && typeof reasons === "object") {
      for (const [k, v] of Object.entries(reasons)) set(k, v);
    }
    return s;
  }
  
  /** Only numbers go to the model: no name, phone, batch or centre. */
  export function buildPrompt(s: RiskSignals): string {
    const lines = [`Risk score: ${s.score} out of 100.`];
    if (s.overdueCount) lines.push(`Overdue instalments: ${s.overdueCount}.`);
    if (s.maxDaysOverdue) lines.push(`Longest overdue: ${s.maxDaysOverdue} days.`);
    if (s.attendanceDrop) lines.push(`Attendance drop: ${s.attendanceDrop} percentage points.`);
    if (s.testDropPercent) lines.push(`Test score drop: ${s.testDropPercent} percent.`);
    return lines.join("\n");
  }
  
  export function templateNote(s: RiskSignals): string {
    const parts: string[] = [];
    if (s.overdueCount) {
      parts.push(
        `${s.overdueCount} overdue instalment(s)${s.maxDaysOverdue ? `, longest ${s.maxDaysOverdue} days` : ""}`
      );
    }
    if (s.attendanceDrop) parts.push(`attendance down ${s.attendanceDrop} points`);
    if (s.testDropPercent) parts.push(`test scores down ${s.testDropPercent}%`);
    const why = parts.length ? parts.join("; ") : "several warning signs";
    return [
      `Flagged (score ${s.score}): ${why}.`,
      "Ask: Is anything affecting attendance or study at home?",
      "Ask: Is there a concern about paying the remaining fees?",
    ].join("\n");
  }
  
  export interface NoteResult {
    note: string;
    source: "llm" | "template";
  }
  
  type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
  
  export async function generateRiskNote(
    signals: RiskSignals,
    opts: { apiKey?: string; model?: string; timeoutMs?: number; fetchImpl?: FetchLike } = {}
  ): Promise<NoteResult> {
    const fallback: NoteResult = { note: templateNote(signals), source: "template" };
    const apiKey = opts.apiKey ?? process.env.GROQ_API_KEY;
    if (!apiKey) return fallback;
  
    const model = opts.model ?? process.env.GROQ_MODEL ?? "openai/gpt-oss-20b";
    const doFetch: FetchLike = opts.fetchImpl ?? ((url, init) => fetch(url, init));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);
  
    try {
      const res = await doFetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 600,
          reasoning_effort: "low",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You help a coaching institute counsellor prepare a call with a parent. Using only the numbers given, write at most 3 short plain-text lines: why the student was flagged, then two questions to ask. Do not invent facts.",
            },
            { role: "user", content: buildPrompt(signals) },
          ],
        }),
      });
      if (!res.ok) {
        console.error("Groq request failed with status", res.status);
        return fallback;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) return fallback;
      return { note: text.slice(0, 600), source: "llm" };
    } catch (e) {
        console.error("Groq request error:", e instanceof Error ? e.message : "unknown");
        return fallback;
    } finally {
      clearTimeout(timer);
    }
  }