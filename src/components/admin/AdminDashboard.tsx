'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  Key,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/src/stores/authStore';
import type { UserProgressData } from '@/src/stores/userProgressStore';

interface ClassItem {
  id: string;
  name: string;
  grade?: string;
  studentCount?: number;
}

interface StudentRecord {
  id?: string;
  username: string;
  realName: string;
  className: string;
  classId?: string;
  createdAt: number;
  progress: UserProgressData;
  completedLevelsCount: number;
  totalLevelsCount: number;
  avgScore: number;
  lastUpdated: number;
}

interface AdminResponse {
  success: boolean;
  error?: string;
  message?: string;
  stats?: {
    totalStudents: number;
    l0Passed: number;
    l1Passed: number;
    l2Passed: number;
    allPassed: number;
    l0Rate: number;
    l1Rate: number;
    l2Rate: number;
  };
  students?: StudentRecord[];
}

interface AdminDashboardProps {
  onReturnLobby: () => void;
}

export function AdminDashboard({ onReturnLobby }: AdminDashboardProps) {
  const { user, isAdmin } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<{
    totalStudents: number;
    l0Passed: number;
    l1Passed: number;
    l2Passed: number;
    allPassed: number;
    l0Rate: number;
    l1Rate: number;
    l2Rate: number;
  }>({
    totalStudents: 0,
    l0Passed: 0,
    l1Passed: 0,
    l2Passed: 0,
    allPassed: 0,
    l0Rate: 0,
    l1Rate: 0,
    l2Rate: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [activeStudent, setActiveStudent] = useState<StudentRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/admin?action=classes');
      const data = (await res.json()) as { success: boolean; classes?: ClassItem[] };
      if (data.success && data.classes) {
        setClassesList(data.classes);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchStudents = async (classFilter = selectedClass) => {
    try {
      const url = classFilter === 'ALL'
        ? '/api/admin?action=students'
        : `/api/admin?action=students&classId=${encodeURIComponent(classFilter)}`;
      const res = await fetch(url);
      const data = (await res.json()) as AdminResponse;
      if (data.success) {
        if (data.students) setStudents(data.students);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        await fetchClasses();
        const res = await fetch('/api/admin?action=students');
        const data = (await res.json()) as AdminResponse;
        if (!ignore && data.success) {
          if (data.students) setStudents(data.students);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        console.error('Initial load failed:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleResetProgress = async (student: StudentRecord) => {
    if (!window.confirm(`确定要重置学生【${student.realName}（${student.username}）】的关卡进度吗？重置后需从任务0重新开始。`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_progress', username: student.username }),
      });
      const data = (await res.json()) as AdminResponse;
      if (data.success) {
        setNotice(data.message || '进度已重置');
        setTimeout(() => setNotice(null), 4000);
        void fetchStudents();
        if (activeStudent?.username === student.username) {
          setActiveStudent(null);
        }
      }
    } catch (err) {
      console.error('Failed to reset progress:', err);
    }
  };

  const handleResetPassword = async (student: StudentRecord) => {
    const newPass = window.prompt(`请输入学生【${student.realName}】的新密码：`, '123456');
    if (!newPass) return;

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password', username: student.username, newPassword: newPass }),
      });
      const data = (await res.json()) as AdminResponse;
      if (data.success) {
        setNotice(data.message || '密码已重置');
        setTimeout(() => setNotice(null), 4000);
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const handleDeleteStudent = async (student: StudentRecord) => {
    if (!window.confirm(`警告：确定要彻底删除学生【${student.realName}】的档案记录吗？该操作不可恢复！`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_student', username: student.username }),
      });
      const data = (await res.json()) as AdminResponse;
      if (data.success) {
        setNotice(data.message || '学生档案已删除');
        setTimeout(() => setNotice(null), 4000);
        void fetchStudents();
        if (activeStudent?.username === student.username) {
          setActiveStudent(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  const handleExportCSV = () => {
    const url = selectedClass === 'ALL'
      ? '/api/admin?action=export_csv'
      : `/api/admin?action=export_csv&classId=${encodeURIComponent(selectedClass)}`;
    window.location.href = url;
  };

  // Filter students
  const classList = Array.from(new Set(students.map((s) => s.className))).filter(Boolean);
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.realName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.className.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === 'ALL' || s.className === selectedClass || s.classId === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-6 select-none">
      {/* Top Header */}
      <header className="w-full max-w-6xl bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onReturnLobby}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 h-9 rounded-xl"
          >
            <ArrowLeft size={16} />
            返回实训大厅
          </Button>

          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider font-mono">
                {isAdmin ? 'ADMIN MANAGEMENT DASHBOARD' : 'TEACHER CLASS DASHBOARD'}
              </span>
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                {isAdmin ? '系统管理员' : '任课教师'} · {user?.realName || user?.username || '教师'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 m-0">
              {isAdmin ? '汽车电工电子 · 全校学情与教学大屏' : '汽车电工电子 · 任教班级学情大屏'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              void fetchStudents();
            }}
            disabled={loading}
            className="text-xs font-bold border-slate-300 text-slate-700 h-9 rounded-xl"
          >
            <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新学情
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 h-9 rounded-xl shadow-sm"
          >
            <Download size={15} />
            导出全班成绩表 (Excel)
          </Button>
        </div>
      </header>

      {/* Status Notice */}
      {notice && (
        <div className="w-full max-w-6xl mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main KPI Stat Cards */}
      <div className="w-full max-w-6xl grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">注册学员总数</span>
            <strong className="text-2xl font-black text-slate-800 mt-1 block">
              {stats.totalStudents} <span className="text-xs text-slate-400 font-normal">人</span>
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">任务0 入职达标率</span>
            <strong className="text-2xl font-black text-slate-800 mt-1 block">
              {stats.l0Rate}% <span className="text-xs text-slate-400 font-normal">({stats.l0Passed}/{stats.totalStudents})</span>
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">任务1 安全用电通过率</span>
            <strong className="text-2xl font-black text-slate-800 mt-1 block">
              {stats.l1Rate}% <span className="text-xs text-slate-400 font-normal">({stats.l1Passed}/{stats.totalStudents})</span>
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">任务2 闭合回路达标率</span>
            <strong className="text-2xl font-black text-slate-800 mt-1 block">
              {stats.l2Rate}% <span className="text-xs text-slate-400 font-normal">({stats.l2Passed}/{stats.totalStudents})</span>
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="w-full max-w-6xl bg-white rounded-2xl border border-slate-200 p-3.5 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索学生姓名 / 学号 / 班级..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold text-slate-600">
          <label htmlFor="class-select" className="text-slate-600 font-bold">班级筛选：</label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedClass(val);
              setLoading(true);
              void fetchStudents(val);
            }}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none"
          >
            <option value="ALL">{isAdmin ? '全校所有班级' : '全部任教班级'} ({students.length}人)</option>
            {classesList.length > 0
              ? classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {typeof c.studentCount === 'number' ? `(${c.studentCount}人)` : ''}
                  </option>
                ))
              : classList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="w-full max-w-6xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-3 px-4">学号 / 账号</th>
                <th className="py-3 px-4">学生姓名</th>
                <th className="py-3 px-4">班级</th>
                <th className="py-3 px-4">通关进度</th>
                <th className="py-3 px-4">任务0 (入职)</th>
                <th className="py-3 px-4">任务1 (安全)</th>
                <th className="py-3 px-4">任务2 (回路)</th>
                <th className="py-3 px-4">最后活跃时间</th>
                <th className="py-3 px-4 text-center">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    {loading ? '正在加载班级数据...' : '没有找到匹配的学员档案'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const l0 = s.progress.levels['LEVEL_00'];
                  const l1 = s.progress.levels['LEVEL_01'];
                  const l2 = s.progress.levels['LEVEL_02'];

                  return (
                    <tr key={s.username} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.username}</td>
                      <td className="py-3 px-4">
                        <strong className="text-slate-900 font-bold text-sm block">{s.realName}</strong>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{s.className}</td>
                      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              s.completedLevelsCount === 3
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.completedLevelsCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            已通过 {s.completedLevelsCount} / 3 关
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {l0?.status === 'completed' ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> {l0.score || 100}分
                          </span>
                        ) : (
                          <span className="text-slate-400">未通关</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {l1?.status === 'completed' ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> {l1.score || 100}分
                          </span>
                        ) : (
                          <span className="text-slate-400">未通关</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {l2?.status === 'completed' ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> {l2.score || 100}分
                          </span>
                        ) : (
                          <span className="text-slate-400">未通关</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        <Clock size={12} className="inline mr-1" />
                        {new Date(s.lastUpdated).toLocaleString('zh-CN', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveStudent(s)}
                            className="h-7 px-2.5 text-[11px] font-bold border-slate-300 text-sky-700 hover:bg-sky-50"
                            title="查看该学员详细学情评测"
                          >
                            学情报告
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResetProgress(s)}
                            className="h-7 px-2 text-[11px] border-slate-300 text-amber-700 hover:bg-amber-50"
                            title="重置该学生关卡进度便于重训"
                            aria-label="重置该学生关卡进度"
                          >
                            <RotateCcw size={12} />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResetPassword(s)}
                                className="h-7 px-2 text-[11px] border-slate-300 text-slate-600 hover:bg-slate-100"
                                title="重置该学生密码"
                                aria-label="重置该学生密码"
                              >
                                <Key size={12} />
                              </Button>
                              {s.username !== 'guest' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteStudent(s)}
                                  className="h-7 px-2 text-[11px] border-slate-300 text-rose-600 hover:bg-rose-50"
                                  title="删除学生测试账号"
                                  aria-label="删除学生测试账号"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 m-0">
                    学员学情报告 · {activeStudent.realName}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    学号: {activeStudent.username} · 班级: {activeStudent.className}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveStudent(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full"
                aria-label="关闭学情报告"
              >
                ✕
              </button>
            </div>

            {/* Level Clearance Overview */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">任务0 准入规范</span>
                <strong className="text-base font-black text-slate-800 mt-1 block">
                  {activeStudent.progress.levels['LEVEL_00']?.status === 'completed' ? '已完成 (100分)' : '未完成'}
                </strong>
                <small className="text-[10px] text-slate-400 block mt-0.5">
                  {activeStudent.progress.levels['LEVEL_00']?.completedAt || '待通过'}
                </small>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">任务1 安全用电</span>
                <strong className="text-base font-black text-slate-800 mt-1 block">
                  {activeStudent.progress.levels['LEVEL_01']?.status === 'completed'
                    ? `已完成 (${activeStudent.progress.levels['LEVEL_01'].score || 100}分)`
                    : '未完成'}
                </strong>
                <small className="text-[10px] text-slate-400 block mt-0.5">
                  {activeStudent.progress.levels['LEVEL_01']?.completedAt || '待通过'}
                </small>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">任务2 闭合回路</span>
                <strong className="text-base font-black text-slate-800 mt-1 block">
                  {activeStudent.progress.levels['LEVEL_02']?.status === 'completed'
                    ? `已完成 (${activeStudent.progress.levels['LEVEL_02'].score || 100}分)`
                    : '未完成'}
                </strong>
                <small className="text-[10px] text-slate-400 block mt-0.5">
                  {activeStudent.progress.levels['LEVEL_02']?.completedAt || '待通过'}
                </small>
              </div>
            </div>

            {/* Teaching Advice */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed mb-5">
              💡 <strong>陈师傅教学评价与建议：</strong>
              {activeStudent.completedLevelsCount === 3
                ? `该学员已顺利通过基础任务与电路底层逻辑考核，具备独立接线、车身搭铁与断路分析能力，建议引导进入下一任务学习。`
                : activeStudent.completedLevelsCount > 0
                ? `该学员正在推进任务中，目前已完成 ${activeStudent.completedLevelsCount} 个关卡。建议重点关注其安全作业规范与回路接线要领。`
                : `该学员尚未开始实训考核，请提醒其登录并完成工位准入实训。`}
            </div>

            <div className="flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResetProgress(activeStudent)}
                className="text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                重置该学员进度
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveStudent(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-5"
              >
                关闭报告
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
