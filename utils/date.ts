export const getDateLabel = (date: string | Date): string => {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (sameDay(msgDate, today)) return "Today";
  if (sameDay(msgDate, yesterday)) return "Yesterday";

  return msgDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
};

export const formatTime = (date: string | Date): string => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const groupMessagesByDate = <T extends { createdAt?: string }>(
  messages: T[]
): { label: string; messages: T[] }[] => {
  const groups: { label: string; messages: T[] }[] = [];
  messages.forEach((msg) => {
    if (!msg.createdAt) return;
    const label = getDateLabel(msg.createdAt);
    const existing = groups.find((g) => g.label === label);
    if (existing) existing.messages.push(msg);
    else groups.push({ label, messages: [msg] });
  });
  return groups;
};