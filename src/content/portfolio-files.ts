export function mapContentModules(
  modules: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(modules).map(([path, value]) => [
      path.replace(/^\/content\/home\/ata/, "/home/ata"),
      value,
    ]),
  );
}

export function loadPortfolioFiles(): Record<string, string> {
  const modules = import.meta.glob("/content/home/ata/**/*.{md,txt,json}", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;

  return mapContentModules(modules);
}
