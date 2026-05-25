/**
 * Detects if the application is running inside the ElectroBun desktop shell
 */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Electrobun;
}
