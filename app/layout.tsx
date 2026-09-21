import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '배움제안 — 희망하는 직무연수', description: '희망하는 직무연수 주제와 내용, 연수 방식을 제안하고 함께 확인하는 공간입니다.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="ko"><body>{children}</body></html>;
}
