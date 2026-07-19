import kaplay from "kaplay";
type K = ReturnType<typeof kaplay>;

// Virtual canvas size
const VW = 800;
const VH = 600;

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  bg: [245, 235, 215] as [number, number, number],
  divider: [200, 180, 150] as [number, number, number],
  dough: [240, 210, 160] as [number, number, number],
  doughDark: [210, 175, 120] as [number, number, number],
  kneadBg: [255, 245, 225] as [number, number, number],
  toppingsBg: [255, 250, 235] as [number, number, number],
  ovenBg: [60, 40, 30] as [number, number, number],
  ovenInner: [90, 50, 30] as [number, number, number],
  packBg: [230, 240, 255] as [number, number, number],
  sauce: [200, 50, 30] as [number, number, number],
  cheese: [255, 220, 80] as [number, number, number],
  pepperoni: [180, 40, 40] as [number, number, number],
  mushroom: [150, 120, 90] as [number, number, number],
  olive: [60, 80, 40] as [number, number, number],
  pepper: [50, 160, 50] as [number, number, number],
  box: [200, 150, 80] as [number, number, number],
  boxLid: [220, 170, 100] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [20, 20, 20] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
  orange: [234, 88, 12] as [number, number, number],
  gray: [120, 120, 120] as [number, number, number],
  fire1: [255, 80, 20] as [number, number, number],
  fire2: [255, 180, 0] as [number, number, number],
};

// ── Game state shared across scenes ──────────────────────────────────────────
interface GameState {
  kneadProgress: number;   // 0–100
  toppings: string[];      // which toppings were added
  baked: boolean;
  packed: boolean;
  score: number;
}

const state: GameState = {
  kneadProgress: 0,
  toppings: [],
  baked: false,
  packed: false,
  score: 0,
};

function resetState() {
  state.kneadProgress = 0;
  state.toppings = [];
  state.baked = false;
  state.packed = false;
}

// ── Helper: draw a thick dividing line ────────────────────────────────────────
function drawDividers(k: K) {
  // Vertical centre line
  k.add([
    k.rect(4, VH),
    k.color(...C.divider),
    k.pos(VW / 2 - 2, 0),
    k.z(10),
  ]);
  // Horizontal centre line
  k.add([
    k.rect(VW, 4),
    k.color(...C.divider),
    k.pos(0, VH / 2 - 2),
    k.z(10),
  ]);
}

// ── Helper: section label ─────────────────────────────────────────────────────
function sectionLabel(k: K, txt: string, x: number, y: number, col: [number, number, number]) {
  k.add([
    k.text(txt, { size: 13, font: "sans-serif" }),
    k.color(...col),
    k.pos(x, y),
    k.z(11),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCENE: play  (all four quadrants live here)
// ═══════════════════════════════════════════════════════════════════════════════
function buildPlayScene(k: K, onScore: (n: number) => void) {
  k.scene("play", () => {
    resetState();

    // ── Quadrant backgrounds ──────────────────────────────────────────────────
    // Bottom-left: Knead (dough prep)
    k.add([k.rect(VW / 2, VH / 2), k.color(...C.kneadBg), k.pos(0, VH / 2), k.z(0)]);
    // Bottom-right: Toppings
    k.add([k.rect(VW / 2, VH / 2), k.color(...C.toppingsBg), k.pos(VW / 2, VH / 2), k.z(0)]);
    // Top-right: Oven
    k.add([k.rect(VW / 2, VH / 2), k.color(...C.ovenBg), k.pos(VW / 2, 0), k.z(0)]);
    // Top-left: Packing
    k.add([k.rect(VW / 2, VH / 2), k.color(...C.packBg), k.pos(0, 0), k.z(0)]);

    drawDividers(k);

    sectionLabel(k, "① KNEAD DOUGH", 12, VH / 2 + 6, C.orange);
    sectionLabel(k, "② ADD TOPPINGS", VW / 2 + 8, VH / 2 + 6, C.orange);
    sectionLabel(k, "③ BAKE", VW / 2 + 8, 6, [255, 160, 40]);
    sectionLabel(k, "④ PACK", 12, 6, [50, 100, 200]);

    // ═══════════════════════════════════════════════════════════════════════════
    //  QUADRANT 1 — BOTTOM-LEFT — KNEAD DOUGH
    // ═══════════════════════════════════════════════════════════════════════════
    const Q1 = { x: 0, y: VH / 2, w: VW / 2, h: VH / 2 };

    // Dough blob in the centre of Q1
    const doughCX = Q1.x + Q1.w / 2;
    const doughCY = Q1.y + Q1.h / 2 + 10;
    const doughR = 70;

    const doughObj = k.add([
      k.circle(doughR),
      k.color(...C.dough),
      k.anchor("center"),
      k.pos(doughCX, doughCY),
      k.area({ shape: new k.Circle(k.vec2(0, 0), doughR) }),
      k.z(2),
      "dough",
    ]);

    // Knead progress bar
    const barBg = k.add([
      k.rect(140, 14, { radius: 7 }),
      k.color(200, 190, 170),
      k.anchor("center"),
      k.pos(doughCX, Q1.y + Q1.h - 24),
      k.z(3),
    ]);
    void barBg; // used for layout reference only

    const barFill = k.add([
      k.rect(0, 10, { radius: 5 }),
      k.color(...C.green),
      k.pos(doughCX - 70, Q1.y + Q1.h - 27),
      k.z(4),
    ]);

    const kneadLabel = k.add([
      k.text("Knead: 0%", { size: 12 }),
      k.color(...C.black),
      k.anchor("center"),
      k.pos(doughCX, Q1.y + Q1.h - 44),
      k.z(4),
    ]);

    // Knead instruction
    k.add([
      k.text("Click & drag on dough!", { size: 11 }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(doughCX, Q1.y + 28),
      k.z(3),
    ]);

    // Knead interaction: drag mouse over the dough
    let isDraggingDough = false;
    let lastMousePos = k.vec2(0, 0);
    let kneadDone = false;

    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x < VW / 2 && mp.y > VH / 2) {
        const dist = mp.dist(doughObj.pos);
        if (dist < doughR + 10) isDraggingDough = true;
      }
    });
    k.onMouseRelease(() => { isDraggingDough = false; });

    k.onUpdate(() => {
      if (isDraggingDough && !kneadDone) {
        const mp = k.mousePos();
        const delta = mp.dist(lastMousePos);
        if (delta > 2) {
          state.kneadProgress = Math.min(100, state.kneadProgress + delta * 0.12);
          barFill.width = (state.kneadProgress / 100) * 140;
          kneadLabel.text = `Knead: ${Math.floor(state.kneadProgress)}%`;
          // Animate dough colour as it gets kneaded
          const t = state.kneadProgress / 100;
          doughObj.color = k.rgb(
            C.dough[0] - Math.floor(t * (C.dough[0] - C.doughDark[0])),
            C.dough[1] - Math.floor(t * (C.dough[1] - C.doughDark[1])),
            C.dough[2] - Math.floor(t * (C.dough[2] - C.doughDark[2])),
          );
        }
        lastMousePos = mp;
        if (state.kneadProgress >= 100 && !kneadDone) {
          kneadDone = true;
          kneadLabel.text = "Ready! ✓";
          kneadLabel.color = k.rgb(...C.green);
        }
      }
      if (isDraggingDough) lastMousePos = k.mousePos();
    });

    // Touch support for kneading
    k.onTouchStart((_touch, e) => {
      const touches = (e as TouchEvent).touches;
      if (touches.length > 0) {
        const t = touches[0]!;
        const rect = (k as unknown as { canvas: HTMLCanvasElement }).canvas.getBoundingClientRect();
        const scaleX = VW / rect.width;
        const scaleY = VH / rect.height;
        const tx = (t.clientX - rect.left) * scaleX;
        const ty = (t.clientY - rect.top) * scaleY;
        if (tx < VW / 2 && ty > VH / 2) {
          const dist = Math.hypot(tx - doughObj.pos.x, ty - doughObj.pos.y);
          if (dist < doughR + 10) {
            isDraggingDough = true;
            lastMousePos = k.vec2(tx, ty);
          }
        }
      }
    });
    k.onTouchEnd(() => { isDraggingDough = false; });

    // ═══════════════════════════════════════════════════════════════════════════
    //  QUADRANT 2 — BOTTOM-RIGHT — TOPPINGS
    // ═══════════════════════════════════════════════════════════════════════════
    const Q2 = { x: VW / 2, y: VH / 2, w: VW / 2, h: VH / 2 };
    const pizzaCX = Q2.x + Q2.w / 2;
    const pizzaCY = Q2.y + Q2.h / 2 + 10;
    const pizzaR = 65;

    // Pizza base (flat dough)
    const pizzaBase = k.add([
      k.circle(pizzaR),
      k.color(...C.dough),
      k.anchor("center"),
      k.pos(pizzaCX, pizzaCY),
      k.z(2),
    ]);

    // Sauce layer (hidden until toppings applied)
    const sauceLayer = k.add([
      k.circle(pizzaR - 8),
      k.color(...C.sauce),
      k.anchor("center"),
      k.pos(pizzaCX, pizzaCY),
      k.z(3),
      k.opacity(0),
    ]);

    // Topping buttons on the right side of Q2
    type ToppingDef = { name: string; col: [number, number, number]; emoji: string };
    const toppingDefs: ToppingDef[] = [
      { name: "sauce", col: C.sauce, emoji: "🍅" },
      { name: "cheese", col: C.cheese, emoji: "🧀" },
      { name: "pepperoni", col: C.pepperoni, emoji: "🍕" },
      { name: "mushroom", col: C.mushroom, emoji: "🍄" },
      { name: "olive", col: C.olive, emoji: "🫒" },
      { name: "pepper", col: C.pepper, emoji: "🫑" },
    ];

    const toppingBtnY = Q2.y + 30;
    const toppingBtnSpacingY = 36;
    const toppingBtnX = Q2.x + Q2.w - 55;

    // Drag state
    let dragging: { name: string; col: [number, number, number]; obj: ReturnType<K["add"]> } | null = null;

    toppingDefs.forEach((td, i) => {
      const by = toppingBtnY + i * toppingBtnSpacingY;
      // Button background
      k.add([
        k.rect(90, 28, { radius: 6 }),
        k.color(...td.col),
        k.anchor("center"),
        k.pos(toppingBtnX, by),
        k.z(5),
        k.area(),
        `toppingBtn_${td.name}`,
      ]);
      k.add([
        k.text(`${td.emoji} ${td.name}`, { size: 11 }),
        k.color(...C.white),
        k.anchor("center"),
        k.pos(toppingBtnX, by),
        k.z(6),
      ]);
    });

    // Instruction
    k.add([
      k.text("Drag toppings onto pizza!", { size: 11 }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(pizzaCX - 20, Q2.y + 28),
      k.z(4),
    ]);

    // Toppings added label
    const toppingCountLabel = k.add([
      k.text("Toppings: 0", { size: 12 }),
      k.color(...C.black),
      k.anchor("center"),
      k.pos(pizzaCX - 20, Q2.y + Q2.h - 24),
      k.z(4),
    ]);

    // Drag a topping
    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x < VW / 2 || mp.y < VH / 2) return; // not in Q2
      toppingDefs.forEach((td, i) => {
        const by = toppingBtnY + i * toppingBtnSpacingY;
        if (Math.abs(mp.x - toppingBtnX) < 50 && Math.abs(mp.y - by) < 16) {
          // Start drag
          const dragObj = k.add([
            k.circle(10),
            k.color(...td.col),
            k.anchor("center"),
            k.pos(mp.x, mp.y),
            k.z(20),
          ]);
          dragging = { name: td.name, col: td.col, obj: dragObj };
        }
      });
    });

    k.onMouseRelease(() => {
      if (!dragging) return;
      const mp = k.mousePos();
      const dist = mp.dist(k.vec2(pizzaCX, pizzaCY));
      if (dist < pizzaR + 10) {
        // Drop topping on pizza
        if (!state.toppings.includes(dragging.name)) {
          state.toppings.push(dragging.name);
          toppingCountLabel.text = `Toppings: ${state.toppings.length}`;
          // Show sauce layer
          if (dragging.name === "sauce") {
            sauceLayer.opacity = 0.85;
          } else {
            // Add a small topping dot on pizza
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (pizzaR - 16);
            k.add([
              k.circle(dragging.name === "cheese" ? 8 : 6),
              k.color(...dragging.col),
              k.anchor("center"),
              k.pos(pizzaCX + Math.cos(angle) * r, pizzaCY + Math.sin(angle) * r),
              k.z(4),
            ]);
            // Add a 2nd dot
            const angle2 = Math.random() * Math.PI * 2;
            const r2 = Math.random() * (pizzaR - 16);
            k.add([
              k.circle(dragging.name === "cheese" ? 7 : 5),
              k.color(...dragging.col),
              k.anchor("center"),
              k.pos(pizzaCX + Math.cos(angle2) * r2, pizzaCY + Math.sin(angle2) * r2),
              k.z(4),
            ]);
          }
        }
      }
      k.destroy(dragging.obj);
      dragging = null;
    });

    k.onUpdate(() => {
      if (dragging) {
        dragging.obj.pos = k.mousePos();
      }
    });

    // Keep pizza base visible
    void pizzaBase;

    // ═══════════════════════════════════════════════════════════════════════════
    //  QUADRANT 3 — TOP-RIGHT — OVEN
    // ═══════════════════════════════════════════════════════════════════════════
    const Q3 = { x: VW / 2, y: 0, w: VW / 2, h: VH / 2 };
    const ovenCX = Q3.x + Q3.w / 2;
    const ovenCY = Q3.y + Q3.h / 2 + 10;

    // Oven body
    k.add([k.rect(180, 130, { radius: 10 }), k.color(80, 60, 50), k.anchor("center"), k.pos(ovenCX, ovenCY), k.z(2)]);
    // Oven window
    const ovenWindow = k.add([
      k.rect(120, 80, { radius: 6 }),
      k.color(...C.ovenInner),
      k.anchor("center"),
      k.pos(ovenCX, ovenCY - 5),
      k.z(3),
    ]);
    void ovenWindow;

    // Oven door handle
    k.add([k.rect(60, 8, { radius: 4 }), k.color(180, 180, 180), k.anchor("center"), k.pos(ovenCX, ovenCY + 52), k.z(4)]);

    // Temperature knob
    k.add([k.circle(12), k.color(180, 180, 180), k.anchor("center"), k.pos(ovenCX - 70, ovenCY + 52), k.z(4)]);
    k.add([k.circle(12), k.color(180, 180, 180), k.anchor("center"), k.pos(ovenCX + 70, ovenCY + 52), k.z(4)]);

    // Flames (animated via update)
    let flameT = 0;
    let ovenBaking = false;
    let bakeTimer = 0;
    const BAKE_TIME = 4.0;

    const flame1 = k.add([k.rect(14, 20, { radius: 4 }), k.color(...C.fire1), k.anchor("center"), k.pos(ovenCX - 20, ovenCY + 10), k.z(4), k.opacity(0)]);
    const flame2 = k.add([k.rect(10, 16, { radius: 4 }), k.color(...C.fire2), k.anchor("center"), k.pos(ovenCX, ovenCY + 12), k.z(4), k.opacity(0)]);
    const flame3 = k.add([k.rect(14, 20, { radius: 4 }), k.color(...C.fire1), k.anchor("center"), k.pos(ovenCX + 20, ovenCY + 10), k.z(4), k.opacity(0)]);

    // Pizza inside oven (hidden until baking)
    const ovenPizza = k.add([
      k.circle(28),
      k.color(...C.dough),
      k.anchor("center"),
      k.pos(ovenCX, ovenCY - 5),
      k.z(5),
      k.opacity(0),
    ]);

    // Bake progress bar
    const bakeBg = k.add([k.rect(140, 14, { radius: 7 }), k.color(60, 40, 30), k.anchor("center"), k.pos(ovenCX, Q3.y + Q3.h - 22), k.z(4)]);
    void bakeBg;
    const bakeFill = k.add([k.rect(0, 10, { radius: 5 }), k.color(...C.fire1), k.pos(ovenCX - 70, Q3.y + Q3.h - 25), k.z(5)]);
    const bakeLabel = k.add([k.text("Bake: drag pizza here!", { size: 11 }), k.color([255, 180, 80] as unknown as ReturnType<K["rgb"]>), k.anchor("center"), k.pos(ovenCX, Q3.y + 28), k.z(4)]);

    // Bake button area (click oven to bake)
    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x < VW / 2 || mp.y > VH / 2) return;
      const dist = mp.dist(k.vec2(ovenCX, ovenCY));
      if (dist < 90 && !ovenBaking && !state.baked) {
        if (state.kneadProgress < 100) {
          bakeLabel.text = "Knead dough first!";
          bakeLabel.color = k.rgb(255, 80, 80);
          k.wait(1.5, () => { bakeLabel.text = "Bake: drag pizza here!"; bakeLabel.color = k.rgb(255, 180, 80); });
          return;
        }
        if (state.toppings.length < 2) {
          bakeLabel.text = "Add at least 2 toppings!";
          bakeLabel.color = k.rgb(255, 80, 80);
          k.wait(1.5, () => { bakeLabel.text = "Bake: drag pizza here!"; bakeLabel.color = k.rgb(255, 180, 80); });
          return;
        }
        ovenBaking = true;
        bakeTimer = 0;
        ovenPizza.opacity = 0.9;
        flame1.opacity = 1;
        flame2.opacity = 1;
        flame3.opacity = 1;
        bakeLabel.text = "Baking...";
      }
    });

    k.onUpdate(() => {
      if (ovenBaking && !state.baked) {
        bakeTimer += k.dt();
        flameT += k.dt() * 8;
        flame1.pos.y = ovenCY + 10 + Math.sin(flameT) * 4;
        flame2.pos.y = ovenCY + 12 + Math.sin(flameT + 1) * 4;
        flame3.pos.y = ovenCY + 10 + Math.sin(flameT + 2) * 4;
        bakeFill.width = Math.min(140, (bakeTimer / BAKE_TIME) * 140);

        // Pizza gets more golden as it bakes
        const t = Math.min(1, bakeTimer / BAKE_TIME);
        ovenPizza.color = k.rgb(
          C.dough[0] - Math.floor(t * 60),
          C.dough[1] - Math.floor(t * 80),
          C.dough[2] - Math.floor(t * 100),
        );

        if (bakeTimer >= BAKE_TIME) {
          state.baked = true;
          ovenBaking = false;
          flame1.opacity = 0;
          flame2.opacity = 0;
          flame3.opacity = 0;
          bakeLabel.text = "Done! ✓ Now pack it →";
          bakeLabel.color = k.rgb(...C.green);
        }
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    //  QUADRANT 4 — TOP-LEFT — PACKING
    // ═══════════════════════════════════════════════════════════════════════════
    const Q4 = { x: 0, y: 0, w: VW / 2, h: VH / 2 };
    const packCX = Q4.x + Q4.w / 2;
    const packCY = Q4.y + Q4.h / 2 + 10;

    // Box bottom
    const boxBottom = k.add([
      k.rect(160, 20, { radius: 4 }),
      k.color(...C.box),
      k.anchor("center"),
      k.pos(packCX, packCY + 50),
      k.z(2),
    ]);
    void boxBottom;
    k.add([k.rect(20, 80, { radius: 4 }), k.color(...C.box), k.anchor("center"), k.pos(packCX - 70, packCY + 10), k.z(2)]);
    k.add([k.rect(20, 80, { radius: 4 }), k.color(...C.box), k.anchor("center"), k.pos(packCX + 70, packCY + 10), k.z(2)]);
    k.add([k.rect(160, 20, { radius: 4 }), k.color(...C.box), k.anchor("center"), k.pos(packCX, packCY - 30), k.z(2)]);

    // Box lid (closed on top)
    const boxLid = k.add([
      k.rect(170, 24, { radius: 6 }),
      k.color(...C.boxLid),
      k.anchor("center"),
      k.pos(packCX, packCY - 42),
      k.z(6),
      k.opacity(0.3),
    ]);

    // Pizza in box (shown when packed)
    const packedPizza = k.add([
      k.circle(52),
      k.color(...C.doughDark),
      k.anchor("center"),
      k.pos(packCX, packCY + 5),
      k.z(3),
      k.opacity(0),
    ]);

    // Pack button
    const packBtn = k.add([
      k.rect(130, 38, { radius: 8 }),
      k.color(50, 100, 200),
      k.anchor("center"),
      k.pos(packCX, Q4.y + Q4.h - 24),
      k.z(5),
      k.area(),
    ]);
    void packBtn;
    k.add([
      k.text("📦 Pack Pizza!", { size: 13 }),
      k.color(...C.white),
      k.anchor("center"),
      k.pos(packCX, Q4.y + Q4.h - 24),
      k.z(6),
    ]);

    const packLabel = k.add([
      k.text("Pack the pizza when baked!", { size: 11 }),
      k.color([80, 100, 200] as unknown as ReturnType<K["rgb"]>),
      k.anchor("center"),
      k.pos(packCX, Q4.y + 28),
      k.z(4),
    ]);

    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x > VW / 2 || mp.y > VH / 2) return; // not in Q4
      const dist = mp.dist(k.vec2(packCX, Q4.y + Q4.h - 24));
      if (dist < 80 && !state.packed) {
        if (!state.baked) {
          packLabel.text = "Bake the pizza first!";
          packLabel.color = k.rgb(255, 80, 80);
          k.wait(1.5, () => { packLabel.text = "Pack the pizza when baked!"; packLabel.color = k.rgb(80, 100, 200); });
          return;
        }
        // Pack it!
        state.packed = true;
        packedPizza.opacity = 1;
        boxLid.opacity = 1;
        packLabel.text = "Pizza packed! ✓";
        packLabel.color = k.rgb(...C.green);

        // Score
        let pts = 100;
        pts += state.toppings.length * 20;
        state.score += pts;
        onScore(state.score);

        k.wait(1.8, () => {
          k.go("celebrate", state.score);
        });
      }
    });

    // Touch support for pack button
    k.onTouchStart((_touch, e) => {
      const touches = (e as TouchEvent).touches;
      if (touches.length > 0) {
        const t = touches[0]!;
        const rect = (k as unknown as { canvas: HTMLCanvasElement }).canvas.getBoundingClientRect();
        const scaleX = VW / rect.width;
        const scaleY = VH / rect.height;
        const tx = (t.clientX - rect.left) * scaleX;
        const ty = (t.clientY - rect.top) * scaleY;
        if (tx < VW / 2 && ty < VH / 2) {
          const dist = Math.hypot(tx - packCX, ty - (Q4.y + Q4.h - 24));
          if (dist < 80 && !state.packed) {
            if (!state.baked) {
              packLabel.text = "Bake the pizza first!";
              packLabel.color = k.rgb(255, 80, 80);
              k.wait(1.5, () => { packLabel.text = "Pack the pizza when baked!"; packLabel.color = k.rgb(80, 100, 200); });
              return;
            }
            state.packed = true;
            packedPizza.opacity = 1;
            boxLid.opacity = 1;
            packLabel.text = "Pizza packed! ✓";
            packLabel.color = k.rgb(...C.green);
            let pts = 100;
            pts += state.toppings.length * 20;
            state.score += pts;
            onScore(state.score);
            k.wait(1.8, () => { k.go("celebrate", state.score); });
          }
        }
      }
    });

    // Step arrows / hints
    k.add([
      k.text("↓ Knead", { size: 10 }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(VW / 4, VH / 2 - 8),
      k.z(11),
    ]);
    k.add([
      k.text("↓ Top", { size: 10 }),
      k.color(...C.gray),
      k.anchor("center"),
      k.pos(VW * 3 / 4, VH / 2 - 8),
      k.z(11),
    ]);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCENE: celebrate
// ═══════════════════════════════════════════════════════════════════════════════
function buildCelebrateScene(k: K, onScore: (n: number) => void) {
  k.scene("celebrate", (finalScore: number) => {
    k.add([k.rect(VW, VH), k.color(245, 235, 215), k.pos(0, 0), k.z(0)]);

    k.add([
      k.text("🍕 Pizza Delivered!", { size: 42 }),
      k.color(234, 88, 12),
      k.anchor("center"),
      k.pos(VW / 2, VH / 2 - 80),
      k.z(2),
    ]);

    k.add([
      k.text(`Score: ${finalScore}`, { size: 32 }),
      k.color(16, 185, 129),
      k.anchor("center"),
      k.pos(VW / 2, VH / 2 - 10),
      k.z(2),
    ]);

    k.add([
      k.text(`Toppings: ${state.toppings.join(", ") || "none"}`, { size: 16 }),
      k.color(80, 80, 80),
      k.anchor("center"),
      k.pos(VW / 2, VH / 2 + 40),
      k.z(2),
    ]);

    k.add([
      k.text("Tap / click to make another pizza!", { size: 18 }),
      k.color(100, 100, 200),
      k.anchor("center"),
      k.pos(VW / 2, VH / 2 + 100),
      k.z(2),
    ]);

    // Save high score
    const hs = parseInt(localStorage.getItem("goodpizza_highscore") ?? "0", 10);
    if (finalScore > hs) localStorage.setItem("goodpizza_highscore", String(finalScore));
    const best = Math.max(finalScore, hs);
    k.add([
      k.text(`Best: ${best}`, { size: 16 }),
      k.color(180, 130, 40),
      k.anchor("center"),
      k.pos(VW / 2, VH / 2 + 70),
      k.z(2),
    ]);

    void onScore; // score already reported

    k.onMousePress(() => k.go("play"));
    k.onKeyPress("space", () => k.go("play"));
    k.onTouchStart(() => k.go("play"));
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════
export function startGame(canvas: HTMLCanvasElement, onScore: (n: number) => void): () => void {
  const k = kaplay({
    canvas,
    width: VW,
    height: VH,
    letterbox: true,
    background: [245, 235, 215],
    global: false,
    pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
  });

  buildPlayScene(k, onScore);
  buildCelebrateScene(k, onScore);

  k.go("play");
  return () => k.quit();
}
