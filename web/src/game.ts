import kaplay, { type KAPLAYCtx, type GameObj } from "kaplay";

const VW = 800;
const VH = 600;

// ─── Colours ────────────────────────────────────────────────────────────────
const C = {
  bg:        [18,  18,  22 ] as [number,number,number],
  panel:     [30,  30,  38 ] as [number,number,number],
  border:    [60,  60,  80 ] as [number,number,number],
  dough:     [240, 210, 150] as [number,number,number],
  doughDark: [210, 175, 110] as [number,number,number],
  cooked:    [200, 145,  60] as [number,number,number],
  sauce:     [200,  50,  40] as [number,number,number],
  cheese:    [255, 220,  80] as [number,number,number],
  pepperoni: [180,  40,  40] as [number,number,number],
  mushroom:  [160, 130, 100] as [number,number,number],
  olive:     [ 60,  80,  60] as [number,number,number],
  pepper:    [ 60, 160,  60] as [number,number,number],
  box:       [200, 140,  60] as [number,number,number],
  boxDark:   [160, 100,  30] as [number,number,number],
  emerald:   [ 16, 185, 129] as [number,number,number],
  white:     [255, 255, 255] as [number,number,number],
  gray:      [120, 120, 140] as [number,number,number],
  orange:    [255, 140,   0] as [number,number,number],
  red:       [220,  50,  50] as [number,number,number],
};

// ─── Topping definitions ─────────────────────────────────────────────────────
interface ToppingDef { name: string; color: [number,number,number]; shape: "circle"|"rect"; size: number; }
const TOPPINGS: ToppingDef[] = [
  { name: "Sauce",     color: C.sauce,     shape: "circle", size: 14 },
  { name: "Cheese",    color: C.cheese,    shape: "rect",   size: 12 },
  { name: "Pepperoni", color: C.pepperoni, shape: "circle", size: 10 },
  { name: "Mushroom",  color: C.mushroom,  shape: "rect",   size: 9  },
  { name: "Olive",     color: C.olive,     shape: "circle", size: 7  },
  { name: "Pepper",    color: C.pepper,    shape: "rect",   size: 8  },
];

// ─── Game state ──────────────────────────────────────────────────────────────
type Stage = "knead" | "top" | "bake" | "pack" | "done";

interface Pizza {
  kneadProgress: number;   // 0-100
  toppings: string[];
  bakeProgress: number;    // 0-100
  packed: boolean;
}

// ─── Entry point ─────────────────────────────────────────────────────────────
export function startGame(canvas: HTMLCanvasElement, onScore: (n: number) => void): () => void {
  const k = kaplay({
    canvas,
    width: VW,
    height: VH,
    letterbox: true,
    background: C.bg,
    global: false,
    pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  });

  let totalScore = 0;

  // ── helpers ────────────────────────────────────────────────────────────────
  function addScore(n: number) {
    totalScore += n;
    onScore(totalScore);
  }

  function rgb(c: [number,number,number]) { return k.rgb(c[0], c[1], c[2]); }

  function panel(x: number, y: number, w: number, h: number, label: string) {
    k.add([k.rect(w, h, { radius: 10 }), k.color(...C.panel), k.pos(x, y), k.z(0)]);
    k.add([k.rect(w, h, { radius: 10 }), k.outline(2, rgb(C.border)), k.pos(x, y), k.z(1), k.opacity(0)]);
    k.add([
      k.text(label, { size: 13, font: "sans-serif" }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(x + w / 2, y + 14),
      k.z(2),
    ]);
  }

  // ── MAIN SCENE ─────────────────────────────────────────────────────────────
  k.scene("play", () => {
    const pizza: Pizza = { kneadProgress: 0, toppings: [], bakeProgress: 0, packed: false };
    let stage: Stage = "knead";

    // Layout: 4 quadrants
    const PAD = 8;
    const MID_X = VW / 2;
    const MID_Y = VH / 2;
    const PW = MID_X - PAD * 1.5;
    const PH = MID_Y - PAD * 1.5;

    // Quadrant origins (top-left corner of each panel)
    const Q = {
      tl: { x: PAD,           y: PAD },           // pack (top-left)
      tr: { x: MID_X + PAD/2, y: PAD },           // bake (top-right)
      bl: { x: PAD,           y: MID_Y + PAD/2 }, // knead (bottom-left)
      br: { x: MID_X + PAD/2, y: MID_Y + PAD/2 }, // top (bottom-right)
    };

    // Draw panels
    panel(Q.tl.x, Q.tl.y, PW, PH, "📦  PACK");
    panel(Q.tr.x, Q.tr.y, PW, PH, "🔥  BAKE");
    panel(Q.bl.x, Q.bl.y, PW, PH, "👐  KNEAD");
    panel(Q.br.x, Q.br.y, PW, PH, "🍕  ADD TOPPINGS");

    // ── Stage label ──────────────────────────────────────────────────────────
    const stageLabel = k.add([
      k.text("", { size: 15, font: "sans-serif" }),
      k.color(...C.emerald),
      k.anchor("center"),
      k.pos(VW / 2, VH / 2),
      k.z(10),
    ]);

    function updateStageLabel() {
      const msgs: Record<Stage, string> = {
        knead: "Knead the dough! (click & drag)",
        top:   "Drag toppings onto the dough!",
        bake:  "Place in oven to bake!",
        pack:  "Pack the pizza in a box!",
        done:  "Pizza delivered! 🎉",
      };
      stageLabel.text = msgs[stage];
    }
    updateStageLabel();

    // ════════════════════════════════════════════════════════════════════════
    // BOTTOM-LEFT: KNEAD SECTION
    // ════════════════════════════════════════════════════════════════════════
    const blCX = Q.bl.x + PW / 2;
    const blCY = Q.bl.y + PH / 2 + 10;

    // Dough blob (drawn as a big circle)
    let doughRadius = 55;
    const doughObj = k.add([
      k.circle(doughRadius),
      k.color(...C.dough),
      k.anchor("center"),
      k.pos(blCX, blCY),
      k.z(3),
      "dough",
    ]);

    // Knead progress bar
    const kneadBarBg = k.add([
      k.rect(PW - 40, 12, { radius: 6 }),
      k.color(50, 50, 60),
      k.pos(Q.bl.x + 20, Q.bl.y + PH - 28),
      k.z(3),
    ]);
    void kneadBarBg;

    const kneadBar = k.add([
      k.rect(0, 12, { radius: 6 }),
      k.color(...C.emerald),
      k.pos(Q.bl.x + 20, Q.bl.y + PH - 28),
      k.z(4),
    ]);

    k.add([
      k.text("Knead progress", { size: 11, font: "sans-serif" }),
      k.color(...C.gray),
      k.pos(Q.bl.x + 20, Q.bl.y + PH - 44),
      k.z(4),
    ]);

    // Knead instruction
    k.add([
      k.text("Click & drag on dough", { size: 11, font: "sans-serif" }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(blCX, Q.bl.y + 28),
      k.z(4),
    ]);

    // Knead interaction: mouse drag on dough area
    let isDraggingKnead = false;
    let lastKneadPos = k.vec2(0, 0);

    k.onMousePress(() => {
      if (stage !== "knead") return;
      const mp = k.mousePos();
      const dx = mp.x - blCX;
      const dy = mp.y - blCY;
      if (Math.sqrt(dx*dx + dy*dy) < doughRadius + 20) {
        isDraggingKnead = true;
        lastKneadPos = mp;
      }
    });

    k.onMouseRelease(() => { isDraggingKnead = false; });

    k.onMouseMove(() => {
      if (!isDraggingKnead || stage !== "knead") return;
      const mp = k.mousePos();
      const dist = mp.dist(lastKneadPos);
      pizza.kneadProgress = Math.min(100, pizza.kneadProgress + dist * 0.15);
      lastKneadPos = mp;

      // Squish effect
      const t = pizza.kneadProgress / 100;
      doughObj.color = rgb([
        Math.round(C.dough[0] * (1 - t * 0.15)),
        Math.round(C.dough[1] * (1 - t * 0.1)),
        Math.round(C.dough[2] * (1 - t * 0.25)),
      ]);

      kneadBar.width = (PW - 40) * (pizza.kneadProgress / 100);

      if (pizza.kneadProgress >= 100 && stage === "knead") {
        stage = "top";
        updateStageLabel();
        showKneadDone();
      }
    });

    // Touch support for knead
    k.onTouchStart((_touch, e) => {
      if (stage !== "knead") return;
      const touches = e.changedTouches;
      if (touches.length === 0) return;
      const t0 = touches[0]!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VW / rect.width;
      const scaleY = VH / rect.height;
      const mx = (t0.clientX - rect.left) * scaleX;
      const my = (t0.clientY - rect.top) * scaleY;
      const dx = mx - blCX;
      const dy = my - blCY;
      if (Math.sqrt(dx*dx + dy*dy) < doughRadius + 20) {
        isDraggingKnead = true;
        lastKneadPos = k.vec2(mx, my);
      }
    });

    k.onTouchMove((_touch, e) => {
      if (!isDraggingKnead || stage !== "knead") return;
      const touches = e.changedTouches;
      if (touches.length === 0) return;
      const t0 = touches[0]!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VW / rect.width;
      const scaleY = VH / rect.height;
      const mx = (t0.clientX - rect.left) * scaleX;
      const my = (t0.clientY - rect.top) * scaleY;
      const mp = k.vec2(mx, my);
      const dist = mp.dist(lastKneadPos);
      pizza.kneadProgress = Math.min(100, pizza.kneadProgress + dist * 0.15);
      lastKneadPos = mp;
      kneadBar.width = (PW - 40) * (pizza.kneadProgress / 100);
      if (pizza.kneadProgress >= 100 && stage === "knead") {
        stage = "top";
        updateStageLabel();
        showKneadDone();
      }
    });

    k.onTouchEnd(() => { isDraggingKnead = false; });

    function showKneadDone() {
      const msg = k.add([
        k.text("✅ Dough ready!", { size: 16, font: "sans-serif" }),
        k.color(...C.emerald),
        k.anchor("center"),
        k.pos(blCX, blCY - 70),
        k.z(10),
      ]);
      k.wait(2, () => k.destroy(msg));
      // Flatten the dough visually
      doughObj.radius = 62;
    }

    // ════════════════════════════════════════════════════════════════════════
    // BOTTOM-RIGHT: TOPPINGS SECTION
    // ════════════════════════════════════════════════════════════════════════
    const brCX = Q.br.x + PW / 2;
    const brCY = Q.br.y + PH / 2 + 10;

    // Pizza base in toppings section
    const pizzaBase = k.add([
      k.circle(55),
      k.color(...C.doughDark),
      k.anchor("center"),
      k.pos(brCX, brCY),
      k.z(3),
    ]);
    void pizzaBase;

    // Applied topping dots on pizza
    const toppingDots: GameObj[] = [];

    // Topping palette at bottom of toppings section
    const paletteY = Q.br.y + PH - 36;
    const slotW = (PW - 20) / TOPPINGS.length;

    k.add([
      k.text("Drag toppings onto pizza", { size: 11, font: "sans-serif" }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(brCX, Q.br.y + 28),
      k.z(4),
    ]);

    // Draw topping palette slots
    TOPPINGS.forEach((top, i) => {
      const sx = Q.br.x + 10 + slotW * i + slotW / 2;

      // Slot bg
      k.add([
        k.rect(slotW - 4, 44, { radius: 6 }),
        k.color(45, 45, 55),
        k.anchor("center"),
        k.pos(sx, paletteY),
        k.z(3),
      ]);

      // Topping icon
      if (top.shape === "circle") {
        k.add([k.circle(top.size), k.color(...top.color), k.anchor("center"), k.pos(sx, paletteY - 8), k.z(4)]);
      } else {
        k.add([k.rect(top.size * 1.6, top.size * 1.2, { radius: 2 }), k.color(...top.color), k.anchor("center"), k.pos(sx, paletteY - 8), k.z(4)]);
      }

      // Label
      k.add([
        k.text(top.name, { size: 9, font: "sans-serif" }),
        k.color(...C.gray),
        k.anchor("center"),
        k.pos(sx, paletteY + 14),
        k.z(4),
      ]);
    });

    // Drag state for toppings
    let draggingTopping: { def: ToppingDef; ghost: GameObj } | null = null;

    function toppingAtPos(mp: { x: number; y: number }): ToppingDef | null {
      for (let i = 0; i < TOPPINGS.length; i++) {
        const sx = Q.br.x + 10 + slotW * i + slotW / 2;
        if (Math.abs(mp.x - sx) < slotW / 2 && Math.abs(mp.y - paletteY) < 28) {
          return TOPPINGS[i] ?? null;
        }
      }
      return null;
    }

    function startToppingDrag(mp: { x: number; y: number }) {
      if (stage !== "top") return;
      const def = toppingAtPos(mp);
      if (!def) return;
      const ghost = def.shape === "circle"
        ? k.add([k.circle(def.size), k.color(...def.color), k.anchor("center"), k.pos(mp.x, mp.y), k.z(20)])
        : k.add([k.rect(def.size * 1.6, def.size * 1.2, { radius: 2 }), k.color(...def.color), k.anchor("center"), k.pos(mp.x, mp.y), k.z(20)]);
      draggingTopping = { def, ghost };
    }

    function moveToppingDrag(mp: { x: number; y: number }) {
      if (!draggingTopping) return;
      draggingTopping.ghost.pos = k.vec2(mp.x, mp.y);
    }

    function endToppingDrag(mp: { x: number; y: number }) {
      if (!draggingTopping) return;
      const { def, ghost } = draggingTopping;
      k.destroy(ghost);
      draggingTopping = null;

      // Check if dropped on pizza base area
      const dx = mp.x - brCX;
      const dy = mp.y - brCY;
      if (Math.sqrt(dx*dx + dy*dy) < 60) {
        pizza.toppings.push(def.name);
        // Place a dot on the pizza
        const dot = def.shape === "circle"
          ? k.add([k.circle(def.size), k.color(...def.color), k.anchor("center"), k.pos(brCX + dx, brCY + dy), k.z(5)])
          : k.add([k.rect(def.size * 1.6, def.size * 1.2, { radius: 2 }), k.color(...def.color), k.anchor("center"), k.pos(brCX + dx, brCY + dy), k.z(5)]);
        toppingDots.push(dot);

        if (pizza.toppings.length >= 3 && stage === "top") {
          k.wait(0.5, () => {
            if (stage === "top") {
              stage = "bake";
              updateStageLabel();
              showTopDone();
            }
          });
        }
      }
    }

    k.onMousePress(() => {
      if (stage !== "top") return;
      startToppingDrag({ x: k.mousePos().x, y: k.mousePos().y });
    });
    k.onMouseMove(() => {
      if (!draggingTopping) return;
      moveToppingDrag({ x: k.mousePos().x, y: k.mousePos().y });
    });
    k.onMouseRelease(() => {
      if (!draggingTopping) return;
      endToppingDrag({ x: k.mousePos().x, y: k.mousePos().y });
    });

    k.onTouchStart((_t, e) => {
      if (stage !== "top") return;
      const t0 = e.changedTouches[0]; if (!t0) return;
      const rect = canvas.getBoundingClientRect();
      startToppingDrag({ x: (t0.clientX - rect.left) * (VW / rect.width), y: (t0.clientY - rect.top) * (VH / rect.height) });
    });
    k.onTouchMove((_t, e) => {
      if (!draggingTopping) return;
      const t0 = e.changedTouches[0]; if (!t0) return;
      const rect = canvas.getBoundingClientRect();
      moveToppingDrag({ x: (t0.clientX - rect.left) * (VW / rect.width), y: (t0.clientY - rect.top) * (VH / rect.height) });
    });
    k.onTouchEnd((_t, e) => {
      if (!draggingTopping) return;
      const t0 = e.changedTouches[0]; if (!t0) return;
      const rect = canvas.getBoundingClientRect();
      endToppingDrag({ x: (t0.clientX - rect.left) * (VW / rect.width), y: (t0.clientY - rect.top) * (VH / rect.height) });
    });

    function showTopDone() {
      const msg = k.add([
        k.text("✅ Ready to bake!", { size: 16, font: "sans-serif" }),
        k.color(...C.emerald),
        k.anchor("center"),
        k.pos(brCX, brCY - 70),
        k.z(10),
      ]);
      k.wait(2, () => k.destroy(msg));
    }

    // ════════════════════════════════════════════════════════════════════════
    // TOP-RIGHT: BAKE SECTION
    // ════════════════════════════════════════════════════════════════════════
    const trCX = Q.tr.x + PW / 2;
    const trCY = Q.tr.y + PH / 2 + 10;

    // Oven body
    k.add([
      k.rect(PW - 30, PH - 50, { radius: 12 }),
      k.color(60, 60, 70),
      k.anchor("center"),
      k.pos(trCX, trCY),
      k.z(3),
    ]);
    // Oven window
    const ovenWindow = k.add([
      k.rect(80, 60, { radius: 8 }),
      k.color(20, 15, 10),
      k.anchor("center"),
      k.pos(trCX, trCY - 10),
      k.z(4),
    ]);
    void ovenWindow;

    // Oven glow (animated)
    const ovenGlow = k.add([
      k.rect(76, 56, { radius: 6 }),
      k.color(80, 30, 0),
      k.anchor("center"),
      k.pos(trCX, trCY - 10),
      k.z(5),
      k.opacity(0),
    ]);

    // Oven door handle
    k.add([
      k.rect(PW - 40, 14, { radius: 4 }),
      k.color(80, 80, 90),
      k.anchor("center"),
      k.pos(trCX, trCY + 35),
      k.z(4),
    ]);
    k.add([
      k.rect(40, 8, { radius: 4 }),
      k.color(160, 160, 170),
      k.anchor("center"),
      k.pos(trCX, trCY + 35),
      k.z(5),
    ]);

    // Bake progress bar
    const bakeBarBg = k.add([
      k.rect(PW - 40, 12, { radius: 6 }),
      k.color(50, 50, 60),
      k.pos(Q.tr.x + 20, Q.tr.y + PH - 28),
      k.z(4),
    ]);
    void bakeBarBg;

    const bakeBar = k.add([
      k.rect(0, 12, { radius: 6 }),
      k.color(...C.orange),
      k.pos(Q.tr.x + 20, Q.tr.y + PH - 28),
      k.z(5),
    ]);

    k.add([
      k.text("Baking progress", { size: 11, font: "sans-serif" }),
      k.color(...C.gray),
      k.pos(Q.tr.x + 20, Q.tr.y + PH - 44),
      k.z(4),
    ]);

    // Pizza in oven (hidden initially)
    const ovenPizza = k.add([
      k.circle(24),
      k.color(...C.doughDark),
      k.anchor("center"),
      k.pos(trCX, trCY - 10),
      k.z(6),
      k.opacity(0),
    ]);

    // "Place in oven" button / click zone
    k.add([
      k.text("Click oven to bake →", { size: 11, font: "sans-serif" }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(trCX, Q.tr.y + 28),
      k.z(4),
    ]);

    let baking = false;
    let bakeStarted = false;

    k.onMousePress(() => {
      if (stage !== "bake" || baking) return;
      const mp = k.mousePos();
      const dx = mp.x - trCX;
      const dy = mp.y - trCY;
      if (Math.abs(dx) < PW / 2 - 10 && Math.abs(dy) < PH / 2 - 10) {
        startBaking();
      }
    });

    k.onTouchStart((_t, e) => {
      if (stage !== "bake" || baking) return;
      const t0 = e.changedTouches[0]; if (!t0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (t0.clientX - rect.left) * (VW / rect.width);
      const my = (t0.clientY - rect.top) * (VH / rect.height);
      if (Math.abs(mx - trCX) < PW / 2 - 10 && Math.abs(my - trCY) < PH / 2 - 10) {
        startBaking();
      }
    });

    function startBaking() {
      baking = true;
      bakeStarted = true;
      ovenPizza.opacity = 1;
    }

    k.onUpdate(() => {
      if (!bakeStarted || stage !== "bake") return;
      pizza.bakeProgress = Math.min(100, pizza.bakeProgress + k.dt() * 20);
      bakeBar.width = (PW - 40) * (pizza.bakeProgress / 100);

      // Oven glow flicker
      ovenGlow.opacity = 0.4 + Math.sin(k.time() * 8) * 0.3;

      // Pizza colour transitions to cooked
      const t = pizza.bakeProgress / 100;
      ovenPizza.color = rgb([
        Math.round(C.doughDark[0] * (1 - t) + C.cooked[0] * t),
        Math.round(C.doughDark[1] * (1 - t) + C.cooked[1] * t),
        Math.round(C.doughDark[2] * (1 - t) + C.cooked[2] * t),
      ]);

      if (pizza.bakeProgress >= 100 && stage === "bake") {
        stage = "pack";
        baking = false;
        updateStageLabel();
        showBakeDone();
      }
    });

    function showBakeDone() {
      const msg = k.add([
        k.text("✅ Pizza baked!", { size: 16, font: "sans-serif" }),
        k.color(...C.emerald),
        k.anchor("center"),
        k.pos(trCX, trCY - 70),
        k.z(10),
      ]);
      k.wait(2, () => k.destroy(msg));
    }

    // ════════════════════════════════════════════════════════════════════════
    // TOP-LEFT: PACK SECTION
    // ════════════════════════════════════════════════════════════════════════
    const tlCX = Q.tl.x + PW / 2;
    const tlCY = Q.tl.y + PH / 2 + 10;

    // Box (open)
    const boxOpen = k.add([
      k.rect(100, 80, { radius: 6 }),
      k.color(...C.box),
      k.anchor("center"),
      k.pos(tlCX, tlCY + 10),
      k.z(3),
    ]);
    void boxOpen;

    // Box lid (flap)
    const boxLid = k.add([
      k.rect(100, 40, { radius: 6 }),
      k.color(...C.boxDark),
      k.anchor("bot-center"),
      k.pos(tlCX, tlCY - 30),
      k.z(4),
    ]);
    void boxLid;

    // Box interior
    k.add([
      k.rect(92, 72, { radius: 4 }),
      k.color(180, 120, 50),
      k.anchor("center"),
      k.pos(tlCX, tlCY + 10),
      k.z(4),
    ]);

    // Pizza in box (hidden)
    const boxPizza = k.add([
      k.circle(34),
      k.color(...C.cooked),
      k.anchor("center"),
      k.pos(tlCX, tlCY + 10),
      k.z(5),
      k.opacity(0),
    ]);

    // Pack button
    const packBtn = k.add([
      k.rect(PW - 40, 36, { radius: 8 }),
      k.color(40, 40, 50),
      k.anchor("center"),
      k.pos(tlCX, Q.tl.y + PH - 30),
      k.z(4),
    ]);
    void packBtn;

    const packBtnText = k.add([
      k.text("Click to Pack!", { size: 14, font: "sans-serif" }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(tlCX, Q.tl.y + PH - 30),
      k.z(5),
    ]);

    k.add([
      k.text("Pack the pizza", { size: 11, font: "sans-serif" }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(tlCX, Q.tl.y + 28),
      k.z(4),
    ]);

    function doPack() {
      if (stage !== "pack" || pizza.packed) return;
      pizza.packed = true;
      stage = "done";
      updateStageLabel();
      packBtnText.text = "Packed! ✅";
      packBtnText.color = rgb(C.emerald);
      boxPizza.opacity = 1;

      // Animate lid closing
      let lidClose = 0;
      const closeLid = k.onUpdate(() => {
        lidClose += k.dt() * 120;
        boxLid.pos.y = (tlCY - 30) + Math.min(lidClose, 40);
        if (lidClose >= 40) {
          closeLid.cancel();
          showPackDone();
        }
      });
    }

    k.onMousePress(() => {
      if (stage !== "pack") return;
      const mp = k.mousePos();
      const dx = mp.x - tlCX;
      const dy = mp.y - (Q.tl.y + PH - 30);
      if (Math.abs(dx) < (PW - 40) / 2 && Math.abs(dy) < 18) {
        doPack();
      }
    });

    k.onTouchStart((_t, e) => {
      if (stage !== "pack") return;
      const t0 = e.changedTouches[0]; if (!t0) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (t0.clientX - rect.left) * (VW / rect.width);
      const my = (t0.clientY - rect.top) * (VH / rect.height);
      const dx = mx - tlCX;
      const dy = my - (Q.tl.y + PH - 30);
      if (Math.abs(dx) < (PW - 40) / 2 && Math.abs(dy) < 18) {
        doPack();
      }
    });

    function showPackDone() {
      // Confetti burst
      for (let i = 0; i < 30; i++) {
        k.wait(Math.random() * 0.5, () => {
          const confetti = k.add([
            k.rect(6, 6, { radius: 1 }),
            k.color(k.choose([rgb(C.emerald), rgb(C.orange), rgb(C.red), rgb(C.cheese)])),
            k.anchor("center"),
            k.pos(tlCX + k.rand(-60, 60), tlCY + k.rand(-40, 40)),
            k.z(20),
            k.move(k.vec2(k.rand(-80, 80), k.rand(-120, -40)), 1),
          ]);
          k.wait(1.5, () => k.destroy(confetti));
        });
      }

      addScore(pizza.toppings.length * 10 + 50);

      k.wait(2, () => {
        k.add([
          k.text("🍕 Pizza Delivered!", { size: 22, font: "sans-serif" }),
          k.color(...C.emerald),
          k.anchor("center"),
          k.pos(VW / 2, VH / 2 - 20),
          k.z(30),
        ]);
        k.add([
          k.text("Tap to make another!", { size: 15, font: "sans-serif" }),
          k.color(...C.white),
          k.anchor("center"),
          k.pos(VW / 2, VH / 2 + 20),
          k.z(30),
        ]);
        k.onMousePress(() => k.go("play"));
        k.onTouchStart(() => k.go("play"));
      });
    }

    // ── Dim inactive sections ─────────────────────────────────────────────
    // Overlay dim panels for inactive sections
    const dimTL = k.add([k.rect(PW, PH, { radius: 10 }), k.color(0, 0, 0), k.opacity(0.55), k.pos(Q.tl.x, Q.tl.y), k.z(8)]);
    const dimTR = k.add([k.rect(PW, PH, { radius: 10 }), k.color(0, 0, 0), k.opacity(0.55), k.pos(Q.tr.x, Q.tr.y), k.z(8)]);
    const dimBR = k.add([k.rect(PW, PH, { radius: 10 }), k.color(0, 0, 0), k.opacity(0.55), k.pos(Q.br.x, Q.br.y), k.z(8)]);

    k.onUpdate(() => {
      // Show/hide dim overlays based on stage
      dimTL.opacity = (stage === "pack" || stage === "done") ? 0 : 0.55;
      dimTR.opacity = (stage === "bake" || stage === "pack" || stage === "done") ? 0 : 0.55;
      dimBR.opacity = (stage === "top" || stage === "bake" || stage === "pack" || stage === "done") ? 0 : 0.55;
    });
  });

  k.go("play");
  return () => k.quit();
}
