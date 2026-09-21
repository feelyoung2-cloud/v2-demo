import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '머물다 — 작은 안부가 모이는 곳', description: '잠시 들른 당신의 이야기를 남겨주세요. 누구나 함께 쓰는 방명록.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="ko"><body>{children}</body></html>;
}
