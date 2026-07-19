import kaplay from "kaplay";
type K = ReturnType<typeof kaplay>;

// Virtual canvas dimensions
const VW = 800;
const VH = 600;

// ── Shared game state ─────────────────────────────────────────────────────────
interface PizzaState {
  kneadProgress: number;
  toppings: string[];
  baked: boolean;
  packed: boolean;
  score: number;
}

const state: PizzaState = {
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

// ── Colour palette ────────────────────────────────────────────────────────────
const PAL = {
  kneadBg:    [255, 248, 228] as [number, number, number],
  toppingsBg: [255, 252, 238] as [number, number, number],
  ovenBg:     [38, 24, 14]   as [number, number, number],
  packBg:     [228, 238, 255] as [number, number, number],
  divider:    [190, 165, 130] as [number, number, number],
  doughRaw:   [240, 212, 162] as [number, number, number],
  doughReady: [210, 175, 110] as [number, number, number],
  doughBaked: [185, 130, 65]  as [number, number, number],
  sauce:      [200, 48, 28]   as [number, number, number],
  cheese:     [255, 218, 70]  as [number, number, number],
  pepperoni:  [175, 38, 38]   as [number, number, number],
  mushroom:   [148, 116, 84]  as [number, number, number],
  olive:      [58, 78, 38]    as [number, number, number],
  bell:       [48, 158, 48]   as [number, number, number],
  boxCard:    [205, 155, 80]  as [number, number, number],
  boxLid:     [225, 175, 100] as [number, number, number],
  green:      [16, 185, 129]  as [number, number, number],
  orange:     [234, 88, 12]   as [number, number, number],
  fire1:      [255, 78, 18]   as [number, number, number],
  fire2:      [255, 178, 0]   as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
  black:      [20, 20, 20]    as [number, number, number],
  gray:       [130, 130, 130] as [number, number, number],
  blue:       [50, 100, 210]  as [number, number, number],
  ovenMetal:  [80, 62, 52]    as [number, number, number],
  ovenGlass:  [88, 48, 28]    as [number, number, number],
};

// ─────────────────────────────────────────────────────────────────────────────
//  SCENE: play
// ─────────────────────────────────────────────────────────────────────────────
function buildPlayScene(k: K, onScore: (n: number) => void) {
  k.scene("play", () => {
    resetState();
    onScore(0);

    // ── Quadrant backgrounds ──────────────────────────────────────────────────
    k.add([k.rect(VW / 2, VH / 2), k.color(...PAL.kneadBg),    k.pos(0,      VH / 2), k.z(0)]);
    k.add([k.rect(VW / 2, VH / 2), k.color(...PAL.toppingsBg), k.pos(VW / 2, VH / 2), k.z(0)]);
    k.add([k.rect(VW / 2, VH / 2), k.color(...PAL.ovenBg),     k.pos(VW / 2, 0),      k.z(0)]);
    k.add([k.rect(VW / 2, VH / 2), k.color(...PAL.packBg),     k.pos(0,      0),      k.z(0)]);

    // ── Dividers ──────────────────────────────────────────────────────────────
    k.add([k.rect(6, VH), k.color(...PAL.divider), k.pos(VW / 2 - 3, 0), k.z(10)]);
    k.add([k.rect(VW, 6), k.color(...PAL.divider), k.pos(0, VH / 2 - 3), k.z(10)]);

    // ── Section labels ────────────────────────────────────────────────────────
    k.add([k.text("① KNEAD DOUGH",  { size: 13 }), k.color(...PAL.orange), k.pos(16, VH / 2 + 10), k.z(12)]);
    k.add([k.text("② ADD TOPPINGS", { size: 13 }), k.color(...PAL.orange), k.pos(VW / 2 + 12, VH / 2 + 10), k.z(12)]);
    k.add([k.text("③ BAKE",         { size: 13 }), k.color(255, 160, 40), k.pos(VW / 2 + 12, 10), k.z(12)]);
    k.add([k.text("④ PACK",         { size: 13 }), k.color(...PAL.blue),  k.pos(16, 10), k.z(12)]);

    // =========================================================================
    //  Q1 — BOTTOM-LEFT — KNEAD DOUGH
    // =========================================================================
    const D_CX = VW / 4;
    const D_CY = VH * 3 / 4 + 8;
    const D_R  = 68;

    // Flour dusting (decorative)
    for (let i = 0; i < 14; i++) {
      k.add([
        k.circle(2 + Math.random() * 3),
        k.color(255, 252, 245),
        k.anchor("center"),
        k.pos(18 + Math.random() * (VW / 2 - 36), VH / 2 + 18 + Math.random() * (VH / 2 - 36)),
        k.z(1),
      ]);
    }

    // Kneading board
    k.add([k.rect(200, 16, { radius: 4 }), k.color(195, 160, 110), k.anchor("center"), k.pos(D_CX, D_CY + D_R + 12), k.z(1)]);

    // Dough blob
    const doughBlob = k.add([
      k.circle(D_R),
      k.color(...PAL.doughRaw),
      k.anchor("center"),
      k.pos(D_CX, D_CY),
      k.area({ shape: new k.Circle(k.vec2(0, 0), D_R) }),
      k.z(2),
    ]);

    // Knead ripple rings
    const ring1 = k.add([k.circle(D_R - 10), k.color(220, 190, 140), k.anchor("center"), k.pos(D_CX, D_CY), k.z(3), k.opacity(0)]);
    const ring2 = k.add([k.circle(D_R - 22), k.color(220, 190, 140), k.anchor("center"), k.pos(D_CX, D_CY), k.z(3), k.opacity(0)]);
    const ring3 = k.add([k.circle(D_R - 34), k.color(220, 190, 140), k.anchor("center"), k.pos(D_CX, D_CY), k.z(3), k.opacity(0)]);

    // Progress bar
    k.add([k.rect(160, 16, { radius: 8 }), k.color(200, 188, 168), k.anchor("center"), k.pos(D_CX, VH - 22), k.z(3)]);
    const kneadBar = k.add([k.rect(1, 12, { radius: 6 }), k.color(...PAL.green), k.pos(D_CX - 80, VH - 28), k.z(4)]);
    const kneadPct = k.add([k.text("Knead: 0%", { size: 12 }), k.color(...PAL.black), k.anchor("center"), k.pos(D_CX, VH - 44), k.z(4)]);
    k.add([k.text("Click & drag on dough!", { size: 11 }), k.color(...PAL.gray), k.anchor("center"), k.pos(D_CX, VH / 2 + 28), k.z(3)]);

    let isDraggingDough = false;
    let lastKneadPos    = k.vec2(0, 0);
    let kneadDone       = false;
    let kneadRingT      = 0;

    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x < VW / 2 && mp.y > VH / 2 && mp.dist(doughBlob.pos) < D_R + 12) {
        isDraggingDough = true;
        lastKneadPos    = mp;
      }
    });
    k.onMouseRelease(() => { isDraggingDough = false; });

    k.onUpdate(() => {
      if (isDraggingDough && !kneadDone) {
        const mp    = k.mousePos();
        const delta = mp.dist(lastKneadPos);
        if (delta > 2) {
          state.kneadProgress = Math.min(100, state.kneadProgress + delta * 0.13);
          kneadBar.width = Math.max(1, (state.kneadProgress / 100) * 160);
          kneadPct.text  = `Knead: ${Math.floor(state.kneadProgress)}%`;
          const t = state.kneadProgress / 100;
          doughBlob.color = k.rgb(
            Math.round(PAL.doughRaw[0] + t * (PAL.doughReady[0] - PAL.doughRaw[0])),
            Math.round(PAL.doughRaw[1] + t * (PAL.doughReady[1] - PAL.doughRaw[1])),
            Math.round(PAL.doughRaw[2] + t * (PAL.doughReady[2] - PAL.doughRaw[2])),
          );
          lastKneadPos = mp;
        }
        if (state.kneadProgress >= 100 && !kneadDone) {
          kneadDone       = true;
          kneadPct.text   = "Ready! ✓";
          kneadPct.color  = k.rgb(...PAL.green);
          doughBlob.color = k.rgb(...PAL.doughReady);
        }
      }
      // Animate knead rings
      if (isDraggingDough && state.kneadProgress < 100) {
        kneadRingT += k.dt() * 4;
        ring1.opacity = 0.18 * Math.abs(Math.sin(kneadRingT));
        ring2.opacity = 0.18 * Math.abs(Math.sin(kneadRingT + 1.2));
        ring3.opacity = 0.18 * Math.abs(Math.sin(kneadRingT + 2.4));
      } else {
        ring1.opacity = 0;
        ring2.opacity = 0;
        ring3.opacity = 0;
      }
    });

    // Touch knead
    k.onTouchStart((_touch, e) => {
      const te = e as TouchEvent;
      const t0 = te.touches[0];
      if (!t0) return;
      const rect   = (k as unknown as { canvas: HTMLCanvasElement }).canvas.getBoundingClientRect();
      const tx     = (t0.clientX - rect.left) * (VW / rect.width);
      const ty     = (t0.clientY - rect.top)  * (VH / rect.height);
      if (tx < VW / 2 && ty > VH / 2 && Math.hypot(tx - D_CX, ty - D_CY) < D_R + 12) {
        isDraggingDough = true;
        lastKneadPos    = k.vec2(tx, ty);
      }
    });
    k.onTouchEnd(() => { isDraggingDough = false; });

    // =========================================================================
    //  Q2 — BOTTOM-RIGHT — TOPPINGS
    // =========================================================================
    const P_CX = VW * 3 / 4;
    const P_CY = VH * 3 / 4 + 8;
    const P_R  = 64;

    // Pizza base: crust ring + dough
    k.add([k.circle(P_R + 8), k.color(200, 165, 105), k.anchor("center"), k.pos(P_CX, P_CY), k.z(2)]);
    k.add([k.circle(P_R),     k.color(...PAL.doughRaw), k.anchor("center"), k.pos(P_CX, P_CY), k.z(3)]);
    // Sauce layer (hidden until sauce dropped)
    const sauceLayer = k.add([k.circle(P_R - 6), k.color(...PAL.sauce), k.anchor("center"), k.pos(P_CX, P_CY), k.z(4), k.opacity(0)]);

    // Topping definitions — explicit fields, no spread into object literals
    type TDef = { name: string; col: [number, number, number]; icon: string };
    const TDEFS: TDef[] = [
      { name: "sauce",     col: PAL.sauce,     icon: "🍅" },
      { name: "cheese",    col: PAL.cheese,    icon: "🧀" },
      { name: "pepperoni", col: PAL.pepperoni, icon: "🍕" },
      { name: "mushroom",  col: PAL.mushroom,  icon: "🍄" },
      { name: "olive",     col: PAL.olive,     icon: "🫒" },
      { name: "pepper",    col: PAL.bell,      icon: "🫑" },
    ];

    const BTN_X   = VW / 2 + VW / 4 + 86;
    const BTN_Y0  = VH / 2 + 28;
    const BTN_GAP = 37;

    TDEFS.forEach((td, i) => {
      const by = BTN_Y0 + i * BTN_GAP;
      k.add([k.rect(94, 30, { radius: 7 }), k.color(...td.col), k.anchor("center"), k.pos(BTN_X, by), k.z(5), k.area()]);
      k.add([k.text(`${td.icon} ${td.name}`, { size: 11 }), k.color(...PAL.white), k.anchor("center"), k.pos(BTN_X, by), k.z(6)]);
    });

    k.add([k.text("Drag toppings onto pizza!", { size: 11 }), k.color(...PAL.gray), k.anchor("center"), k.pos(P_CX - 18, VH / 2 + 28), k.z(4)]);
    const toppingCountLbl = k.add([k.text("Toppings: 0", { size: 12 }), k.color(...PAL.black), k.anchor("center"), k.pos(P_CX - 18, VH - 22), k.z(4)]);

    // Placed topping dots (stored so we can darken on bake)
    const toppingDots: ReturnType<K["add"]>[] = [];

    let dragTopping: { name: string; col: [number, number, number]; obj: ReturnType<K["add"]> } | null = null;

    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x <= VW / 2 || mp.y <= VH / 2) return;
      for (let i = 0; i < TDEFS.length; i++) {
        const td = TDEFS[i];
        if (!td) continue;
        const by = BTN_Y0 + i * BTN_GAP;
        if (Math.abs(mp.x - BTN_X) < 50 && Math.abs(mp.y - by) < 18) {
          const obj = k.add([k.circle(11), k.color(...td.col), k.anchor("center"), k.pos(mp.x, mp.y), k.z(22)]);
          dragTopping = { name: td.name, col: td.col, obj };
          break;
        }
      }
    });

    k.onMouseRelease(() => {
      if (!dragTopping) return;
      const mp = k.mousePos();
      if (mp.dist(k.vec2(P_CX, P_CY)) < P_R + 12 && !state.toppings.includes(dragTopping.name)) {
        const td = dragTopping;
        state.toppings.push(td.name);
        toppingCountLbl.text = `Toppings: ${state.toppings.length}`;
        if (td.name === "sauce") {
          sauceLayer.opacity = 0.88;
        } else {
          const count = td.name === "cheese" ? 5 : 4;
          for (let d = 0; d < count; d++) {
            const ang = (d / count) * Math.PI * 2 + Math.random() * 0.6;
            const rr  = 8 + Math.random() * (P_R - 22);
            const dot = k.add([
              k.circle(td.name === "cheese" ? 7 : 5),
              k.color(...td.col),
              k.anchor("center"),
              k.pos(P_CX + Math.cos(ang) * rr, P_CY + Math.sin(ang) * rr),
              k.z(5),
            ]);
            toppingDots.push(dot);
          }
        }
      }
      k.destroy(dragTopping.obj);
      dragTopping = null;
    });

    k.onUpdate(() => {
      if (dragTopping) dragTopping.obj.pos = k.mousePos();
    });

    // =========================================================================
    //  Q3 — TOP-RIGHT — OVEN
    // =========================================================================
    const OV_CX = VW * 3 / 4;
    const OV_CY = VH / 4 + 8;

    // Oven body
    k.add([k.rect(200, 148, { radius: 12 }), k.color(...PAL.ovenMetal), k.anchor("center"), k.pos(OV_CX, OV_CY), k.z(2)]);
    // Glass window
    k.add([k.rect(130, 90, { radius: 8 }),  k.color(...PAL.ovenGlass), k.anchor("center"), k.pos(OV_CX, OV_CY - 8), k.z(3)]);
    k.add([k.rect(118, 78, { radius: 6 }),  k.color(50, 28, 14),       k.anchor("center"), k.pos(OV_CX, OV_CY - 8), k.z(4)]);
    // Door handle
    k.add([k.rect(80, 10, { radius: 5 }),   k.color(160, 160, 160),    k.anchor("center"), k.pos(OV_CX, OV_CY + 58), k.z(4)]);
    // Knobs
    k.add([k.circle(11), k.color(160, 160, 160), k.anchor("center"), k.pos(OV_CX - 78, OV_CY + 58), k.z(4)]);
    k.add([k.circle(11), k.color(160, 160, 160), k.anchor("center"), k.pos(OV_CX + 78, OV_CY + 58), k.z(4)]);
    k.add([k.circle(7),  k.color(255, 80, 20),   k.anchor("center"), k.pos(OV_CX - 78, OV_CY + 58), k.z(5)]);
    k.add([k.circle(7),  k.color(255, 80, 20),   k.anchor("center"), k.pos(OV_CX + 78, OV_CY + 58), k.z(5)]);
    // Rack
    k.add([k.rect(118, 4), k.color(100, 80, 60), k.anchor("center"), k.pos(OV_CX, OV_CY + 2), k.z(5)]);
    k.add([k.rect(4, 72),  k.color(100, 80, 60), k.anchor("center"), k.pos(OV_CX - 44, OV_CY - 32), k.z(5)]);
    k.add([k.rect(4, 72),  k.color(100, 80, 60), k.anchor("center"), k.pos(OV_CX + 44, OV_CY - 32), k.z(5)]);

    // Flames (hidden until baking)
    const flameXs = [-28, -10, 8, 26];
    const flames: ReturnType<K["add"]>[] = [];
    for (const fx of flameXs) {
      flames.push(k.add([k.rect(10, 18, { radius: 5 }), k.color(...PAL.fire1), k.anchor("center"), k.pos(OV_CX + fx, OV_CY + 14), k.z(6), k.opacity(0)]));
      flames.push(k.add([k.rect(7,  12, { radius: 4 }), k.color(...PAL.fire2), k.anchor("center"), k.pos(OV_CX + fx, OV_CY + 16), k.z(7), k.opacity(0)]));
    }

    // Pizza inside oven
    const ovenPizza = k.add([k.circle(30), k.color(...PAL.doughRaw), k.anchor("center"), k.pos(OV_CX, OV_CY - 18), k.z(8), k.opacity(0)]);
    const ovenGlow  = k.add([k.rect(118, 78, { radius: 6 }), k.color(255, 100, 20), k.anchor("center"), k.pos(OV_CX, OV_CY - 8), k.z(4), k.opacity(0)]);

    // Bake progress bar
    k.add([k.rect(150, 16, { radius: 8 }), k.color(40, 26, 14), k.anchor("center"), k.pos(OV_CX, VH / 2 - 18), k.z(4)]);
    const bakeBar = k.add([k.rect(1, 12, { radius: 6 }), k.color(...PAL.fire1), k.pos(OV_CX - 75, VH / 2 - 24), k.z(5)]);
    const bakeLbl = k.add([k.text("Click oven to bake!", { size: 11 }), k.color(255, 180, 80), k.anchor("center"), k.pos(OV_CX, 28), k.z(4)]);

    let ovenBaking = false;
    let bakeTimer  = 0;
    let flameT     = 0;
    const BAKE_TIME = 4.0;

    function startBaking() {
      if (state.kneadProgress < 100) {
        bakeLbl.text  = "Knead the dough first!";
        bakeLbl.color = k.rgb(255, 80, 80);
        k.wait(1.6, () => { bakeLbl.text = "Click oven to bake!"; bakeLbl.color = k.rgb(255, 180, 80); });
        return;
      }
      if (state.toppings.length < 2) {
        bakeLbl.text  = "Add at least 2 toppings!";
        bakeLbl.color = k.rgb(255, 80, 80);
        k.wait(1.6, () => { bakeLbl.text = "Click oven to bake!"; bakeLbl.color = k.rgb(255, 180, 80); });
        return;
      }
      ovenBaking = true;
      bakeTimer  = 0;
      ovenPizza.opacity = 0.95;
      ovenGlow.opacity  = 0.18;
      flames.forEach((f) => { f.opacity = 1; });
      bakeLbl.text  = "Baking... 🔥";
      bakeLbl.color = k.rgb(255, 180, 80);
    }

    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x <= VW / 2 || mp.y >= VH / 2) return;
      if (!ovenBaking && !state.baked && mp.dist(k.vec2(OV_CX, OV_CY)) < 100) startBaking();
    });

    k.onUpdate(() => {
      if (ovenBaking && !state.baked) {
        bakeTimer += k.dt();
        flameT    += k.dt() * 7;
        flames.forEach((f, i) => {
          const baseY = i % 2 === 0 ? OV_CY + 14 : OV_CY + 16;
          f.pos.y   = baseY + Math.sin(flameT + i * 0.9) * 5;
          f.opacity = 0.7 + 0.3 * Math.abs(Math.sin(flameT + i * 0.7));
        });
        ovenGlow.opacity = 0.12 + 0.1 * Math.abs(Math.sin(flameT * 0.5));
        bakeBar.width    = Math.max(1, Math.min(150, (bakeTimer / BAKE_TIME) * 150));
        const t = Math.min(1, bakeTimer / BAKE_TIME);
        ovenPizza.color = k.rgb(
          Math.round(PAL.doughRaw[0] + t * (PAL.doughBaked[0] - PAL.doughRaw[0])),
          Math.round(PAL.doughRaw[1] + t * (PAL.doughBaked[1] - PAL.doughRaw[1])),
          Math.round(PAL.doughRaw[2] + t * (PAL.doughBaked[2] - PAL.doughRaw[2])),
        );
        if (bakeTimer >= BAKE_TIME) {
          state.baked = true;
          ovenBaking  = false;
          flames.forEach((f) => { f.opacity = 0; });
          ovenGlow.opacity = 0;
          bakeLbl.text  = "Done! ✓  Now pack it →";
          bakeLbl.color = k.rgb(...PAL.green);
          // Darken topping dots slightly to show baked
          toppingDots.forEach((dot) => {
            dot.color = k.rgb(
              Math.max(0, dot.color.r - 20),
              Math.max(0, dot.color.g - 20),
              Math.max(0, dot.color.b - 10),
            );
          });
        }
      }
    });

    // =========================================================================
    //  Q4 — TOP-LEFT — PACKING
    // =========================================================================
    const BX_CX = VW / 4;
    const BX_CY = VH / 4 + 8;

    // Box body
    k.add([k.rect(170, 120, { radius: 6 }), k.color(...PAL.boxCard), k.anchor("center"), k.pos(BX_CX, BX_CY + 10), k.z(2)]);
    k.add([k.rect(154, 104, { radius: 4 }), k.color(225, 185, 115), k.anchor("center"), k.pos(BX_CX, BX_CY + 10), k.z(3)]);
    k.add([k.text("PIZZA", { size: 14 }), k.color(200, 148, 60), k.anchor("center"), k.pos(BX_CX, BX_CY + 10), k.z(4)]);

    // Lid (starts open / faint)
    const boxLid = k.add([k.rect(174, 28, { radius: 8 }), k.color(...PAL.boxLid), k.anchor("center"), k.pos(BX_CX, BX_CY - 50), k.z(7), k.opacity(0.3)]);

    // Pizza inside box (hidden until packed)
    const packedBase  = k.add([k.circle(54), k.color(...PAL.doughBaked), k.anchor("center"), k.pos(BX_CX, BX_CY + 10), k.z(5), k.opacity(0)]);
    const packedSauce = k.add([k.circle(46), k.color(...PAL.sauce),      k.anchor("center"), k.pos(BX_CX, BX_CY + 10), k.z(6), k.opacity(0)]);

    // A few decorative topping dots on the packed pizza
    const dotCols: [number, number, number][] = [PAL.cheese, PAL.pepperoni, PAL.mushroom, PAL.olive, PAL.bell];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const rr  = 12 + Math.random() * 24;
      const col = dotCols[i % dotCols.length] ?? PAL.cheese;
      k.add([
        k.circle(5),
        k.color(...col),
        k.anchor("center"),
        k.pos(BX_CX + Math.cos(ang) * rr, BX_CY + 10 + Math.sin(ang) * rr),
        k.z(7),
        k.opacity(0),
        "packedDot",
      ]);
    }

    // Pack button
    k.add([k.rect(148, 40, { radius: 10 }), k.color(...PAL.blue), k.anchor("center"), k.pos(BX_CX, VH / 2 - 22), k.z(5), k.area()]);
    k.add([k.text("📦  Pack Pizza!", { size: 13 }), k.color(...PAL.white), k.anchor("center"), k.pos(BX_CX, VH / 2 - 22), k.z(6)]);
    const packLbl = k.add([k.text("Pack when baked!", { size: 11 }), k.color(...PAL.blue), k.anchor("center"), k.pos(BX_CX, 28), k.z(4)]);

    function doPack() {
      if (!state.baked) {
        packLbl.text  = "Bake the pizza first!";
        packLbl.color = k.rgb(255, 80, 80);
        k.wait(1.6, () => { packLbl.text = "Pack when baked!"; packLbl.color = k.rgb(...PAL.blue); });
        return;
      }
      if (state.packed) return;
      state.packed = true;
      packedBase.opacity  = 1;
      packedSauce.opacity = state.toppings.includes("sauce") ? 0.9 : 0;
      // Reveal topping dots
      k.get("packedDot").forEach((d) => { d.opacity = 1; });
      boxLid.opacity = 1;
      packLbl.text   = "Pizza packed! ✓";
      packLbl.color  = k.rgb(...PAL.green);
      const pts = 100 + state.toppings.length * 25;
      state.score += pts;
      onScore(state.score);
      k.wait(2.0, () => k.go("celebrate", state.score));
    }

    k.onMousePress(() => {
      const mp = k.mousePos();
      if (mp.x >= VW / 2 || mp.y >= VH / 2) return;
      if (mp.dist(k.vec2(BX_CX, VH / 2 - 22)) < 88) doPack();
    });

    // Touch: pack + oven
    k.onTouchStart((_touch, e) => {
      const te = e as TouchEvent;
      const t0 = te.touches[0];
      if (!t0) return;
      const rect = (k as unknown as { canvas: HTMLCanvasElement }).canvas.getBoundingClientRect();
      const tx   = (t0.clientX - rect.left) * (VW / rect.width);
      const ty   = (t0.clientY - rect.top)  * (VH / rect.height);
      if (tx < VW / 2 && ty < VH / 2 && Math.hypot(tx - BX_CX, ty - (VH / 2 - 22)) < 88) doPack();
      if (tx > VW / 2 && ty < VH / 2 && !ovenBaking && !state.baked && Math.hypot(tx - OV_CX, ty - OV_CY) < 100) startBaking();
    });

    // Flow arrows on dividers
    k.add([k.text("↓ knead", { size: 10 }), k.color(...PAL.gray),   k.anchor("center"), k.pos(VW / 4,     VH / 2 - 8), k.z(12)]);
    k.add([k.text("↓ top",   { size: 10 }), k.color(...PAL.gray),   k.anchor("center"), k.pos(VW * 3 / 4, VH / 2 - 8), k.z(12)]);
    k.add([k.text("→ bake",  { size: 10 }), k.color(200, 140, 60),  k.anchor("center"), k.pos(VW / 2 + 6,  VH / 4),     k.z(12)]);
    k.add([k.text("← pack",  { size: 10 }), k.color(...PAL.blue),   k.anchor("center"), k.pos(VW / 2 - 6,  VH / 4),     k.z(12)]);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SCENE: celebrate
// ─────────────────────────────────────────────────────────────────────────────
function buildCelebrateScene(k: K) {
  k.scene("celebrate", (finalScore: number) => {
    k.add([k.rect(VW, VH), k.color(245, 235, 215), k.pos(0, 0), k.z(0)]);

    // Confetti
    const confCols: [number, number, number][] = [PAL.orange, PAL.green, PAL.blue, PAL.cheese, PAL.sauce, PAL.bell];
    for (let i = 0; i < 44; i++) {
      const col = confCols[i % confCols.length] ?? PAL.orange;
      k.add([
        k.circle(4 + Math.random() * 6),
        k.color(...col),
        k.anchor("center"),
        k.pos(Math.random() * VW, Math.random() * VH),
        k.z(1),
      ]);
    }

    k.add([k.text("🍕  Pizza Delivered!", { size: 38 }), k.color(...PAL.orange), k.anchor("center"), k.pos(VW / 2, VH / 2 - 100), k.z(2)]);
    k.add([k.text(`Score: ${finalScore}`,  { size: 34 }), k.color(...PAL.green),  k.anchor("center"), k.pos(VW / 2, VH / 2 - 32),  k.z(2)]);

    const toppingStr = state.toppings.length > 0 ? state.toppings.join(", ") : "plain";
    k.add([k.text(`Toppings: ${toppingStr}`, { size: 15 }), k.color(90, 80, 70), k.anchor("center"), k.pos(VW / 2, VH / 2 + 22), k.z(2)]);

    const saved = parseInt(localStorage.getItem("goodpizza_hs") ?? "0", 10);
    const best  = Math.max(finalScore, saved);
    if (finalScore >= saved) localStorage.setItem("goodpizza_hs", String(finalScore));
    k.add([k.text(`Best: ${best}`,                      { size: 16 }), k.color(185, 138, 48), k.anchor("center"), k.pos(VW / 2, VH / 2 + 60),  k.z(2)]);
    k.add([k.text("Tap / click for another pizza!", { size: 18 }), k.color(...PAL.blue),   k.anchor("center"), k.pos(VW / 2, VH / 2 + 108), k.z(2)]);

    k.onMousePress(() => k.go("play"));
    k.onKeyPress("space", () => k.go("play"));
    k.onTouchStart(() => k.go("play"));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
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
  buildCelebrateScene(k);
  k.go("play");

  return () => k.quit();
}
