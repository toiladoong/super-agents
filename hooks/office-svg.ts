// Draws the office as one SVG: pixels are <rect>s in logical units, animated with SMIL (no script runs in the frame).
// Same art as the Orca panel (super-agents/office/panel/sprites.js).
import type { OfficeAgent, OfficeState } from '../types'
import { TEXT } from './i18n'
import type { Lang } from './i18n'

const CELL_W = 64
const CELL_H = 44
const LABEL_H = 10
const WALL_H = 16
const SCALE = 3
// An Svg source is held to 131072 characters; about 5000 a desk keeps well under it.
export const MAX_DESKS = 20

const DEFAULT_SHIRT = '#8a8f98'
const DEFAULT_HAIR = '#c96442'
const SHIRT: Record<string, string> = {
  orchestrator: '#9b6bff',
  researcher: '#4aa3ff',
  coder: '#3cc46b',
  reviewer: '#ff9f3c',
  skeptic: '#ffd23c',
  tester: '#ff5c7a',
  agent: DEFAULT_SHIRT
}
const HAIR: Record<string, string> = {
  claude: '#c96442',
  codex: '#2b2b2b',
  antigravity: '#4285f4',
  cursor: '#4b4bd8',
  opencode: '#7a5230'
}
const SCREEN: Record<OfficeState, string> = { working: '#1d3b52', blocked: '#4a1f24', waiting: '#2a2d36', done: '#121316' }
const SKIN = '#f1c27d'
// A 3x5 pixel letter or two on the shirt per role (researcher and reviewer both start with R: RS and RV).
const ROLE_LETTER: Record<string, string> = { orchestrator: 'O', researcher: 'RS', coder: 'C', reviewer: 'RV', skeptic: 'S', tester: 'T' }
const GLYPHS: Record<string, readonly string[]> = {
  O: ['111', '101', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'],
  C: ['111', '100', '100', '100', '111'],
  V: ['101', '101', '101', '101', '010'],
  S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010']
}

// The role's letters on a shirt whose left edge is `x`, 4 pixels apart and centered on its 10 pixels.
function roleLetter(x: number, y: number, role: string): string {
  // Dark on the yellow skeptic shirt, white on the others.
  const ink = role === 'skeptic' ? '#2e3440' : '#ffffff'
  const letters = [...(ROLE_LETTER[role] ?? '')]
  const left = x + Math.floor((10 - (letters.length * 4 - 1)) / 2)
  return letters
    .flatMap((letter, index) =>
      (GLYPHS[letter] ?? []).flatMap((row, dy) =>
        [...row].map((bit, dx) => (bit === '1' ? rect(left + index * 4 + dx, y + dy, 1, 1, ink) : ''))
      )
    )
    .join('')
}

function rect(x: number, y: number, w: number, h: number, color: string, animation = ''): string {
  const shape = `x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"`
  return animation ? `<rect ${shape}>${animation}</rect>` : `<rect ${shape}/>`
}

function animate(attribute: string, values: string, seconds: number, begin = 0): string {
  return `<animate attributeName="${attribute}" values="${values}" dur="${seconds}s" begin="${begin}s" repeatCount="indefinite"/>`
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[char] ?? char)
}

export function elapsed(since: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - since) / 60000))
  return minutes < 60 ? `${minutes}p` : `${Math.floor(minutes / 60)}g${minutes % 60}p`
}

function person(x: number, y: number, agent: OfficeAgent): string {
  const shirt = SHIRT[agent.role] ?? DEFAULT_SHIRT
  const hair = HAIR[agent.agent] ?? DEFAULT_HAIR
  const lean = agent.state === 'done' ? -1 : 0
  const parts = [
    rect(x + 1, y + 6, 12, 10, '#4c566a'),
    rect(x + 3 + lean, y, 8, 7, SKIN),
    rect(x + 3 + lean, y, 8, 2, hair),
    rect(x + 3 + lean, y + 2, 1, 3, hair),
    rect(x + 5 + lean, y + 3, 1, 1, '#2e3440'),
    rect(x + 9 + lean, y + 3, 1, 1, '#2e3440'),
    rect(x + 2, y + 7, 10, 8, shirt)
  ]
  if (agent.role === 'tester') {
    // The tester is a woman: long hair over the shoulders, a bow and pink lips.
    parts.push(
      rect(x + 2 + lean, y, 2, 11, hair),
      rect(x + 10 + lean, y, 2, 11, hair),
      rect(x + 3 + lean, y - 1, 8, 2, hair),
      rect(x + 9 + lean, y - 2, 3, 2, '#ff8fb1'),
      rect(x + 7 + lean, y + 5, 1, 1, '#d9536f')
    )
  }
  parts.push(roleLetter(x + 2, y + 9, agent.role))
  if (agent.state === 'working') {
    // Typing: hands bob on the keyboard in turn.
    parts.push(
      rect(x + 12, y + 10, 4, 2, shirt, animate('y', `${y + 10};${y + 11};${y + 10}`, 0.35)),
      rect(x + 16, y + 10, 2, 2, SKIN, animate('y', `${y + 10};${y + 11};${y + 10}`, 0.35)),
      rect(x + 12, y + 12, 6, 2, shirt, animate('y', `${y + 12};${y + 11};${y + 12}`, 0.35))
    )
  } else if (agent.state === 'blocked') {
    parts.push(rect(x + 12, y + 2, 2, 8, shirt), rect(x + 12, y, 2, 2, SKIN))
  } else {
    parts.push(rect(x + 12, y + 11, 5, 2, shirt))
  }
  return parts.join('')
}

function monitor(x: number, y: number, state: OfficeState): string {
  const parts = [rect(x, y, 18, 12, '#2e3440'), rect(x + 1, y + 1, 16, 10, SCREEN[state]), rect(x + 8, y + 12, 2, 2, '#2e3440')]
  if (state === 'working') {
    for (let line = 0; line < 4; line++) {
      const color = line % 3 ? '#88c0d0' : '#a3be8c'
      parts.push(rect(x + 2 + (line % 2) * 2, y + 2 + line * 2, 6, 1, color, animate('width', '3;11;6;9;3', 1.6, line * 0.3)))
    }
  } else if (state === 'blocked') {
    const blink = animate('opacity', '1;0;1', 0.8)
    parts.push(rect(x + 8, y + 3, 2, 4, '#bf616a', blink), rect(x + 8, y + 8, 2, 1, '#bf616a', blink))
  }
  return parts.join('')
}

function bubble(x: number, y: number, state: OfficeState): string {
  if (state === 'working') return ''
  const frame = rect(x, y, 11, 8, '#eceff4') + rect(x + 2, y + 8, 2, 2, '#eceff4')
  if (state === 'blocked') {
    return `<g>${animate('opacity', '1;1;0;1', 1)}${frame}${rect(x + 5, y + 1, 2, 4, '#bf616a')}${rect(x + 5, y + 6, 2, 1, '#bf616a')}</g>`
  }
  if (state === 'waiting') {
    const dots = [0, 1, 2].map((dot) => rect(x + 2 + dot * 3, y + 4, 1, 1, '#4c566a', animate('opacity', '0.2;1;0.2', 1.2, dot * 0.4)))
    return frame + dots.join('')
  }
  const checkPixels: ReadonlyArray<readonly [number, number]> = [[3, 4], [4, 5], [5, 4], [6, 3], [7, 2]]
  const check = checkPixels.map(([dx, dy]) => rect(x + dx, y + dy, 1, 1, '#a3be8c'))
  return frame + check.join('')
}

function desk(x: number, y: number, agent: OfficeAgent, now: number, lang: Lang): string {
  const tooltip = [
    agent.title || '(không tên)',
    `${agent.agent} · ${TEXT[lang].role} ${agent.role} · ${agent.workspace}`,
    `${TEXT[lang].stateWords[agent.state]} ${elapsed(agent.since, now)}${agent.tool ? ` · ${agent.tool}` : ''}`
  ].join('\n')
  const mug =
    agent.state === 'waiting'
      ? rect(x + 52, y + 22, 4, 4, '#eceff4') + rect(x + 56, y + 23, 1, 2, '#eceff4') + rect(x + 53, y + 18, 1, 2, '#d8dee9', animate('y', `${y + 19};${y + 17};${y + 19}`, 1.4))
      : ''
  const label = agent.title || agent.agent
  const shortLabel = label.length > 20 ? `${label.slice(0, 19)}…` : label
  return [
    `<g><title>${escapeXml(tooltip)}</title>`,
    person(x + 6, y + 10, agent),
    rect(x + 4, y + 26, 56, 4, '#8b5a2b'),
    rect(x + 4, y + 30, 56, 2, '#6b4423'),
    rect(x + 6, y + 32, 2, 6, '#6b4423'),
    rect(x + 56, y + 32, 2, 6, '#6b4423'),
    monitor(x + 30, y + 12, agent.state),
    rect(x + 22, y + 24, 8, 2, '#4c566a'),
    mug,
    bubble(x + 18, y + 1, agent.state),
    `<text x="${x + CELL_W / 2}" y="${y + CELL_H + 7}" font-size="4.2" fill="#d8dee9" text-anchor="middle" font-family="system-ui, sans-serif">${escapeXml(`${shortLabel} · ${elapsed(agent.since, now)}`)}</text>`,
    '</g>'
  ].join('')
}

function wall(width: number): string {
  const parts = [rect(0, 0, width, WALL_H, '#3b4252'), rect(0, WALL_H - 2, width, 2, '#2e3440')]
  for (let x = 10; x < width - 20; x += 70) {
    parts.push(rect(x, 3, 22, 9, '#88c0d0'), rect(x + 10, 3, 2, 9, '#3b4252'), rect(x, 7, 22, 1, '#3b4252'))
  }
  const cx = width - 10
  parts.push(
    rect(cx - 4, 3, 9, 9, '#eceff4'),
    `<rect x="${cx}" y="4" width="1" height="4" fill="#bf616a"><animateTransform attributeName="transform" type="rotate" from="0 ${cx + 0.5} 7.5" to="360 ${cx + 0.5} 7.5" dur="60s" repeatCount="indefinite"/></rect>`
  )
  return parts.join('')
}

export function officeSvg(agents: OfficeAgent[], columns: number, now: number, lang: Lang = 'vi'): string {
  // Over the desk limit, agents waiting on the person (blocked) are seated first so none is hidden.
  const seated =
    agents.length > MAX_DESKS
      ? [...agents].sort((a, b) => Number(b.state === 'blocked') - Number(a.state === 'blocked')).slice(0, MAX_DESKS)
      : agents
  const rows = Math.max(1, Math.ceil(seated.length / columns))
  const width = columns * CELL_W
  const height = WALL_H + rows * (CELL_H + LABEL_H)
  const floor =
    '<defs><pattern id="floor" width="16" height="16" patternUnits="userSpaceOnUse">' +
    `${rect(0, 0, 16, 16, '#bfa882')}${rect(0, 0, 8, 8, '#c8b28e')}${rect(8, 8, 8, 8, '#c8b28e')}</pattern></defs>`
  const body = [floor, wall(width)]
  for (let row = 0; row < rows; row++) {
    const y = WALL_H + row * (CELL_H + LABEL_H)
    body.push(`<rect x="0" y="${y}" width="${width}" height="${CELL_H}" fill="url(#floor)"/>`, rect(0, y + CELL_H, width, LABEL_H, '#1e1f24'))
  }
  seated.forEach((agent, index) => {
    body.push(desk((index % columns) * CELL_W, WALL_H + Math.floor(index / columns) * (CELL_H + LABEL_H), agent, now, lang))
  })
  if (seated.length === 0) {
    body.push(`<text x="${width / 2}" y="${WALL_H + 24}" font-size="4.5" fill="#2e3440" text-anchor="middle" font-family="system-ui, sans-serif">${TEXT[lang].noAgents}</text>`)
  }
  if (agents.length > seated.length) {
    body.push(`<text x="${width - 3}" y="${height - 3}" font-size="4" fill="#d8dee9" text-anchor="end">${TEXT[lang].moreAgents(agents.length - seated.length)}</text>`)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * SCALE}" height="${height * SCALE}" shape-rendering="crispEdges">${body.join('')}</svg>`
}
