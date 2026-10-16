import { uid } from "./util";

// Beat-sheet templates. Each row is [depth, label, hint]. Labels prefill the
// node text; hints show as placeholder guidance under it until you write a note.
export const TEMPLATES = [
  {
    id: "blank", name: "Blank", desc: "Empty outline", format: "film",
    rows: [[0, "", ""]],
  },
  {
    id: "three-act", name: "Three-Act", desc: "Classic setup / confrontation / resolution", format: "film",
    rows: [
      [0, "ACT ONE — Setup", "Who is this, what do they want, what's broken?"],
      [1, "Status quo", "Show the hero's normal life and the flaw that makes it funny."],
      [1, "Inciting incident", "The event that knocks the world off balance."],
      [1, "Lock-in", "The hero commits. No going back. (~25% in)"],
      [0, "ACT TWO — Confrontation", "Complications pile up; the comic engine runs."],
      [1, "Rising complications", "Each attempt to fix things makes it worse."],
      [1, "Midpoint", "A false win or false loss that raises the stakes."],
      [1, "All is lost", "The lowest point. The plan has completely backfired."],
      [0, "ACT THREE — Resolution", "Hero changes (or pointedly doesn't)."],
      [1, "Climax", "Everything collides. Callbacks pay off."],
      [1, "Resolution", "The new normal. Last laugh."],
    ],
  },
  {
    id: "save-the-cat", name: "Save the Cat", desc: "15-beat feature structure (page numbers for ~110 pages)", format: "film",
    rows: [
      [0, "ACT ONE", ""],
      [1, "Opening Image (p.1)", "A snapshot of the hero before the story changes them."],
      [1, "Theme Stated (p.5)", "Someone hints at the lesson the hero needs to learn."],
      [1, "Set-Up (p.1–10)", "The hero's world, their flaws, and what's missing."],
      [1, "Catalyst (p.12)", "Life-changing news or event."],
      [1, "Debate (p.12–25)", "Should I go? The hero hesitates."],
      [0, "ACT TWO", ""],
      [1, "Break into Two (p.25)", "The hero chooses to enter the new world."],
      [1, "B Story (p.30)", "A new relationship that carries the theme."],
      [1, "Fun and Games (p.30–55)", "The promise of the premise: the trailer moments."],
      [1, "Midpoint (p.55)", "False victory or false defeat; stakes go up."],
      [1, "Bad Guys Close In (p.55–75)", "Outside pressure and inside doubts tighten."],
      [1, "All Is Lost (p.75)", "The opposite of the midpoint; a 'whiff of death'."],
      [1, "Dark Night of the Soul (p.75–85)", "The hero wallows, then finds the answer."],
      [0, "ACT THREE", ""],
      [1, "Break into Three (p.85)", "A and B stories meet; the solution appears."],
      [1, "Finale (p.85–110)", "The hero applies the lesson and wins (or loses well)."],
      [1, "Final Image (p.110)", "The mirror of the opening image, showing change."],
    ],
  },
  {
    id: "story-circle", name: "Story Circle", desc: "Dan Harmon's 8 steps, great for sitcom episodes", format: "tv",
    rows: [
      [0, "1. You", "A character in their zone of comfort."],
      [0, "2. Need", "But they want something."],
      [0, "3. Go", "They enter an unfamiliar situation."],
      [0, "4. Search", "Adapt to it."],
      [0, "5. Find", "Get what they wanted."],
      [0, "6. Take", "Pay a heavy price for it."],
      [0, "7. Return", "Then return to their familiar situation."],
      [0, "8. Change", "Having changed."],
    ],
  },
  {
    id: "sitcom", name: "Sitcom Episode", desc: "Half-hour: cold open, two acts, tag with A/B/C plots", format: "tv",
    rows: [
      [0, "COLD OPEN", "A self-contained runner or tease. 1–3 pages."],
      [1, "", "The joke or situation that opens the episode."],
      [0, "ACT ONE", ""],
      [1, "A story: setup", "The main character's problem/goal this week."],
      [1, "B story: setup", "A smaller story for the ensemble."],
      [1, "C runner", "A quick recurring gag, 2–3 appearances."],
      [1, "A story: complication", "The plan meets reality."],
      [1, "Act break", "A turn that makes us want to come back after the commercials."],
      [0, "ACT TWO", ""],
      [1, "A story: escalation", "It gets worse because of who the characters are."],
      [1, "B story: escalation", ""],
      [1, "A and B collide", "The stories crash into each other."],
      [1, "Resolution", "Lesson learned, or very much not."],
      [0, "TAG", "One last laugh. Often pays off the C runner."],
    ],
  },
  {
    id: "sketch", name: "Sketch Game", desc: "Premise → game → heighten → button", format: "sketch",
    rows: [
      [0, "Premise", "One sentence: who, where, and what's unusual."],
      [0, "Base reality", "Establish the normal world quickly."],
      [0, "First unusual thing", "The moment the game is revealed."],
      [0, "Game", "If this is true, what else is true? State the pattern."],
      [0, "Heighten 1", "First escalation of the game."],
      [0, "Heighten 2", "Bigger. Raise the stakes or widen the scope."],
      [0, "Heighten 3", "The biggest, most absurd version."],
      [0, "Button", "Twist, callback, or reversal to end on."],
    ],
  },
  {
    id: "standup", name: "Stand-Up Set", desc: "Shape a set or a special's arc", format: "film",
    rows: [
      [0, "Opener", "Fast, reliable laugh that establishes who you are."],
      [0, "Persona / point of view", "What's your attitude? Why are you up here?"],
      [0, "Chunk 1", "A topic with 2–4 bits."],
      [1, "", "Bit"],
      [0, "Chunk 2", ""],
      [1, "", "Bit"],
      [0, "Chunk 3", ""],
      [1, "", "Bit"],
      [0, "Callbacks", "Which earlier lines can come back?"],
      [0, "Closer", "Your strongest bit, ideally tying the set together."],
    ],
  },
];

export const newNode = (depth = 0, text = "", hint = "") => ({ id: uid(), depth, text, hint, note: "" });

export function outlineFromTemplate(templateId, title) {
  const t = TEMPLATES.find(x => x.id === templateId) || TEMPLATES[0];
  return {
    title: title || (t.id === "blank" ? "Untitled Outline" : `Untitled — ${t.name}`),
    template: t.id,
    format: t.format,
    nodes: t.rows.map(([d, text, hint]) => newNode(d, text, hint)),
  };
}
