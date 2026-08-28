export type CatalogFile = {
  name: string;
  path: string;
  blurb: string;
  markdown: string;
};

export type CatalogResponse = {
  files: Record<string, string>;
  items: Array<{ name: string; path: string; blurb: string }>;
};
