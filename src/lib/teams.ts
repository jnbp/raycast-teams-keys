import { Clipboard, getFrontmostApplication, getPreferenceValues, open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** The new Teams client. The classic one (com.microsoft.teams) is retired. */
export const TEAMS_BUNDLE_ID = "com.microsoft.teams2";

export class TeamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamsError";
  }
}

/** A key on the keyboard, as System Events understands it. */
export type Key = { char: string } | { code: number };
export type Modifier = "command" | "shift" | "option" | "control";

export const RETURN: Key = { code: 36 };
export const ESCAPE: Key = { code: 53 };

const TIMING_FACTOR: Record<string, number> = {
  instant: 0.1,
  ultraFast: 0.2,
  veryFast: 0.35,
  fast: 0.6,
  normal: 1,
  slow: 1.8,
  verySlow: 3,
};

/**
 * Two separate speeds: meeting shortcuts are one keystroke Teams answers at
 * once, while chats, messages and status go through the Teams search, which
 * first has to find something.
 */
export type TimingKind = "shortcuts" | "search";

/**
 * How much the waits of one kind are stretched or shortened: the preset, or the
 * custom factor when the preset is Custom Factor. Out-of-range input falls back to 1.
 */
export function timingFactor(kind: TimingKind): number {
  const prefs = getPreferenceValues<Preferences>();
  const [preset, custom] =
    kind === "shortcuts"
      ? [prefs.shortcutTiming, prefs.customShortcutTiming]
      : [prefs.searchTiming, prefs.customSearchTiming];
  if (preset === "custom") {
    const value = Number.parseFloat((custom ?? "").replace(",", "."));
    return Number.isFinite(value) && value >= 0.05 && value <= 10 ? value : 1;
  }
  return TIMING_FACTOR[preset] ?? 1;
}

/** Waits `ms` milliseconds, stretched by the timing preference of that kind. */
export function pause(ms: number, kind: TimingKind = "search"): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.round(ms * timingFactor(kind))));
}

/** AppleScript string literal. Only ever used for values the extension controls. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function isTeamsInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/mdfind", [`kMDItemCFBundleIdentifier == "${TEAMS_BUNDLE_ID}"`]);
    if (stdout.trim()) return true;
  } catch {
    // Spotlight can be off; fall through to the usual location.
  }
  try {
    await execFileAsync("/bin/test", ["-d", "/Applications/Microsoft Teams.app"]);
    return true;
  } catch {
    return false;
  }
}

export async function isTeamsRunning(): Promise<boolean> {
  const result = await runAppleScript(
    `tell application "System Events" to return (exists (first application process whose bundle identifier is ${quote(TEAMS_BUNDLE_ID)}))`,
  );
  return result.trim() === "true";
}

/**
 * Brings Teams to the front, starting it if needed, and waits until it is the
 * frontmost app. Keystrokes sent before that would land in another app.
 */
export async function activateTeams(kind: TimingKind = "search"): Promise<void> {
  const running = await isTeamsRunning();
  if (!running && !(await isTeamsInstalled())) {
    throw new TeamsError(
      "Microsoft Teams is not installed. Microsoft Teams Keys works with the new Teams desktop app.",
    );
  }
  await runAppleScript(`tell application id ${quote(TEAMS_BUNDLE_ID)} to activate`);
  // A cold start takes a few seconds before Teams accepts input.
  const deadline = Date.now() + (running ? 3000 : 20000);
  const poll = Math.max(30, Math.round(150 * Math.min(timingFactor(kind), 1)));
  while (Date.now() < deadline) {
    const front = await getFrontmostApplication().catch(() => undefined);
    if (front?.bundleId === TEAMS_BUNDLE_ID) {
      // After a cold start Teams needs its time however fast the Timing is.
      if (running) await pause(250, kind);
      else await new Promise((resolve) => setTimeout(resolve, Math.max(2500, 4000 * timingFactor(kind))));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, poll));
  }
  throw new TeamsError("Teams did not come to the front. Open it once by hand, then try again.");
}

/**
 * Presses a key in Teams. The keystroke goes to the Teams process, so nothing
 * lands in another app if the focus changed in between.
 */
export async function press(key: Key, modifiers: Modifier[] = []): Promise<void> {
  const using = modifiers.length > 0 ? ` using {${modifiers.map((m) => `${m} down`).join(", ")}}` : "";
  const stroke = "char" in key ? `keystroke ${quote(key.char)}${using}` : `key code ${key.code}${using}`;
  await runAppleScript(
    `tell application "System Events"
  tell (first application process whose bundle identifier is ${quote(TEAMS_BUNDLE_ID)})
    if frontmost is false then error "Teams is not in front."
    ${stroke}
  end tell
end tell`,
  );
}

/**
 * Types any text, umlauts and emoji included, by pasting it. The clipboard is
 * restored afterwards, so the user's own clipboard survives.
 */
export async function typeText(text: string): Promise<void> {
  const previous = await Clipboard.read().catch(() => undefined);
  await Clipboard.copy(text, { concealed: true });
  await press({ char: "v" }, ["command"]);
  await pause(250);
  if (previous?.file) await Clipboard.copy({ file: previous.file }, { concealed: true });
  else if (previous?.html) await Clipboard.copy({ html: previous.html, text: previous.text }, { concealed: true });
  else if (previous?.text) await Clipboard.copy(previous.text, { concealed: true });
}

/** Remembers the app in front, so it can come back after a quick trip to Teams. */
export async function rememberFrontApp(): Promise<string | undefined> {
  const front = await getFrontmostApplication().catch(() => undefined);
  return front && front.bundleId !== TEAMS_BUNDLE_ID ? front.bundleId : undefined;
}

export async function returnTo(bundleId: string | undefined): Promise<void> {
  if (!bundleId) return;
  await runAppleScript(`tell application id ${quote(bundleId)} to activate`).catch(() => undefined);
}

/**
 * Opens a teams.microsoft.com link in the desktop app instead of the browser.
 * The msteams: scheme is what the "Open in app" button on the web page uses.
 */
export async function openInTeams(httpsUrl: string): Promise<void> {
  if (!(await isTeamsRunning()) && !(await isTeamsInstalled())) {
    throw new TeamsError(
      "Microsoft Teams is not installed. Microsoft Teams Keys works with the new Teams desktop app.",
    );
  }
  await open(httpsUrl.replace(/^https:/, "msteams:"));
}
