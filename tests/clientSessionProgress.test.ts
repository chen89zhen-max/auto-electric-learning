import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, loginUser, restoreSession, setCurrentUser } from '@/src/stores/authStore';
import { createBaseUserProgress, getUserProgress, saveUserProgress, submitLevelCompletion } from '@/src/stores/userProgressStore';
import { getDatabasePath } from '@/src/server/db/database';
import path from 'node:path';

const student = (username: string) => ({ username, realName: username, className: '测试班', role: 'student' as const });
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
afterEach(() => { setCurrentUser(null); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('客户端会话和成绩关联', () => {
  it('较早发出的登录请求晚返回时，不能覆盖较新的登录结果', async () => {
    const finish: Array<(response: Response) => void> = [];
    vi.stubGlobal('fetch', () => new Promise<Response>(resolve => finish.push(resolve)));
    const first = loginUser('甲', 'Example#123', 'student');
    const second = loginUser('乙', 'Example#123', 'student');
    finish[1](json({ success: true, user: student('乙'), progress: createBaseUserProgress('乙') }));
    await second;
    finish[0](json({ success: true, user: student('甲'), progress: createBaseUserProgress('甲') }));
    await first;
    expect(getCurrentUser()?.username).toBe('乙');
    expect(getUserProgress().traineeName).toBe('乙');
  });
  it('切换账号立即清空上一位学生的进度', () => {
    setCurrentUser(student('甲'));
    const progress = createBaseUserProgress('甲');
    progress.levels.LEVEL_00 = { status: 'completed', score: 72 };
    saveUserProgress(progress);
    setCurrentUser(student('乙'));
    expect(getUserProgress().levels.LEVEL_00.status).toBe('unlocked');
    expect(getUserProgress().traineeName).toBe('乙');
  });

  it('较晚返回的旧会话核验不得覆盖新登录身份', async () => {
    let finish!: (value: Response) => void;
    vi.stubGlobal('fetch', () => new Promise<Response>(resolve => { finish = resolve; }));
    const restoring = restoreSession(true);
    setCurrentUser(student('乙'));
    finish(json({ success: true, user: student('甲'), progress: createBaseUserProgress('甲') }));
    await restoring;
    expect(getCurrentUser()?.username).toBe('乙');
  });

  it('成绩写入过程中换账号，旧响应不能污染新账号的课程地图', async () => {
    setCurrentUser(student('甲'));
    let finish!: (value: Response) => void;
    vi.stubGlobal('fetch', () => new Promise<Response>(resolve => { finish = resolve; }));
    const saving = submitLevelCompletion('LEVEL_00', 72);
    setCurrentUser(student('乙'));
    finish(json({ projection: { ...createBaseUserProgress('甲'), levels: { LEVEL_00: { status: 'completed', score: 72 } } } }));
    await expect(saving).rejects.toThrow('账号');
    expect(getUserProgress().traineeName).toBe('乙');
    expect(getUserProgress().levels.LEVEL_00.status).toBe('unlocked');
  });

  it('网络失败后重试使用同一事件编号，防止已写入但响应丢失时无法补存', async () => {
    setCurrentUser(student('甲'));
    const projection = createBaseUserProgress('甲');
    projection.levels.LEVEL_00 = { status: 'completed', score: 72 };
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(json({ projection }));
    vi.stubGlobal('fetch', fetcher);
    await expect(submitLevelCompletion('LEVEL_00', 72)).rejects.toThrow('offline');
    await submitLevelCompletion('LEVEL_00', 72);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).eventId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).eventId);
    expect(getUserProgress().levels.LEVEL_00.score).toBe(72);
  });

  it('已完成关卡再次练习保留原成绩，不再发出被服务端拒绝的重复完成事件', async () => {
    setCurrentUser(student('甲'));
    const progress = createBaseUserProgress('甲');
    progress.levels.LEVEL_00 = { status: 'completed', score: 72 };
    saveUserProgress(progress);
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const result = await submitLevelCompletion('LEVEL_00', 100);
    expect(result.levels.LEVEL_00.score).toBe(72);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('开发验收数据库遵守显式数据目录，不误写日常数据', () => {
    const directory = path.resolve('tmp/client-isolation-test');
    vi.stubEnv('APP_DATA_DIR', directory);
    expect(getDatabasePath()).toBe(path.join(directory, 'app.db'));
  });
});
