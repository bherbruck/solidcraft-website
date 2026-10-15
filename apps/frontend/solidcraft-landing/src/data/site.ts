export const site = {
  name: 'SolidCraft',
  url: 'https://solidcraft.io',
  // Documentation is hosted separately from the marketing site.
  app: 'https://bherbruck.github.io/solidcraft/app/',
  docs: 'https://docs.solidcraft.io/',
  repo: 'https://github.com/bherbruck/solidcraft',
  kernel: 'https://github.com/bherbruck/solidcore',
  progress: 'https://bherbruck.github.io/solidcore/',
  releases: 'https://github.com/bherbruck/solidcraft/releases',
} as const;

export const guide = (chapter: string) => `${site.docs}guide/${chapter}.html`;
export const nav = [
  { label: 'Features', href: '/features/' },
  { label: 'MCP', href: '/mcp/' },
  { label: 'SolidCore', href: '/solidcore/' },
  { label: 'Docs', href: site.docs },
  { label: 'GitHub', href: site.repo },
];
export const routes = ['/', '/features/', '/mcp/', '/solidcore/', '/download/', '/showcase/', '/showcase/pi-enclosure/', '/showcase/selene/', '/releases/', '/docs/', '/disclaimer/', '/licenses/', '/privacy/'];
