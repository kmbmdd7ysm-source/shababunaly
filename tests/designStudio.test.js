import './setup.js';
import { describe, expect, it } from './test-api.js';
import {
  addDesignComment,
  addDesignLayer,
  createDefaultStudio,
  createHistory,
  duplicateDesignLayer,
  moveDesignLayer,
  normalizeStudio,
  pushHistory,
  redoHistory,
  removeDesignLayer,
  undoHistory,
  updateDesignLayer,
} from '../src/services/designStudio.js';

const design = {
  teamName: 'AL ITTIHAD',
  playerName: 'PLAYER',
  number: '21',
  secondary: '#ffffff',
  accent: '#d6d6d6',
  font: 'block',
};

describe('production design studio state', () => {
  it('creates editable front and back production layers', () => {
    const studio = createDefaultStudio(design);
    expect(studio.layers.some((layer) => layer.view === 'front' && layer.type === 'number')).toBe(
      true,
    );
    expect(studio.layers.some((layer) => layer.view === 'back' && layer.type === 'number')).toBe(
      true,
    );
  });
  it('clamps unsafe layer coordinates and supports layer operations', () => {
    let studio = addDesignLayer(
      createDefaultStudio(design),
      { type: 'text', content: 'TEST', x: 300, y: -20 },
      design,
    );
    const added = studio.layers.at(-1);
    expect(added.x).toBe(97);
    expect(added.y).toBe(3);
    studio = updateDesignLayer(studio, added.id, { rotation: 900, width: 0 }, design);
    expect(studio.layers.find((layer) => layer.id === added.id).rotation).toBe(180);
    studio = duplicateDesignLayer(studio, added.id, design);
    expect(studio.layers.length).toBeGreaterThan(added ? 4 : 0);
    const copy = studio.layers.at(-1);
    studio = moveDesignLayer(studio, copy.id, 'down', design);
    studio = removeDesignLayer(studio, copy.id, design);
    expect(studio.layers.some((layer) => layer.id === copy.id)).toBe(false);
  });
  it('maintains bounded undo and redo history', () => {
    const initial = normalizeStudio(createDefaultStudio(design), design);
    let history = createHistory(initial, 5);
    const next = updateDesignLayer(initial, initial.layers[0].id, { x: 72 }, design);
    history = pushHistory(history, next);
    expect(history.present.layers[0].x).toBe(72);
    history = undoHistory(history);
    expect(history.present.layers[0].x).toBe(initial.layers[0].x);
    history = redoHistory(history);
    expect(history.present.layers[0].x).toBe(72);
  });
  it('pins review comments to a named view', () => {
    const studio = addDesignComment(
      createDefaultStudio(design),
      { view: 'side', x: 30, y: 40, text: 'Move sponsor higher.' },
      design,
    );
    expect(studio.comments).toHaveLength(1);
    expect(studio.comments[0]).toMatchObject({ view: 'side', x: 30, y: 40, resolved: false });
  });
});
