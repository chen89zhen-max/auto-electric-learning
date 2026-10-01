import { CANONICAL_COURSE_REGISTRY, getCourseLevel, normalizeLevelId } from './registry';

export const COURSE_NAME = '汽车电工电子闯关实训';
export const EXAM_NAME = '重庆2027汽车类';
export type LearningRoute = 'course' | 'exam';

export interface TextbookTask {
  id: number;
  title: string;
  examTitle?: string;
  filePages: number;
  theoryPage: number;
  requirements: string[];
}

// 标题按教材正文；页数是扫描文件总页数，不冒充目标所在页序。
export const TEXTBOOK_TASKS: TextbookTask[] = [
  { id: 1, title: '安全用电', filePages: 15, theoryPage: 5, requirements: ['了解触电类型、事故规律与现场急救；掌握脱离触电电源的方法。', '了解电气火灾原因、灭火注意事项和灭火器选用。'] },
  { id: 2, title: '电路的认知', filePages: 6, theoryPage: 6, requirements: ['掌握电路的基本组成。'] },
  { id: 3, title: '电阻的识别和测量', filePages: 14, theoryPage: 6, requirements: ['了解电阻识别方法；掌握万用表测量电阻的方法。', '了解力敏、热敏、光敏电阻。'] },
  { id: 4, title: '电压和电流的分析与测量', filePages: 18, theoryPage: 6, requirements: ['了解电压、电位、电动势及万用表测量电流、电压的方法。', '了解钳形电流表测电流的规范。'] },
  { id: 5, title: '欧姆定律的应用', filePages: 8, theoryPage: 6, requirements: ['掌握部分电路欧姆定律；理解全电路欧姆定律。'] },
  { id: 6, title: '负载的连接', filePages: 16, theoryPage: 6, requirements: ['理解电阻的串联、并联和混联电路。'] },
  { id: 7, title: '电能和电功率的分析', filePages: 9, theoryPage: 6, requirements: ['理解电能、电功率概念；掌握电流和功率消耗的计算。', '了解串并联功率分配及焦耳定律。'] },
  { id: 8, title: '电压降的分析', filePages: 9, theoryPage: 6, requirements: ['了解电压降产生的原因；理解电压降与电阻、电流的关系。'] },
  { id: 9, title: '电路的检查', filePages: 9, theoryPage: 6, requirements: ['掌握断路、接触不良、短路的检测方法。'] },
  { id: 10, title: '电容器及其特性的分析', filePages: 13, theoryPage: 6, requirements: ['了解电容基本知识、充放电特性；掌握电容器识别和检测方法。'] },
  { id: 11, title: '磁现象的探究', examTitle: '磁现象的认知', filePages: 11, theoryPage: 6, requirements: ['了解磁现象和电流磁效应；理解继电器工作原理（要求跨第6—7页）。'] },
  { id: 12, title: '电动机的认知', filePages: 16, theoryPage: 7, requirements: ['了解磁场对电流的作用。', '了解直流电动机、三相异步电动机的结构和工作原理。'] },
  { id: 13, title: '交流发电机的认知', filePages: 29, theoryPage: 7, requirements: ['了解单相、三相交流电基本知识及汽车交流发电机结构和工作原理。'] },
  { id: 14, title: '自感与互感现象的分析', filePages: 15, theoryPage: 7, requirements: ['了解自感、互感；掌握点火线圈结构和工作原理。'] },
  { id: 15, title: '二极管及其应用的分析', filePages: 17, theoryPage: 7, requirements: ['掌握二极管工作特性和检测方法；了解发光、稳压二极管。', '理解单相半波、单相桥式全波及三相整流。'] },
  { id: 16, title: '三极管及其应用的分析', filePages: 8, theoryPage: 7, requirements: ['掌握三极管工作特性；了解三极管的应用。'] },
  { id: 17, title: '逻辑门电路的认知', filePages: 7, theoryPage: 7, requirements: ['了解与门、或门、非门，以及与非门、或非门。'] },
  { id: 18, title: '印制电路板的焊接', filePages: 10, theoryPage: 7, requirements: ['了解电烙铁使用、元器件插装与焊接、焊点质量鉴别。'] },
  { id: 19, title: '变压器的认知', filePages: 13, theoryPage: 7, requirements: ['了解变压器分类、结构及符号、绕组检测、输入输出特性。'] },
];

export interface LevelCurriculum {
  textbookTaskIds: number[];
  examRequired: boolean;
  scopeNote?: string;
}

const LEVEL_CURRICULUM: Record<string, LevelCurriculum> = {
  O00: { textbookTaskIds: [], examRequired: false, scopeNote: '课程导入与工位规范，为后续实训作准备。' },
  O01: { textbookTaskIds: [1], examRequired: true, scopeNote: '仿真用于安全判断；急救实物技能需教师现场指导与评价。' },
  A01: { textbookTaskIds: [2], examRequired: true },
  A02: { textbookTaskIds: [4], examRequired: true, scopeNote: '本关侧重数字表电压测量。指针表读数需配合课堂练习。' },
  A03: { textbookTaskIds: [3], examRequired: true },
  A04: { textbookTaskIds: [4], examRequired: true },
  B01: { textbookTaskIds: [5], examRequired: true },
  B02: { textbookTaskIds: [6], examRequired: true },
  B03: { textbookTaskIds: [4, 6], examRequired: false, scopeNote: '教材中的节点、回路分析训练；本版考纲未单列基尔霍夫定律。' },
  B04: { textbookTaskIds: [7], examRequired: true },
  B05: { textbookTaskIds: [5], examRequired: true },
  B06: { textbookTaskIds: [3, 6], examRequired: false, scopeNote: '分压与传感器应用训练，支持电路理解；本版考纲未单列该工单。' },
  C01: { textbookTaskIds: [8], examRequired: true },
  C02: { textbookTaskIds: [9], examRequired: true },
  C03: { textbookTaskIds: [2, 3, 4, 5, 6, 7, 8, 9], examRequired: true, scopeNote: '综合直流工单抽取相关目标，不代表逐项考完所有教材目标。' },
  D01: { textbookTaskIds: [11], examRequired: true },
  D02: { textbookTaskIds: [12], examRequired: true, scopeNote: '电机原理与低压控制训练；不等同于新能源汽车电驱拆装考核。' },
  D03: { textbookTaskIds: [13], examRequired: true },
  D04: { textbookTaskIds: [14], examRequired: true },
  D05: { textbookTaskIds: [19], examRequired: true, scopeNote: '教材标星号拓展，但重庆2027理论考纲任务19明确要求学习。' },
  E01: { textbookTaskIds: [15], examRequired: true },
  E02: { textbookTaskIds: [10], examRequired: true },
  E03: { textbookTaskIds: [15, 10, 13], examRequired: true },
  E04: { textbookTaskIds: [16], examRequired: true },
  E05: { textbookTaskIds: [17], examRequired: true },
  E06: { textbookTaskIds: [13], examRequired: false, scopeNote: '教材要求磁电式与霍尔式转速传感器；本版理论考纲未单列传感器条款。' },
  E07: { textbookTaskIds: [18], examRequired: true, scopeNote: '虚拟插装和焊点判断与教师实物焊接评价分开记录。' },
  F01: { textbookTaskIds: [1, 2, 4, 5, 6, 8, 9, 11, 15, 16, 17, 18], examRequired: false, scopeNote: '智能检修灯综合样本工单；本关通过不代表全课程、全部考纲或官方考试通过。' },
};

export function getLevelCurriculum(levelId: string): LevelCurriculum | undefined {
  return LEVEL_CURRICULUM[normalizeLevelId(levelId)];
}

export function getRouteProgress(completedIds: string[], route: LearningRoute) {
  const completed = new Set(completedIds.map(normalizeLevelId));
  const required = CANONICAL_COURSE_REGISTRY.filter(level => route === 'exam'
    ? getLevelCurriculum(level.canonicalId)?.examRequired
    : level.curriculumRequirement !== 'elective');
  const missingIds = required.filter(level => !completed.has(level.canonicalId)).map(level => level.canonicalId);
  return { completed: required.length - missingIds.length, total: required.length, missingIds };
}

export function getNextLevelLabel(levelId: string): string | undefined {
  const index = CANONICAL_COURSE_REGISTRY.findIndex(level => level.canonicalId === normalizeLevelId(levelId));
  if (index < 0) return undefined;
  const next = CANONICAL_COURSE_REGISTRY[index + 1];
  return next ? `推荐下一关：${next.canonicalId} ${next.title}（按先修条件开放）`
    : '本关综合工单已完成；返回课程地图查看各关记录与未完成目标。';
}

export function getLevelDisplayName(levelId: string) {
  const level = getCourseLevel(levelId);
  return level ? `${level.canonicalId} ${level.title}` : levelId;
}

export function getLevelCurriculumSummary(levelId: string): string {
  const normId = normalizeLevelId(levelId);
  const curriculum = LEVEL_CURRICULUM[normId];
  if (!curriculum || curriculum.textbookTaskIds.length === 0) {
    return curriculum?.scopeNote ?? '课程导入与工位规范，为后续实训作准备。';
  }

  const tasks = curriculum.textbookTaskIds
    .map(id => TEXTBOOK_TASKS.find(t => t.id === id))
    .filter((t): t is TextbookTask => Boolean(t));

  if (normId === 'F01') {
    return '智能检修灯综合实训（抽取相关目标，非全项覆盖）';
  }

  if (normId === 'C03') {
    return '直流电路综合检修（抽取任务2~9相关目标，非全项覆盖）';
  }

  if (tasks.length === 1) {
    const t = tasks[0];
    const electiveSuffix = normId === 'D05' ? '，教材拓展/重庆2027备考必学' : '';
    return `学习任务${t.id} ${t.title}（扫描文件共${t.filePages}页${electiveSuffix}，相关目标）`;
  }

  const taskNames = tasks.map(t => `任务${t.id}`).join('、');
  const pageList = tasks.map(t => `${t.filePages}页`).join('/');
  return `学习${taskNames} 相关目标（扫描文件共${pageList}）`;
}

