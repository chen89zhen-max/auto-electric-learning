import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://neev-technician-onboarding.zippy-hinny-9086.chatgpt.site'),
  title: '新能源汽车电工电子｜安全用电实训',
  description: '新能源汽车电工电子 AI 游戏化学习系统 Sprint 0—1',
  openGraph: {
    title: '新能源汽车电工电子｜安全用电实训',
    description: '新能源汽车电工电子 AI 游戏化学习系统 Sprint 0—1',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
