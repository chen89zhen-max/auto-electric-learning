import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LEVEL_CHECKPOINTS_LAYOUT } from './courseMapLayout';
import styles from './CourseMapLobby.module.css';
import { getRoutePose, getCarSpriteIndex, MAP_WIDTH, MAP_HEIGHT } from './courseMapGeometry';

interface CourseMapCarProps {
  activeLevelId: string;
  driveFromLevelId?: string | null;
}

interface CarPose { x: number; y: number; heading: number }

function getDriveStart(activeLevelId: string, driveFromLevelId?: string | null) {
  const targetIndex = LEVEL_CHECKPOINTS_LAYOUT.findIndex((checkpoint) => checkpoint.levelId === activeLevelId);
  const startIndex = LEVEL_CHECKPOINTS_LAYOUT.findIndex((checkpoint) => checkpoint.levelId === driveFromLevelId);
  return startIndex >= 0 && targetIndex > startIndex ? LEVEL_CHECKPOINTS_LAYOUT[startIndex] : null;
}

function showOnlyModel(frame: HTMLIFrameElement) {
  const document = frame.contentDocument;
  if (!document?.body) return;
  const present = () => {
    const viewport = document.querySelector<HTMLElement>('.viewport');
    const canvas = document.querySelector<HTMLCanvasElement>('#viewer-canvas');
    if (!viewport || !canvas) return false;
    document.body.replaceChildren(viewport, canvas);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#eef5fc';
    viewport.style.width = '100vw';
    viewport.style.height = '100vh';
    viewport.style.maxWidth = 'none';
    viewport.style.borderRadius = '0';
    frame.contentWindow?.scrollTo(0, 0);
    frame.contentWindow?.requestAnimationFrame(() => viewport.querySelector<HTMLButtonElement>('.stage-tools button')?.click());
    return true;
  };
  if (present()) return;
  const observer = new MutationObserver(() => {
    if (present()) observer.disconnect();
  });
  observer.observe(document.body, { attributes: true, childList: true, subtree: true });
}

export function CourseMapCar({ activeLevelId, driveFromLevelId }: CourseMapCarProps) {
  const checkpoint = LEVEL_CHECKPOINTS_LAYOUT.find(cp => cp.levelId === activeLevelId) ?? LEVEL_CHECKPOINTS_LAYOUT[0];
  const targetPose = getRoutePose(checkpoint.distance);
  const startCheckpoint = getDriveStart(activeLevelId, driveFromLevelId);
  const [pose, setPose] = useState<CarPose>(() => {
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return startCheckpoint && !reduced
      ? { x: startCheckpoint.svgX, y: startCheckpoint.svgY, heading: startCheckpoint.headingDeg ?? 0 }
      : targetPose;
  });
  const [motion, setMotion] = useState<'driving' | 'braking' | 'parked'>(() =>
    startCheckpoint && !(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ? 'driving' : 'parked');
  const [viewerOpen, setViewerOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // The parent keys the marker by journey, so initial state is already at the correct stop.
    if (!startCheckpoint || reduced) return;
    const startDistance = startCheckpoint.distance, endDistance = checkpoint.distance;
    const duration = Math.min(3600, Math.max(900, (endDistance - startDistance) * 7));
    const startedAt = performance.now();
    let frameId = 0, stopTimer = 0;
    const frame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
      setMotion('driving');
      setPose(getRoutePose(startDistance + (endDistance - startDistance) * eased));
      if (progress >= 1) {
        setMotion('braking');
        stopTimer = window.setTimeout(() => setMotion('parked'), 450);
      } else frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(frameId); window.clearTimeout(stopTimer); };
  }, [checkpoint, startCheckpoint]);

  useEffect(() => {
    if (!viewerOpen) return;
    const returnFocus = buttonRef.current;
    closeRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewerOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      returnFocus?.focus();
    };
  }, [viewerOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="查看仰望 U9 三维模型"
        title="查看仰望 U9 三维模型"
        className={styles.mapCarButton}
        data-motion={motion}
        data-level={checkpoint.levelId}
        data-heading={pose.heading.toFixed(2)}
        data-sprite={getCarSpriteIndex(pose.heading)}
        style={{ left: `${pose.x / MAP_WIDTH * 100}%`, top: `${pose.y / MAP_HEIGHT * 100}%` }}
        onClick={() => setViewerOpen(true)}
      >
        <span className={styles.mapCarShadow} aria-hidden="true" />
        <span className={styles.mapCarBody} aria-hidden="true" style={{
          backgroundPosition: `${getCarSpriteIndex(pose.heading) % 4 / 3 * 100}% ${Math.floor(getCarSpriteIndex(pose.heading) / 4) / 3 * 100}%`,
        }} />
      </button>
      {viewerOpen && typeof document !== 'undefined' && createPortal(
        <div className={styles.mapCarViewerBackdrop}>
          <button type="button" className={styles.mapCarViewerDismiss} aria-label="点击空白处关闭模型" onClick={() => setViewerOpen(false)} />
          <dialog open aria-modal="true" aria-label="仰望 U9 三维模型" className={styles.mapCarViewerDialog}>
            <div className={styles.mapCarViewerHeader}>
              <div>
                <strong>仰望 U9 · 大尾翼版</strong>
                <span>拖动旋转，滚轮缩放；仅为课程地图座驾外观</span>
              </div>
              <button ref={closeRef} type="button" onClick={() => setViewerOpen(false)} aria-label="关闭三维模型">×</button>
            </div>
            <iframe
              title="仰望 U9 可交互三维预览"
              src="/assets/course-map/u9-model-viewer.html"
              className={styles.mapCarViewerFrame}
              onLoad={(event) => showOnlyModel(event.currentTarget)}
            />
          </dialog>
        </div>,
        document.body,
      )}
    </>
  );
}
