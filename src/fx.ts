import {
  BlurFilter,
  Container,
  Filter,
  GlProgram,
  Graphics,
  Rectangle,
} from "pixi.js";
import { GAME_H, GAME_W } from "./playable";

const VERT = `in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}
void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}`;

const FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uAberration;
uniform float uVignette;
uniform float uFlash;
void main() {
    vec2 uv = vTextureCoord;
    vec2 c = uv - 0.5;
    float ab = uAberration * 0.006;
    float r = texture(uTexture, uv + c * ab).r;
    float g = texture(uTexture, uv).g;
    float b = texture(uTexture, uv - c * ab).b;
    vec3 col = vec3(r, g, b);
    col += vec3(uFlash);
    float vig = smoothstep(0.45, 1.15, length(c));
    col *= 1.0 - vig * uVignette;
    col += sin((uv.y + uTime * 0.04) * 720.0) * 0.018;
    finalColor = vec4(col, 1.0);
}`;

export type FxUniforms = {
  uTime: number;
  uAberration: number;
  uVignette: number;
  uFlash: number;
};

export function attachPostFx(target: Container) {
  const filter = new Filter({
    glProgram: GlProgram.from({
      vertex: VERT,
      fragment: FRAG,
      name: "post-fx",
    }),
    resources: {
      fx: {
        uTime: { value: 0, type: "f32" },
        uAberration: { value: 0.35, type: "f32" },
        uVignette: { value: 0.85, type: "f32" },
        uFlash: { value: 0, type: "f32" },
      },
    },
  });
  target.filters = [filter];
  target.filterArea = new Rectangle(0, 0, GAME_W, GAME_H);
  return filter.resources.fx.uniforms as FxUniforms;
}

export function makeBloomLayer(parent: Container) {
  const layer = new Container();
  layer.blendMode = "add";
  layer.filters = [new BlurFilter({ strength: 10, quality: 3 })];
  layer.filterArea = new Rectangle(0, 0, GAME_W, GAME_H);
  parent.addChild(layer);
  return layer;
}

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: number;
};

export class SparkField {
  gfx: Graphics;
  sparks: Spark[] = [];

  constructor(parent: Container) {
    this.gfx = new Graphics();
    this.gfx.blendMode = "add";
    parent.addChild(this.gfx);
  }

  burst(x: number, y: number, color: number, count = 22, speed = 8) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random());
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 18 + Math.random() * 16,
        max: 34,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  tick(dt: number) {
    this.gfx.clear();
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const spark = this.sparks[i];
      spark.x += spark.vx * dt * 0.7;
      spark.y += spark.vy * dt * 0.7;
      spark.vy += 0.12 * dt;
      spark.life -= dt;
      if (spark.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      const t = spark.life / spark.max;
      this.gfx.circle(spark.x, spark.y, spark.size * t);
      this.gfx.fill({ color: spark.color, alpha: t });
    }
  }
}

export function starfield(parent: Container, count: number, color: number) {
  const gfx = new Graphics();
  gfx.blendMode = "add";
  for (let i = 0; i < count; i++) {
    gfx.circle(
      Math.random() * GAME_W,
      Math.random() * GAME_H,
      Math.random() * 1.8,
    );
    gfx.fill({ color, alpha: 0.25 + Math.random() * 0.7 });
  }
  parent.addChild(gfx);
  return gfx;
}
