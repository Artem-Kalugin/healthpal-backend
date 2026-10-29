/** `HH:MM:SS` из колонки `time` → `HH:MM`. */
export const toHourMinute = (time: string) => time.slice(0, 5);
