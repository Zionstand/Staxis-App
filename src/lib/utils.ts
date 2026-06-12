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
