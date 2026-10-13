import { Action, ActionPanel, Color, Icon, Keyboard, List, closeMainWindow, open, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { CalendarAccessError, Meeting, teamsMeetings } from "./lib/calendar";
import { openInTeams } from "./lib/teams";

const DAYS_AHEAD = 7;

function dayTitle(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function time(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(meetings: Meeting[]): [string, Meeting[]][] {
  const groups = new Map<string, Meeting[]>();
  for (const meeting of meetings) {
    const title = dayTitle(meeting.start);
    groups.set(title, [...(groups.get(title) ?? []), meeting]);
  }
  return [...groups.entries()];
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = new Date(from.getTime() + (DAYS_AHEAD + 1) * 86_400_000);
    // Meetings that are already over today are left out.
    return (await teamsMeetings(from, to)).filter((m) => m.end > now);
  });

  const now = new Date();

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search meetings">
      {error ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title={error instanceof CalendarAccessError ? "No access to your calendars" : "Could not read your calendars"}
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Privacy Settings"
                icon={Icon.Lock}
                onAction={() => open("x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars")}
              />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Teams meetings"
          description={`Nothing with a Teams link in the next ${DAYS_AHEAD} days. Meetings come from the Calendar app, so your work account has to be added there.`}
        />
      )}
      {groupByDay(data ?? []).map(([day, meetings]) => (
        <List.Section key={day} title={day}>
          {meetings.map((meeting) => {
            const running = meeting.start <= now && meeting.end > now;
            return (
              <List.Item
                key={meeting.id}
                title={meeting.title}
                subtitle={meeting.allDay ? "All day" : `${time(meeting.start)} – ${time(meeting.end)}`}
                icon={{ source: Icon.Video, tintColor: running ? Color.Green : undefined }}
                accessories={[
                  ...(running ? [{ tag: { value: "Now", color: Color.Green } }] : []),
                  { text: meeting.calendar },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Join Meeting"
                      icon={Icon.Video}
                      onAction={async () => {
                        await closeMainWindow();
                        try {
                          await openInTeams(meeting.link);
                          await showHUD(`Joining ${meeting.title}`);
                        } catch (joinError) {
                          await showFailureToast(joinError, { title: "Could not join the meeting" });
                        }
                      }}
                    />
                    <Action.CopyToClipboard title="Copy Meeting Link" content={meeting.link} />
                    <Action.OpenInBrowser title="Open in Browser" url={meeting.link} />
                    <Action
                      title="Reload"
                      icon={Icon.ArrowClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
