import { notFound } from 'next/navigation';

export const metadata = { title: '维修中心第一天｜沉浸式车间样板' };

export default function WorkshopPreviewPage() {
  // 用户暂停此样板：保留实现和素材，但不开放预览路由。
  notFound();
}
