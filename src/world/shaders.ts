// GLSL for ECHOFORM's procedural world. All materials are unlit; the bloom pass
// provides the luminous highlights. Values are intentionally pushed above 1.0
// where a surface should bloom.

const NOISE = /* glsl */ `
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
`;

export const breathFieldVertex = /* glsl */ `
uniform float uTime;
uniform float uBreath;
uniform float uBreathAmp;
uniform float uPulse;
uniform float uPresence;
uniform float uReduced;
uniform float uPointScale;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

attribute float aSeed;
attribute float aRadius;
attribute float aAngle;
attribute float aHeight;
attribute float aSize;

varying vec3 vColor;
varying float vAlpha;

${NOISE}

void main() {
  float seed = aSeed;
  float t = uTime;
  float drift = t * (0.025 + seed * 0.045);

  float angle = aAngle
    + drift
    + sin(seed * 21.0 + t * 0.19) * 0.07 * (1.0 - uReduced);

  float radius = aRadius * (1.0 - uBreath * 0.16 * uBreathAmp);
  float height = aHeight
    + uBreath * 0.62 * uBreathAmp * (0.45 + 0.55 * sin(aAngle + 0.8))
    + sin(seed * 33.0 + t * 0.11) * 0.08 * (1.0 - uReduced);

  vec3 base = vec3(cos(angle) * radius, height, sin(angle) * radius);

  float n1 = noise3(base * 0.22 + vec3(0.0, t * 0.035, 0.0));
  float n2 = noise3(base * 0.53 + vec3(t * 0.05, seed * 3.0, 0.0));

  vec3 pos = base;
  pos.x += (n1 - 0.5) * 1.15 * (1.0 - uReduced);
  pos.y += (n2 - 0.5) * 0.72 * (1.0 - uReduced);
  pos.z += (n1 - n2) * 0.9 * (1.0 - uReduced);

  // A beat gives the whole field a barely perceptible outward breath.
  pos.xz *= 1.0 + uPulse * 0.016;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;

  float dist = max(0.6, -mv.z);
  gl_PointSize = min(22.0, aSize * uPointScale * (1.0 / dist) * (0.55 + uPresence * 0.75));

  float mixv = clamp(aRadius / 6.4 + (height + 2.2) / 9.0, 0.0, 1.0);
  vec3 col = mix(uColorA, uColorB, mixv);
  col = mix(col, uColorC, uPulse * 0.32 * smoothstep(1.0, 4.5, aRadius));

  vColor = col;
  float twinkle = 0.62 + 0.38 * sin(seed * 87.0 + t * 0.33);
  vAlpha = (0.10 + 0.30 * uPresence) * twinkle;
}
`;

export const breathFieldFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.04, d);
  a = pow(a, 1.25);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

export const ribbonVertex = /* glsl */ `
uniform float uTime;
uniform float uBreath;
uniform float uBreathAmp;
uniform float uPulse;
uniform float uPresence;
uniform float uReduced;

attribute float aProgress;
attribute float aSide;
attribute float aAngle;
attribute float aRadius;
attribute float aSeed;

varying vec3 vColor;
varying float vAlpha;
varying float vSide;

void main() {
  float t = uTime;
  float wobble = sin(t * 0.23 + aSeed * 9.0) * 0.09 * (1.0 - uReduced);
  float angle = aAngle + aProgress * 1.9 + wobble;

  float radius = aRadius
    + sin(aProgress * 3.14159) * 0.75
    + uBreath * 0.16 * uBreathAmp * (0.3 + aProgress);

  float height = -2.4
    + aProgress * 5.8
    + sin(aProgress * 4.5 + t * 0.15 + aSeed * 2.0) * 0.26
    + uBreath * 0.28 * uBreathAmp * aProgress;

  vec3 center = vec3(cos(angle) * radius, height, sin(angle) * radius);
  vec3 tangent = normalize(vec3(-sin(angle), 0.0, cos(angle)));
  vec3 sideDir = normalize(cross(tangent, vec3(0.0, 1.0, 0.0)));

  float width = (0.045 + 0.09 * sin(aProgress * 3.14159)) * (0.8 + uBreathAmp * 0.4);
  vec3 pos = center + sideDir * aSide * width;

  vSide = aSide;
  vColor = mix(vec3(0.35, 0.85, 0.75), vec3(1.0, 0.72, 0.48), aProgress * 0.7);
  vAlpha = (0.05 + 0.14 * uPresence) *
    smoothstep(0.0, 0.08, aProgress) *
    smoothstep(1.0, 0.72, aProgress) *
    (0.6 + uPulse * 0.25);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const ribbonFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec3 vColor;
varying float vAlpha;
varying float vSide;

void main() {
  float edge = 1.0 - smoothstep(0.25, 0.5, abs(vSide));
  vec3 col = mix(uColorA, uColorB, 0.5 + vSide);
  gl_FragColor = vec4(col, vAlpha * edge);
}
`;

export const coreVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const coreFragment = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform float uPresence;
uniform vec3 uCore;
uniform vec3 uCoreHot;
uniform vec3 uField;

varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(vViewDir);
  float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.4);

  float bands = 0.5 + 0.5 * sin(n.y * 18.0 + uTime * 0.55 + sin(n.x * 9.0) * 1.4);
  float glow = fres * 0.8 + bands * 0.12 + uPulse * 0.5;

  vec3 col = mix(uCore * 0.6, uCoreHot * 1.5, uPulse * 0.65);
  col = mix(col, uField, fres * 0.5);

  float alpha = (0.16 + fres * 0.78 + uPulse * 0.16) * uPresence;
  gl_FragColor = vec4(col, alpha);
}
`;

export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragment = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uCoreHot;
uniform float uPulse;
uniform float uPresence;

varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  a = pow(a, 2.6);
  vec3 col = mix(uCoreHot, uCore, a);
  gl_FragColor = vec4(col * 1.25, a * (0.12 + uPulse * 0.24) * uPresence);
}
`;

export const organismVertex = /* glsl */ `
uniform float uTime;
uniform float uBreath;
uniform float uPresence;
uniform float uGrowth;
uniform float uReduced;

attribute float aProgress;
attribute float aTip;

varying float vProgress;
varying float vTip;
varying float vAlpha;

void main() {
  vec3 pos = position;
  float sway = sin(uTime * 0.32 + aProgress * 9.0 + pos.y * 0.7)
    * 0.055 * (aProgress * 0.8 + 0.2) * (1.0 - uReduced);
  pos.x += sway + uBreath * 0.04 * (aProgress * 0.7 + 0.3);
  pos.z += sway * 0.6;

  vProgress = aProgress;
  vTip = aTip;

  float reveal = 1.0 - smoothstep(uGrowth - 0.035, uGrowth + 0.035, aProgress);
  vAlpha = reveal * uPresence;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const organismFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uCore;

varying float vProgress;
varying float vTip;
varying float vAlpha;

void main() {
  vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.85, vProgress));
  col = mix(col, uCore, vTip * 0.9);
  float a = vAlpha * (0.24 + 0.62 * vTip);
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
}
`;

export const dustVertex = /* glsl */ `
uniform float uTime;
uniform float uPresence;
uniform float uReduced;
uniform float uPointScale;
uniform vec3 uColorA;
uniform vec3 uColorB;

attribute float aSeed;
attribute float aSize;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;
  float t = uTime;
  pos.y = mod(pos.y + t * 0.045 + 3.5, 7.0) - 3.5;
  pos.x += sin(t * 0.09 + aSeed * 12.0) * 0.28 * (1.0 - uReduced);
  pos.z += cos(t * 0.07 + aSeed * 9.0) * 0.28 * (1.0 - uReduced);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(26.0, aSize * uPointScale * (1.0 / max(0.8, -mv.z)) * (0.6 + uPresence * 0.5));

  vColor = mix(uColorA, uColorB, aSeed);
  vAlpha = (0.12 + uPresence * 0.22) * (0.5 + 0.5 * sin(aSeed * 44.0 + t * 0.5));
}
`;

export const dustFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.02, d);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

export const groundVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const groundFragment = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uTime;
uniform float uPulse;
uniform float uPresence;

varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float glow = smoothstep(1.0, 0.0, d);
  float ripple = sin(d * 18.0 - uTime * 0.55 + uPulse * 2.0) * 0.5 + 0.5;
  vec3 col = mix(uColor * 0.3, uAccent, glow * 0.55);
  float a = glow * (0.05 + uPulse * 0.05) * (0.6 + ripple * 0.4) * uPresence;
  gl_FragColor = vec4(col, a);
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const skyFragment = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uBottom;
uniform vec3 uAccent;
uniform float uTime;
uniform float uPresence;

varying vec3 vWorld;

void main() {
  vec3 dir = normalize(vWorld);
  float h = dir.y * 0.5 + 0.5;
  vec3 col = mix(uBottom, uTop, pow(h, 1.15));
  float aurora = sin(dir.x * 3.6 + uTime * 0.045)
    * sin(dir.z * 2.4 - uTime * 0.032)
    * smoothstep(0.1, 0.85, h);
  col += uAccent * max(0.0, aurora) * 0.018 * (0.4 + uPresence * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`;
