import { Crown, User as UserIcon } from "lucide-react";

export type HierarchyEmployee = {
  id: string;
  display_name: string;
  email: string | null;
  photo_url?: string | null;
  manager_id?: string | null;
  job_title?: string | null;
};

type Props = {
  meId: string | null;
  employees: HierarchyEmployee[];
  maxLevels?: number; // default 5 levels up
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("") || "?";

const Avatar = ({ emp, size = "md", highlight = false }: { emp: HierarchyEmployee; size?: "sm" | "md" | "lg"; highlight?: boolean }) => {
  const dim = size === "lg" ? "h-16 w-16" : size === "md" ? "h-12 w-12" : "h-10 w-10";
  return (
    <div
      className={`relative grid ${dim} place-items-center overflow-hidden rounded-full bg-primary/10 text-primary ring-2 ${
        highlight ? "ring-primary shadow-glow" : "ring-border"
      }`}
    >
      {emp.photo_url ? (
        <img src={emp.photo_url} alt={emp.display_name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-extrabold">{initialsOf(emp.display_name)}</span>
      )}
    </div>
  );
};

export default function ManagerHierarchy({ meId, employees, maxLevels = 5 }: Props) {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const me = meId ? byId.get(meId) : null;

  // walk up the manager chain
  const chain: HierarchyEmployee[] = [];
  if (me) {
    let cur: HierarchyEmployee | undefined = me;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id) && chain.length <= maxLevels) {
      seen.add(cur.id);
      chain.push(cur);
      cur = cur.manager_id ? byId.get(cur.manager_id) : undefined;
    }
  }

  if (!me) {
    return (
      <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
        <h3 className="font-display text-base font-extrabold">Reporting line</h3>
        <p className="mt-2 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
          We could not match you to an employee record yet. Once your admin links your account, your manager hierarchy will appear here.
        </p>
      </div>
    );
  }

  // top to bottom: highest manager first → me last
  const ladder = [...chain].reverse();

  return (
    <div className="rounded-[1.5rem] bg-surface-raised p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Org chart · {chain.length - 1} level{chain.length - 1 === 1 ? "" : "s"} up</p>
          <h3 className="font-display text-lg font-extrabold">Your reporting line</h3>
        </div>
        <Crown className="h-5 w-5 text-primary" />
      </div>

      {chain.length === 1 ? (
        <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-xs font-semibold text-muted-foreground">
          No manager mapped yet. Ask your admin to assign your reporting manager from the Admin panel.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto pb-1">
          <ol className="relative mx-auto flex min-w-max flex-col items-center gap-0">
            {ladder.map((emp, idx) => {
              const isMe = emp.id === me.id;
              const isTop = idx === 0;
              return (
                <li key={emp.id} className="flex flex-col items-center">
                  {/* connector line above (except top) */}
                  {idx > 0 && (
                    <div className="h-6 w-px bg-gradient-to-b from-primary/60 to-primary" aria-hidden />
                  )}
                  <div
                    className={`flex min-w-[220px] items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all ${
                      isMe
                        ? "border-primary bg-primary/5 shadow-glow"
                        : isTop
                          ? "border-amber-500/60 bg-amber-500/5"
                          : "border-border bg-background"
                    }`}
                  >
                    <Avatar emp={emp} size={isMe ? "lg" : "md"} highlight={isMe} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-display text-sm font-extrabold">
                        {emp.display_name}
                        {isTop && !isMe && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                      </p>
                      {emp.job_title && (
                        <p className="truncate text-[11px] font-semibold text-primary">{emp.job_title}</p>
                      )}
                      {emp.email && (
                        <p className="truncate text-[11px] font-semibold text-muted-foreground">{emp.email}</p>
                      )}
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {isMe ? "You" : isTop ? "Top of chain" : `Level ${ladder.length - 1 - idx} up`}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
