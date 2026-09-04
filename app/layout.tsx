import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://neev-technician-onboarding.zippy-hinny-9086.chatgpt.site'),
  title: '维修中心第一天｜见习技师入职训练',
  description: '新能源汽车电工电子游戏化学习系统 Sprint 0',
  openGraph: {
    title: '维修中心第一天｜见习技师入职训练',
    description: '新能源汽车电工电子游戏化学习系统 Sprint 0',
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
