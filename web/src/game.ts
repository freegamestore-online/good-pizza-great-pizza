import kaplay, { KAPLAYCtx, GameObj, Vec2 } from "kaplay";

const VW = 800;
const VH = 600;

// Quadrant centers
const Q = {
  // Bottom-left: Knead dough
  BL: { x: VW * 0.25, y: VH * 0.75 },
  // Bottom-right: Add toppings
  BR: { x: VW * 0.75, y: VH * 0.75 },
  // Top-right: Oven / bake
  TR: { x: VW * 0.75, y: VH * 0.25 },
  // Top-left: Pack pizza
  TL: { x: VW * 0.25, y: VH * 0.25 },
};

type Stage = "knead" | "toppings" | "bake" | "pack" | "done";

interface PizzaState {
  stage: Stage;
  kneadCount: number;
  toppings: string[];
  bakeProgress: number;
  packed: boolean;
}

const TOPPINGS_LIST = [
  { name: "tomato", color: [220, 50, 50] as [number, number, number], emoji: "🍅" },
  { name: "cheese", color: [255, 220, 50] as [number, number, number], emoji: "🧀" },
  { name: "mushroom", color: [160, 110, 80] as [number, number, number], emoji: "🍄" },
  { name: "olive", color: [60, 60, 60] as [number, number, number], emoji: "🫒" },
  { name: "pepper", color: [40, 180, 60] as [number, number, number], emoji: "🌶️" },
  { name: "sausage", color: [180, 80, 40] as [number, number, number], emoji: "🥩" },
];

export function startGame(canvas: HTMLCanvasElement, onScore: (n: number) => void): () => void {
  const k = kaplay({
    canvas,
    width: VW,
    height: VH,
    letterbox: true,
    background: [245, 235, 220],
    global: false,
    pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  });

  // ── helpers ──────────────────────────────────────────────────────────────

  function label(text: string, x: number, y: number, size = 14, col = k.rgb(80, 50, 30)) {
    return k.add([k.text(text, { size, font: "sans-serif", align: "center" }), k.pos(x, y), k.anchor("center"), k.color(col), k.z(10)]);
  }

  function drawDividers() {
    // Vertical divider
    k.add([k.rect(3, VH), k.pos(VW / 2, 0), k.color(180, 140, 100), k.opacity(0.5), k.z(1)]);
    // Horizontal divider
    k.add([k.rect(VW, 3), k.pos(0, VH / 2), k.color(180, 140, 100), k.opacity(0.5), k.z(1)]);
  }

  function sectionBg(x: number, y: number, w: number, h: number, col: [number, number, number]) {
    k.add([k.rect(w, h), k.pos(x, y), k.color(...col), k.opacity(0.18), k.z(0)]);
  }

  // ── PLAY SCENE ───────────────────────────────────────────────────────────

  k.scene("play", () => {
    let score = 0;
    onScore(0);

    const pizza: PizzaState = {
      stage: "knead",
      kneadCount: 0,
      toppings: [],
      bakeProgress: 0,
      packed: false,
    };

    // Background quadrant colours
    sectionBg(0, VH / 2, VW / 2, VH / 2, [255, 200, 100]);   // BL - warm yellow
    sectionBg(VW / 2, VH / 2, VW / 2, VH / 2, [200, 240, 200]); // BR - green
    sectionBg(VW / 2, 0, VW / 2, VH / 2, [255, 160, 100]);   // TR - orange
    sectionBg(0, 0, VW / 2, VH / 2, [200, 220, 255]);         // TL - blue

    drawDividers();

    // Section labels
    label("🫓  KNEAD DOUGH", Q.BL.x, VH / 2 + 16, 15, k.rgb(120, 70, 20));
    label("🍕  ADD TOPPINGS", Q.BR.x, VH / 2 + 16, 15, k.rgb(40, 120, 40));
    label("🔥  BAKE", Q.TR.x, 16, 15, k.rgb(180, 60, 10));
    label("📦  PACK", Q.TL.x, 16, 15, k.rgb(30, 60, 160));

    // ── STAGE INDICATOR ──────────────────────────────────────────────────
    const stageLabel = label("▶ Knead the dough! Tap/click it!", VW / 2, VH / 2 - 10, 13, k.rgb(60, 30, 10));

    function updateStageLabel() {
      const msgs: Record<Stage, string> = {
        knead: "▶ Knead the dough! Tap/click it!",
        toppings: "▶ Drag toppings onto the pizza!",
        bake: "▶ Click the oven to bake!",
        pack: "▶ Click the box to pack!",
        done: "▶ Pizza delivered! 🎉",
      };
      stageLabel.text = msgs[pizza.stage];
    }

    // ── SCORE DISPLAY ────────────────────────────────────────────────────
    const scoreLbl = label(`Pizzas: ${score}`, VW - 60, 30, 16, k.rgb(180, 60, 10));

    // ══════════════════════════════════════════════════════════════════════
    // BOTTOM-LEFT: KNEAD DOUGH
    // ══════════════════════════════════════════════════════════════════════

    // Dough stack (3 dough balls)
    const KNEAD_NEEDED = 8;
    let kneadAnimT = 0;
    let kneadPulse = false;

    // Dough stack display
    for (let i = 0; i < 3; i++) {
      k.add([
        k.circle(22 - i * 3),
        k.pos(Q.BL.x - 70 + i * 6, VH - 60 - i * 8),
        k.anchor("center"),
        k.color(240, 220, 170),
        k.z(2),
        k.opacity(0.7),
      ]);
    }
    label("Dough stack", Q.BL.x - 70, VH - 30, 11, k.rgb(140, 100, 40));

    // Active dough being kneaded
    const doughObj = k.add([
      k.circle(50),
      k.pos(Q.BL.x + 30, Q.BL.y),
      k.anchor("center"),
      k.color(240, 215, 160),
      k.area({ shape: new k.Circle(k.vec2(0, 0), 50) }),
      k.z(3),
      "dough",
    ]);

    const kneadBar = k.add([
      k.rect(100, 14, { radius: 7 }),
      k.pos(Q.BL.x + 30, Q.BL.y + 65),
      k.anchor("center"),
      k.color(200, 180, 130),
      k.z(3),
    ]);
    const kneadFill = k.add([
      k.rect(0, 10, { radius: 5 }),
      k.pos(Q.BL.x - 20, Q.BL.y + 65),
      k.color(220, 160, 60),
      k.z(4),
    ]);
    label("knead progress", Q.BL.x + 30, Q.BL.y + 82, 11, k.rgb(140, 100, 40));

    // Knead hand indicator
    const handLbl = label("👊", Q.BL.x + 30, Q.BL.y - 70, 28);

    function updateKneadBar() {
      const pct = Math.min(pizza.kneadCount / KNEAD_NEEDED, 1);
      kneadFill.width = pct * 96;
      kneadFill.pos.x = Q.BL.x - 20;
      kneadFill.pos.y = Q.BL.y + 60;
    }

    // Click / tap the dough to knead
    doughObj.onClick(() => {
      if (pizza.stage !== "knead") return;
      pizza.kneadCount++;
      kneadPulse = true;
      kneadAnimT = 0;
      updateKneadBar();

      // Jiggle dough colour
      const t = pizza.kneadCount / KNEAD_NEEDED;
      doughObj.color = k.rgb(240 - t * 30, 215 - t * 20, 160 - t * 30);

      if (pizza.kneadCount >= KNEAD_NEEDED) {
        pizza.stage = "toppings";
        updateStageLabel();
        handLbl.text = "✅";
        // Move dough to toppings section
        k.tween(doughObj.pos, k.vec2(Q.BR.x, Q.BR.y), 0.6, (v: Vec2) => {
          doughObj.pos = v;
        }, k.easingLinear);
        // Expand dough to pizza base
        k.tween(50, 70, 0.6, (r: number) => {
          (doughObj as GameObj).radius = r;
        }, k.easingLinear);
        spawnToppings();
      }
    });

    // Dough pulse animation on knead
    k.onUpdate(() => {
      if (kneadPulse) {
        kneadAnimT += k.dt();
        const s = 1 + Math.sin(kneadAnimT * 20) * 0.08;
        doughObj.scale = k.vec2(s, s);
        if (kneadAnimT > 0.25) { kneadPulse = false; doughObj.scale = k.vec2(1, 1); }
      }
    });

    // ══════════════════════════════════════════════════════════════════════
    // BOTTOM-RIGHT: TOPPINGS
    // ══════════════════════════════════════════════════════════════════════

    const toppingObjs: GameObj[] = [];
    let dragging: GameObj | null = null;
    let dragOffset = k.vec2(0, 0);
    const appliedToppings: { name: string; pos: Vec2 }[] = [];
    const MIN_TOPPINGS = 3;

    function spawnToppings() {
      const cols = 3;
      TOPPINGS_LIST.forEach((t, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const tx = VW / 2 + 30 + col * 75;
        const ty = VH / 2 + 50 + row * 80;

        const obj = k.add([
          k.circle(22),
          k.pos(tx, ty),
          k.anchor("center"),
          k.color(...t.color),
          k.area({ shape: new k.Circle(k.vec2(0, 0), 22) }),
          k.z(5),
          { toppingName: t.name, origPos: k.vec2(tx, ty) },
          "topping",
        ]);

        const emojiLbl = k.add([
          k.text(t.emoji, { size: 20 }),
          k.anchor("center"),
          k.pos(tx, ty - 2),
          k.z(6),
        ]);

        // Keep emoji synced to topping pos
        k.onUpdate(() => {
          emojiLbl.pos = k.vec2(obj.pos.x, obj.pos.y - 2);
        });

        toppingObjs.push(obj);
      });

      label("Drag onto pizza 👆", Q.BR.x, VH - 26, 12, k.rgb(40, 120, 40));
    }

    // Drag toppings
    k.onMousePress(() => {
      if (pizza.stage !== "toppings") return;
      const mpos = k.mousePos();
      for (const obj of toppingObjs) {
        if (obj.pos.dist(mpos) < 28) {
          dragging = obj;
          dragOffset = k.vec2(obj.pos.x - mpos.x, obj.pos.y - mpos.y);
          obj.z = 20;
          break;
        }
      }
    });

    k.onMouseMove((mpos) => {
      if (!dragging) return;
      dragging.pos = k.vec2(mpos.x + dragOffset.x, mpos.y + dragOffset.y);
    });

    k.onMouseRelease(() => {
      if (!dragging || pizza.stage !== "toppings") { dragging = null; return; }
      const obj = dragging;
      dragging = null;
      obj.z = 5;

      // Check if dropped on pizza dough (bottom-right quadrant centre)
      const dist = obj.pos.dist(doughObj.pos);
      if (dist < 85) {
        // Snap to a random spot on the pizza
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * 45;
        const snapPos = k.vec2(doughObj.pos.x + Math.cos(angle) * r, doughObj.pos.y + Math.sin(angle) * r);
        obj.pos = snapPos;
        obj.z = 4;

        const tName = (obj as GameObj & { toppingName: string }).toppingName;
        if (!appliedToppings.find(t => t.name === tName)) {
          appliedToppings.push({ name: tName, pos: snapPos });
        }

        // Check if enough toppings
        if (appliedToppings.length >= MIN_TOPPINGS && pizza.stage === "toppings") {
          pizza.stage = "bake";
          updateStageLabel();
          // Move pizza + toppings to oven
          k.wait(0.5, () => movePizzaToOven());
        }
      } else {
        // Snap back
        k.tween(obj.pos, (obj as GameObj & { origPos: Vec2 }).origPos, 0.3, (v: Vec2) => {
          obj.pos = v;
        }, k.easingLinear);
      }
    });

    // Touch drag support
    k.onTouchStart((_touch, e) => {
      e.preventDefault();
    });

    // ══════════════════════════════════════════════════════════════════════
    // TOP-RIGHT: OVEN
    // ══════════════════════════════════════════════════════════════════════

    // Oven body
    k.add([k.rect(160, 130, { radius: 12 }), k.pos(Q.TR.x, Q.TR.y), k.anchor("center"), k.color(80, 80, 90), k.z(2)]);
    // Oven door
    const ovenDoor = k.add([k.rect(120, 80, { radius: 8 }), k.pos(Q.TR.x, Q.TR.y + 10), k.anchor("center"), k.color(50, 50, 60), k.z(3), k.area(), "ovenDoor"]);
    // Oven window
    k.add([k.circle(28), k.pos(Q.TR.x, Q.TR.y + 10), k.anchor("center"), k.color(255, 180, 40), k.opacity(0.3), k.z(4)]);
    // Oven knobs
    k.add([k.circle(8), k.pos(Q.TR.x - 40, Q.TR.y - 48), k.anchor("center"), k.color(200, 60, 40), k.z(4)]);
    k.add([k.circle(8), k.pos(Q.TR.x + 40, Q.TR.y - 48), k.anchor("center"), k.color(200, 60, 40), k.z(4)]);
    label("🔥 OVEN 🔥", Q.TR.x, Q.TR.y - 70, 16, k.rgb(200, 80, 10));

    // Bake progress bar
    const bakeBarBg = k.add([k.rect(120, 14, { radius: 7 }), k.pos(Q.TR.x, Q.TR.y + 68), k.anchor("center"), k.color(60, 60, 70), k.z(3)]);
    const bakeBarFill = k.add([k.rect(0, 10, { radius: 5 }), k.pos(Q.TR.x - 58, Q.TR.y + 65), k.color(255, 140, 20), k.z(4)]);
    label("bake progress", Q.TR.x, Q.TR.y + 82, 11, k.rgb(180, 80, 10));

    let baking = false;
    let pizzaInOven = false;
    let bakeT = 0;

    // Hide bake bar initially
    bakeBarBg.opacity = 0;
    bakeBarFill.opacity = 0;

    function movePizzaToOven() {
      pizzaInOven = true;
      bakeBarBg.opacity = 1;
      bakeBarFill.opacity = 1;
      k.tween(doughObj.pos, k.vec2(Q.TR.x, Q.TR.y + 10), 0.7, (v: Vec2) => {
        doughObj.pos = v;
      }, k.easingLinear);
      // Move toppings too
      toppingObjs.forEach(obj => {
        if (appliedToppings.find(t => t.pos.dist(obj.pos) < 5 || obj.pos.dist(doughObj.pos) < 90)) {
          // already on pizza, hide (they're visually "inside" oven)
          k.tween(obj.opacity, 0, 0.4, (v: number) => { obj.opacity = v; }, k.easingLinear);
        }
      });
    }

    ovenDoor.onClick(() => {
      if (pizza.stage !== "bake" || !pizzaInOven) return;
      if (!baking) {
        baking = true;
        // Oven glow
        ovenDoor.color = k.rgb(80, 50, 20);
      }
    });

    // Bake update
    k.onUpdate(() => {
      if (!baking || pizza.stage !== "bake") return;
      bakeT += k.dt();
      pizza.bakeProgress = Math.min(bakeT / 4, 1);
      bakeBarFill.width = pizza.bakeProgress * 116;

      // Dough turns golden
      const t = pizza.bakeProgress;
      doughObj.color = k.rgb(240 - t * 80, 180 - t * 60, 100 - t * 40);

      if (pizza.bakeProgress >= 1 && pizza.stage === "bake") {
        baking = false;
        pizza.stage = "pack";
        updateStageLabel();
        // Move pizza to packing section
        k.wait(0.4, () => {
          k.tween(doughObj.pos, k.vec2(Q.TL.x, Q.TL.y + 20), 0.7, (v: Vec2) => {
            doughObj.pos = v;
          }, k.easingLinear);
        });
      }
    });

    // ══════════════════════════════════════════════════════════════════════
    // TOP-LEFT: PACK
    // ══════════════════════════════════════════════════════════════════════

    // Pizza box
    const boxLid = k.add([k.rect(140, 20, { radius: 4 }), k.pos(Q.TL.x, Q.TL.y - 50), k.anchor("center"), k.color(200, 140, 60), k.z(5), k.area(), "boxLid"]);
    const boxBase = k.add([k.rect(140, 100, { radius: 6 }), k.pos(Q.TL.x, Q.TL.y + 10), k.anchor("center"), k.color(220, 170, 80), k.z(2)]);
    // Box label
    k.add([k.rect(80, 24, { radius: 4 }), k.pos(Q.TL.x, Q.TL.y + 10), k.anchor("center"), k.color(255, 100, 60), k.z(3)]);
    label("PIZZA", Q.TL.x, Q.TL.y + 10, 14, k.rgb(255, 255, 255));
    label("📦 Click box to pack!", Q.TL.x, Q.TL.y - 80, 14, k.rgb(30, 60, 160));

    // Delivery arrow
    const deliveryArrow = k.add([k.text("🚀 Deliver!", { size: 20 }), k.anchor("center"), k.pos(Q.TL.x, Q.TL.y + 75), k.opacity(0), k.z(6)]);

    boxLid.onClick(() => {
      if (pizza.stage !== "pack") return;
      pizza.stage = "done";
      pizza.packed = true;
      updateStageLabel();

      // Close box animation — lid drops down
      k.tween(boxLid.pos.y, Q.TL.y - 40, 0.3, (v: number) => { boxLid.pos.y = v; }, k.easingLinear);
      // Hide pizza under box
      k.tween(doughObj.opacity, 0, 0.3, (v: number) => { doughObj.opacity = v; }, k.easingLinear);

      // Show delivery arrow
      k.wait(0.4, () => {
        deliveryArrow.opacity = 1;
        // Fly box off screen
        k.wait(0.8, () => {
          k.tween(boxBase.pos.x, -200, 0.8, (v: number) => { boxBase.pos.x = v; }, k.easingLinear);
          k.tween(boxLid.pos.x, -200, 0.8, (v: number) => { boxLid.pos.x = v; }, k.easingLinear);
          k.tween(deliveryArrow.pos.x, -200, 0.8, (v: number) => { deliveryArrow.pos.x = v; }, k.easingLinear);
          k.wait(1.0, () => {
            score++;
            onScore(score);
            scoreLbl.text = `Pizzas: ${score}`;
            k.go("celebrate", score);
          });
        });
      });
    });

    // Unused objects (needed for layout) — suppress TS warnings
    void kneadBar;
    void bakeBarBg;
    void boxBase;
  });

  // ── CELEBRATE SCENE ──────────────────────────────────────────────────────

  k.scene("celebrate", (totalScore: number) => {
    sectionBg2(k, 0, 0, VW, VH, [255, 220, 150]);

    k.add([k.text("🎉 Pizza Delivered! 🎉", { size: 36, align: "center" }), k.anchor("center"), k.pos(VW / 2, VH / 2 - 80), k.color(180, 60, 10), k.z(5)]);
    k.add([k.text(`Pizzas made: ${totalScore}`, { size: 28, align: "center" }), k.anchor("center"), k.pos(VW / 2, VH / 2 - 20), k.color(60, 30, 10), k.z(5)]);

    // Confetti
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * VW;
      const cy = Math.random() * VH;
      const cols: [number, number, number][] = [[255, 80, 80], [80, 200, 80], [80, 80, 255], [255, 220, 50], [255, 100, 200]];
      const col = cols[Math.floor(Math.random() * cols.length)] ?? [255, 200, 50];
      k.add([k.rect(10, 10, { radius: 2 }), k.pos(cx, cy), k.anchor("center"), k.color(...col), k.z(3), k.opacity(0.85)]);
    }

    k.add([k.text("Tap to make another pizza!", { size: 18, align: "center" }), k.anchor("center"), k.pos(VW / 2, VH / 2 + 50), k.color(100, 60, 20), k.z(5)]);
    k.add([k.text("🍕", { size: 60 }), k.anchor("center"), k.pos(VW / 2, VH / 2 + 130), k.z(5)]);

    k.onMousePress(() => k.go("play"));
    k.onKeyPress("space", () => k.go("play"));
    k.onTouchStart(() => k.go("play"));
  });

  k.go("play");
  return () => k.quit();
}

// Helper used in celebrate scene (avoids closure capture issues)
function sectionBg2(k: KAPLAYCtx, x: number, y: number, w: number, h: number, col: [number, number, number]) {
  k.add([k.rect(w, h), k.pos(x, y), k.color(...col), k.opacity(0.9), k.z(0)]);
}
