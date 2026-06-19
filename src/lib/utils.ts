export const greeting = (firstName: string) => {
  const hour = new Date().getHours();
  const time =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${time}, ${firstName}`;
};

export const daysUntil = (dateStr: string) =>
  Math.max(
    0,
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

export const fmtDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const fmtNaira = (n: number) => `₦${(n ?? 0).toLocaleString()}`;

export const fmtDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const fromNow = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDate(dateStr);
};

export const maskEmail = (email: string) => {
  const [name, domain] = email?.split('@') ?? [];
  if (!name || !domain) return email;

  const maskedName =
    name.length > 2
      ? name.slice(0, 2) + '*'.repeat(name.length - 2)
      : name[0] + '*';
  const maskedDomain =
    domain.length > 3
      ? domain[0] + '*'.repeat(domain.length - 2) + domain.slice(-4)
      : domain;

  return `${maskedName}@${maskedDomain}`;
};
