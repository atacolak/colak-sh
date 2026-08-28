import type { PortfolioImage } from "../content/github-readme";

let viewed: PortfolioImage[] = [];
const listeners = new Set<(images: PortfolioImage[]) => void>();

export function setViewedImages(images: PortfolioImage[]): void {
  viewed = images;
  for (const listener of listeners) listener(viewed);
}

export function getViewedImages(): PortfolioImage[] {
  return viewed;
}

export function onViewedImages(
  listener: (images: PortfolioImage[]) => void,
): () => void {
  listeners.add(listener);
  listener(viewed);
  return () => {
    listeners.delete(listener);
  };
}
