// Pure helpers for deciding which generated timetable sessions belong to a
// given student. Kept free of any DB/model imports so it is safe to import from
// client components (the student timetable page) as well as server routes.

// Human-readable name for a cohort: the programme plus its level when set,
// e.g. ("BSc IT", 400) -> "BSc IT · Level 400". Used to group and label the
// timetable so different levels of one programme read as distinct cohorts.
export function cohortLabel(className: unknown, level?: unknown): string {
  const name = String(className ?? '').trim();
  const lvl = level == null || level === '' ? '' : String(level).trim();
  return lvl ? `${name} · Level ${lvl}` : name;
}

// Loose normalization: lowercase, strip anything that isn't a letter or digit
// down to single spaces, and trim. "BSc IT — Level 100" -> "bsc it level 100".
export function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Pull the academic level out of a free-text label. Understands the GCTU
// hundreds convention ("Level 100", "L200", "300") as well as single-digit
// year forms ("Level 1", "Year 2"), which are scaled to hundreds. Returns the
// level in hundreds (100..800) or null when no level is present.
export function extractLevel(value: unknown): number | null {
  const s = normalizeLabel(value);
  if (!s) return null;
  // Explicit hundreds first — the most common and least ambiguous form.
  const hundreds = s.match(/\b([1-8])0{2}\b/);
  if (hundreds) return Number(hundreds[1]) * 100;
  // Then "level 1" / "year 4" style single digits.
  const single = s.match(/\b(?:level|lvl|l|year|yr)\s*([1-8])\b/);
  if (single) return Number(single[1]) * 100;
  return null;
}

// Coerce a student's stored level (a number like 100, or "100"/"1") into the
// canonical hundreds form used for comparison. null when absent/unparseable.
export function normalizeStudentLevel(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9]/g, ''));
  if (!Number.isFinite(n) || n === 0) return null;
  return n < 100 ? n * 100 : n;
}

// Does a generated session (or class) belong to this student's cohort?
// A match needs the class label to name the student's program and — when a
// level is known — for it to equal the student's. Program match is a normalized
// token-subset check, so "BSc IT" matches "BSc IT Level 100".
//
// The first argument may be a plain class label (string) or a session/class
// object carrying an explicit `level`; the explicit level is preferred over one
// parsed from the label. When no level is known on the class side, a program
// match alone is enough, so program-wide classes still show up.
export function classMatchesStudent(
  session: string | { className?: unknown; level?: unknown },
  student: { program?: unknown; level?: unknown }
): boolean {
  const className =
    typeof session === 'string' ? session : (session?.className ?? '');
  const explicitLevel = typeof session === 'string' ? null : session?.level;

  const cls = normalizeLabel(className);
  const program = normalizeLabel(student.program);
  if (!cls || !program) return false;

  // Every token of the program must appear among the class label's tokens.
  const classTokens = new Set(cls.split(' '));
  const programMatches = program
    .split(' ')
    .every((tok) => tok !== '' && classTokens.has(tok));
  if (!programMatches) return false;

  // If both sides declare a level, they must agree. Prefer the class's explicit
  // level; fall back to parsing it from the label.
  const classLevel =
    explicitLevel != null && explicitLevel !== ''
      ? normalizeStudentLevel(explicitLevel)
      : extractLevel(className);
  const studentLevel = normalizeStudentLevel(student.level);
  if (classLevel != null && studentLevel != null) {
    return classLevel === studentLevel;
  }
  return true;
}
