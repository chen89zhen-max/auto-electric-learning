import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('speech replay uses the preferred male voice and mute persists across reload', async ({ page }) => {
  await page.addInitScript(() => {
    type SpeechCall = { text: string; pitch: number; rate: number; voiceName: string | null };
    const target = window as typeof window & { __speechCalls?: SpeechCall[] };
    target.__speechCalls = [];
    class MockUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: { name: string; lang: string } | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) { this.text = text; }
    }
    const yunyang = { name: 'Microsoft Yunyang Online (Natural) - Chinese (Mainland)', lang: 'zh-CN' };
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        paused: false,
        onvoiceschanged: null,
        getVoices: () => [yunyang, { name: 'Microsoft Kangkang', lang: 'zh-CN' }],
        cancel: () => {}, pause: () => {}, resume: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
        speak: (utterance: MockUtterance) => {
          target.__speechCalls?.push({
            text: utterance.text,
            pitch: utterance.pitch,
            rate: utterance.rate,
            voiceName: utterance.voice?.name ?? null,
          });
          setTimeout(() => utterance.onend?.(), 0);
        },
      },
    });
  });

  await login(page, 'teacher');
  await page.goto('/?level=C01');
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __speechCalls?: unknown[] }).__speechCalls?.length ?? 0)).toBeGreaterThan(0);
  const first = await page.evaluate(() => (window as typeof window & { __speechCalls?: Array<{ pitch: number; rate: number; voiceName: string }> }).__speechCalls?.[0]);
  expect(first).toMatchObject({ pitch: 0.88, rate: 1 });
  expect(first?.voiceName).toContain('Yunyang');

  const beforeReplay = await page.evaluate(() => (window as typeof window & { __speechCalls?: unknown[] }).__speechCalls?.length ?? 0);
  await page.getByTestId('speech-play-btn').click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __speechCalls?: unknown[] }).__speechCalls?.length ?? 0)).toBeGreaterThan(beforeReplay);

  await page.getByTestId('speech-mute-btn').click();
  await expect(page.getByTestId('speech-mute-btn')).toHaveAttribute('aria-label', '取消静音');
  await page.reload();
  await expect(page.getByTestId('speech-mute-btn')).toHaveAttribute('aria-label', '取消静音');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('auto_elec_speech_preferences_v2') ?? '{}').muted)).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { __speechCalls?: unknown[] }).__speechCalls?.length ?? 0)).toBe(0);
});

test('unsupported speech keeps the written guidance and shows a non-blocking fallback', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
  });
  await login(page, 'teacher');
  await page.goto('/?level=C01');
  await page.getByTestId('speech-play-btn').click();
  await expect(page.getByTestId('unsupported-speech-toast')).toContainText('已保持文字指引');
  await expect(page.getByText(/客户抱怨新换的前照灯/)).toBeVisible();
});

test('delayed level chunk shows the loading skeleton and then recovers', async ({ page }) => {
  await login(page, 'teacher');
  await page.route('**/*D05Experience*.js', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/?level=D05');
  await expect(page.getByText('正在装载实训工位资源…')).toBeVisible();
  await expect(page.getByText('D05 变压器实验室——变压器认知与测试')).toBeVisible();
});
