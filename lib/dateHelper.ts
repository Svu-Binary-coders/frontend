export const timeFormatFn = (
  timestamp: number | string | Date,
  format: "12h" | "24h",
) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
//   check if date is valid
  if (isNaN(date.getTime())) return "";

  const hours = date.getHours();
  const minutes = date.getMinutes();
  if (format === "12h") {
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  } else {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }
};
