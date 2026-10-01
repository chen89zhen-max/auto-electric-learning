import type { Metadata } from 'next';
import './globals.css';
import './training-visuals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://neev-technician-onboarding.zippy-hinny-9086.chatgpt.site'),
  title: '汽车电工电子闯关实训',
  description: '汽车电工电子基础：课程闯关、考纲关卡索引与低压故障练习工单',
  openGraph: {
    title: '汽车电工电子闯关实训',
    description: '汽车电工电子基础：课程闯关、考纲关卡索引与低压故障练习工单',
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
