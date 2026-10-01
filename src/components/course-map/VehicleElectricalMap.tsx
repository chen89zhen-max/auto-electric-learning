import React from 'react';
import type { ChapterId } from '@/src/courses/registry';
import { CourseChapterNode } from './CourseChapterNode';
import { CourseMapCar } from './CourseMapCar';
import { COURSE_MAP_LAYOUT, LEVEL_CHECKPOINTS_LAYOUT, PROVING_TRACK_PATH } from './courseMapLayout';
import { MAP_HEIGHT, MAP_WIDTH, ROUTE_LENGTH } from './courseMapGeometry';
import type { CourseMapChapterModel, CourseMapLevelModel } from './courseMapModel';
import styles from './CourseMapLobby.module.css';

interface VehicleElectricalMapProps {
  chapters: CourseMapChapterModel[];
  selectedChapterId: ChapterId;
  activeLevelId?: string;
  driveFromLevelId?: string | null;
  focusedLevelId?: string;
  onSelectChapter: (chapterId: ChapterId) => void;
  onPreviewChapter: (chapterId: ChapterId | null) => void;
  onSelectLevel?: (level: CourseMapLevelModel) => void;
  children?: React.ReactNode;
}
const stateLabels = { completed: '已完成', current: '当前推荐', available: '可学习', locked: '未解锁', construction: '建设中' };
const stateColors = { completed: '#34d399', current: '#fbbf24', available: '#67e8f9', locked: '#a8b5c9', construction: '#c4b5fd' };

export function VehicleElectricalMap({ chapters, selectedChapterId, activeLevelId, driveFromLevelId,
  focusedLevelId, onSelectChapter, onPreviewChapter, onSelectLevel, children }: VehicleElectricalMapProps) {
  const allLevels = chapters.flatMap(chapter => chapter.levels);
  const levelMap = new Map(allLevels.map(level => [level.id, level]));
  const activeLevel = levelMap.get(activeLevelId ?? '') ?? allLevels.find(level => level.state === 'current') ?? allLevels[0];
  const activeCheckpoint = LEVEL_CHECKPOINTS_LAYOUT.find(cp => cp.levelId === activeLevel?.id) ?? LEVEL_CHECKPOINTS_LAYOUT[0];
  const activeIndex = LEVEL_CHECKPOINTS_LAYOUT.indexOf(activeCheckpoint);
  const previousDistance = LEVEL_CHECKPOINTS_LAYOUT[activeIndex - 1]?.distance ?? 0;
  const checkpointRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const handleMove = (chapterId: ChapterId, direction: -1 | 1) => {
    const index = chapters.findIndex(chapter => chapter.id === chapterId);
    const next = chapters[(index + direction + chapters.length) % chapters.length];
    document.querySelector<HTMLButtonElement>(`[data-course-chapter="${next.letter}"]`)?.focus();
  };
  const selectCheckpoint = (level: CourseMapLevelModel) => onSelectLevel?.(level);
  const handleCheckpointKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const visible = LEVEL_CHECKPOINTS_LAYOUT.filter(cp => levelMap.has(cp.levelId));
    const current = visible.findIndex(cp => cp.levelId === LEVEL_CHECKPOINTS_LAYOUT[index].levelId);
    const next = visible[(current + direction + visible.length) % visible.length];
    checkpointRefs.current.get(next.levelId)?.focus();
  };

  return (
    <section data-testid="course-map-stage" aria-label="课程学习路线地图" className={styles.mapStage}>
      <div className={styles.mapIntro}>
        <span>实训之路 <small>O → A → B → C → D → E → F</small></span>
        <span>座驾停在当前进度 · 点关卡查看任务</span>
      </div>
      <div className={styles.vehicleCanvasWrapper} aria-label="横向浏览课程地图">
        <div className={styles.vehicleCanvas}>
          <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className={styles.vehicleSvg} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <filter id="map-glow"><feGaussianBlur stdDeviation="2" /></filter>
            </defs>
            <image href="/assets/course-map/course-map-25d-v2.png" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} preserveAspectRatio="none" />
            <g id="workshop-lighting-system" pointerEvents="none">
              {chapters.map(chapter => {
                const layout = COURSE_MAP_LAYOUT[chapter.id];
                const completed = chapter.state === 'completed', current = chapter.state === 'current';
                if ((!completed && !current) || !layout.windowPolygon) return null;
                return <g key={chapter.id}>
                  <polygon points={layout.windowPolygon} fill={completed ? '#34d399' : '#fbbf24'} opacity="0.18" />
                  <ellipse cx={layout.doorX} cy={layout.doorY} rx="19" ry="5" fill={completed ? '#34d399' : '#fbbf24'} opacity="0.55" filter="url(#map-glow)" />
                </g>;
              })}
            </g>
            <g id="circuit-paths" pointerEvents="none">
              <path d={PROVING_TRACK_PATH} fill="none" stroke="#c9deed" strokeOpacity="0.65" strokeWidth="2" strokeDasharray="5 9" />
              {LEVEL_CHECKPOINTS_LAYOUT.map((cp, index) => {
                if (levelMap.get(cp.levelId)?.state !== 'completed') return null;
                const start = LEVEL_CHECKPOINTS_LAYOUT[index - 1]?.distance ?? 0;
                return <path key={cp.levelId} d={PROVING_TRACK_PATH} pathLength={ROUTE_LENGTH} fill="none" stroke="#34d399" strokeWidth="3"
                  strokeDasharray={`0 ${start} ${cp.distance - start} ${ROUTE_LENGTH}`} />;
              })}
              <path d={PROVING_TRACK_PATH} pathLength={ROUTE_LENGTH} fill="none" stroke="#fbbf24" strokeWidth="3"
                strokeDasharray={`0 ${previousDistance} ${activeCheckpoint.distance - previousDistance} ${ROUTE_LENGTH}`} />
            </g>
            <g id="track-checkpoints">
              {LEVEL_CHECKPOINTS_LAYOUT.map(cp => {
                const level = levelMap.get(cp.levelId);
                if (!level) return null;
                const current = cp.levelId === activeCheckpoint.levelId;
                const focused = cp.levelId === focusedLevelId;
                const color = stateColors[level.state];
                return <g key={cp.levelId} transform={`translate(${cp.svgX}, ${cp.svgY})`}>
                  {(current || focused) && <ellipse rx="20" ry="10" fill={current ? '#fbbf24' : '#67e8f9'} opacity="0.22" />}
                  <ellipse rx="10" ry="6" fill="#10232f" stroke={color} strokeWidth="1.6" />
                  {level.state === 'completed' ? <path d="M -4 0 L -1 2 L 4 -3" stroke={color} strokeWidth="1.8" fill="none" /> : <circle r="2" fill={color} />}
                </g>;
              })}
            </g>
            <text x="152" y="278" fill="#d1fae5" fontSize="11" fontWeight="bold">起点</text>
            <text x="1253" y="621" fill="#d1fae5" fontSize="11" fontWeight="bold">交付终点</text>
          </svg>
          <CourseMapCar key={`${activeCheckpoint.levelId}:${driveFromLevelId ?? ''}`} activeLevelId={activeCheckpoint.levelId} driveFromLevelId={driveFromLevelId} />
          {LEVEL_CHECKPOINTS_LAYOUT.map((cp, index) => {
            const level = levelMap.get(cp.levelId);
            if (!level) return null;
            const current = cp.levelId === activeCheckpoint.levelId;
            return <button key={cp.levelId} type="button"
              ref={element => { if (element) checkpointRefs.current.set(cp.levelId, element); else checkpointRefs.current.delete(cp.levelId); }}
              data-map-checkpoint={cp.levelId} data-state={level.state}
              className={styles.checkpointButton}
              style={{ left: `${cp.xPct}%`, top: `${(cp.svgY + (current ? 31 : 16)) / MAP_HEIGHT * 100}%` }}
              aria-label={`${cp.levelId} ${level.title}，${stateLabels[level.state]}，查看任务`}
              aria-pressed={focusedLevelId === cp.levelId} aria-current={current ? 'step' : undefined}
              title={`${level.title} · ${stateLabels[level.state]}`}
              onKeyDown={event => handleCheckpointKey(event, index)} onClick={() => selectCheckpoint(level)}>
              {cp.levelId}<span className={styles.checkpointStatus}>{level.state === 'completed' ? ' ✓' : level.state === 'locked' ? ' ·' : ''}</span>
            </button>;
          })}
          {chapters.map(chapter => {
            const layout = COURSE_MAP_LAYOUT[chapter.id];
            return <CourseChapterNode key={chapter.id} chapter={chapter} selected={selectedChapterId === chapter.id}
              position={{ x: layout.x, y: layout.y }} onSelect={onSelectChapter} onPreview={onPreviewChapter} onMove={handleMove} />;
          })}
        </div>
      </div>
      {children && <div className={styles.missionHudSlot}>{children}</div>}
      <p className={styles.mapScrollHint}>左右滑动查看全图 · 点击编号预览任务</p>
      <div className={styles.teleportTrack} aria-label="篇章快速导航">
        <span className={styles.teleportLabel}>篇章导航</span>
        <div className={styles.teleportButtons}>{chapters.map((chapter, index) => <React.Fragment key={chapter.id}>
          {index > 0 && <span className={styles.teleportArrow} aria-hidden="true">→</span>}
          <button type="button" onClick={() => onSelectChapter(chapter.id)} className={`${styles.teleportBtn} ${selectedChapterId === chapter.id ? styles.teleportBtnActive : ''}`} title={`${chapter.num}：${chapter.title}`}>
            <span className={styles.teleportLetter}>{chapter.letter}</span><span className={styles.teleportName}>{chapter.title}</span>
          </button>
        </React.Fragment>)}</div>
      </div>
      <p className={styles.diagramDisclaimer}>道路表示课程学习顺序，不代表车辆电路连接或真实布线。</p>
    </section>
  );
}
