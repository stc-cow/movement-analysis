import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import PptxGenJS from "pptxgenjs";

const OUTPUT_DIR = path.resolve("public/presentations");
const PPTX_FILE = path.join(
  OUTPUT_DIR,
  "AI-Movement-Analysis-Prediction-Platform.pptx",
);
const PDF_FILE = path.join(
  OUTPUT_DIR,
  "AI-Movement-Analysis-Prediction-Platform.pdf",
);

const W = 13.333;
const H = 7.5;
const SCALE = 72;

const COLORS = {
  navy: "0B1020",
  slate: "111827",
  ink: "0F172A",
  white: "FFFFFF",
  bg: "F8FAFC",
  card: "FFFFFF",
  line: "D9E2EC",
  muted: "64748B",
  text: "0F172A",
  purple: "7C3AED",
  purple2: "A855F7",
  cyan: "22D3EE",
  blue: "3B82F6",
  teal: "14B8A6",
  green: "10B981",
  amber: "F59E0B",
  red: "EF4444",
  rose: "FB7185",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function u(value) {
  return value;
}

function pt(value) {
  return value * SCALE;
}

function withAlpha(hex, alpha) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b, alpha };
}

function rgbaString(hex, alpha) {
  return { color: hex.replace("#", ""), transparency: Math.max(0, Math.min(100, 100 - alpha * 100)) };
}

function makePptCanvas(slide, pptx) {
  return {
    rect(x, y, w, h, opts = {}) {
      slide.addShape(pptx.ShapeType.rect, {
        x: u(x),
        y: u(y),
        w: u(w),
        h: u(h),
        fill: opts.fill ? rgbaString(opts.fill, opts.opacity ?? 1) : { color: COLORS.white },
        line: opts.line
          ? { color: opts.line, pt: opts.lineWidth ?? 1, transparency: 0 }
          : { color: opts.fill || COLORS.white, transparency: 100, pt: 0 },
      });
    },
    roundRect(x, y, w, h, opts = {}) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: u(x),
        y: u(y),
        w: u(w),
        h: u(h),
        rectRadius: opts.radius ?? 0.08,
        fill: opts.fill ? rgbaString(opts.fill, opts.opacity ?? 1) : { color: COLORS.white },
        line: opts.line
          ? { color: opts.line, pt: opts.lineWidth ?? 1 }
          : { color: opts.fill || COLORS.white, transparency: 100, pt: 0 },
      });
    },
    ellipse(x, y, w, h, opts = {}) {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: u(x),
        y: u(y),
        w: u(w),
        h: u(h),
        fill: opts.fill ? rgbaString(opts.fill, opts.opacity ?? 1) : { color: COLORS.white },
        line: opts.line
          ? { color: opts.line, pt: opts.lineWidth ?? 1 }
          : { color: opts.fill || COLORS.white, transparency: 100, pt: 0 },
      });
    },
    line(x1, y1, x2, y2, opts = {}) {
      slide.addShape(pptx.ShapeType.line, {
        x: u(x1),
        y: u(y1),
        w: u(x2 - x1),
        h: u(y2 - y1),
        line: {
          color: (opts.color || COLORS.line).replace("#", ""),
          pt: opts.width ?? 1.5,
          dash: opts.dash,
          transparency: opts.opacity ? Math.round((1 - opts.opacity) * 100) : 0,
          beginArrowType: opts.beginArrowType,
          endArrowType: opts.endArrowType,
        },
      });
    },
    text(text, x, y, w, h, opts = {}) {
      slide.addText(text, {
        x: u(x),
        y: u(y),
        w: u(w),
        h: u(h),
        margin: opts.margin ?? 0,
        fontFace: opts.fontFace || "Arial",
        fontSize: opts.fontSize || 12,
        bold: !!opts.bold,
        italic: !!opts.italic,
        color: (opts.color || COLORS.text).replace("#", ""),
        align: opts.align || "left",
        valign: opts.valign || "mid",
        fit: opts.fit || "shrink",
        breakLine: opts.breakLine,
        transparency: opts.opacity ? Math.round((1 - opts.opacity) * 100) : 0,
      });
    },
    addPageNumber(n, dark = false) {
      const bg = dark ? "FFFFFF" : COLORS.purple;
      const fg = dark ? COLORS.purple : "FFFFFF";
      this.ellipse(12.55, 6.78, 0.45, 0.45, { fill: bg, line: bg });
      this.text(String(n), 12.55, 6.86, 0.45, 0.18, {
        fontSize: 11,
        bold: true,
        color: fg,
        align: "center",
      });
    },
  };
}

function makePdfCanvas(doc) {
  return {
    rect(x, y, w, h, opts = {}) {
      doc.save();
      if (opts.fill) {
        doc.fillColor(opts.fill).fillOpacity(opts.opacity ?? 1).rect(pt(x), pt(y), pt(w), pt(h)).fill();
      }
      if (opts.line) {
        doc.fillOpacity(1).lineWidth(opts.lineWidth ?? 1).strokeColor(opts.line).rect(pt(x), pt(y), pt(w), pt(h)).stroke();
      }
      doc.restore();
    },
    roundRect(x, y, w, h, opts = {}) {
      doc.save();
      const r = pt(opts.radius ?? 0.08);
      if (opts.fill) {
        doc.fillColor(opts.fill).fillOpacity(opts.opacity ?? 1).roundedRect(pt(x), pt(y), pt(w), pt(h), r).fill();
      }
      if (opts.line) {
        doc.fillOpacity(1).lineWidth(opts.lineWidth ?? 1).strokeColor(opts.line).roundedRect(pt(x), pt(y), pt(w), pt(h), r).stroke();
      }
      doc.restore();
    },
    ellipse(x, y, w, h, opts = {}) {
      doc.save();
      const cx = pt(x + w / 2);
      const cy = pt(y + h / 2);
      if (opts.fill) {
        doc.fillColor(opts.fill).fillOpacity(opts.opacity ?? 1).ellipse(cx, cy, pt(w / 2), pt(h / 2)).fill();
      }
      if (opts.line) {
        doc.fillOpacity(1).lineWidth(opts.lineWidth ?? 1).strokeColor(opts.line).ellipse(cx, cy, pt(w / 2), pt(h / 2)).stroke();
      }
      doc.restore();
    },
    line(x1, y1, x2, y2, opts = {}) {
      doc.save();
      doc.lineWidth(opts.width ?? 1.5).strokeColor(opts.color || COLORS.line);
      if (opts.dash) {
        doc.dash(4, { space: 3 });
      } else {
        doc.undash();
      }
      doc.opacity(opts.opacity ?? 1);
      doc.moveTo(pt(x1), pt(y1)).lineTo(pt(x2), pt(y2)).stroke();

      if (opts.endArrowType) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const size = 0.12;
        const a1 = angle + Math.PI - 0.45;
        const a2 = angle + Math.PI + 0.45;
        const ax = x2;
        const ay = y2;
        doc.fillColor(opts.color || COLORS.line).opacity(opts.opacity ?? 1);
        doc.moveTo(pt(ax), pt(ay))
          .lineTo(pt(ax + Math.cos(a1) * size), pt(ay + Math.sin(a1) * size))
          .lineTo(pt(ax + Math.cos(a2) * size), pt(ay + Math.sin(a2) * size))
          .closePath()
          .fill();
      }
      doc.restore();
    },
    text(text, x, y, w, h, opts = {}) {
      doc.save();
      doc.fillColor(opts.color || COLORS.text).opacity(opts.opacity ?? 1);
      doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica");
      doc.fontSize(opts.fontSize || 12);
      const height = h ? pt(h) : undefined;
      doc.text(text, pt(x), pt(y), {
        width: pt(w),
        height,
        align: opts.align || "left",
        lineBreak: true,
        paragraphGap: opts.paragraphGap ?? 0,
      });
      doc.restore();
    },
    addPageNumber(n, dark = false) {
      const bg = dark ? COLORS.white : COLORS.purple;
      const fg = dark ? COLORS.purple : COLORS.white;
      this.ellipse(12.55, 6.78, 0.45, 0.45, { fill: bg, line: bg });
      this.text(String(n), 12.55, 6.86, 0.45, 0.18, {
        fontSize: 11,
        bold: true,
        color: fg,
        align: "center",
      });
    },
  };
}

function drawTopBar(canvas, dark = false) {
  canvas.rect(0, 0, W, 0.36, { fill: dark ? COLORS.purple : COLORS.purple, line: COLORS.purple });
  if (dark) {
    canvas.rect(0, 0.36, W, 0.04, { fill: COLORS.cyan, line: COLORS.cyan, opacity: 0.7 });
  }
}

function drawLightBackground(canvas) {
  canvas.rect(0, 0, W, H, { fill: COLORS.bg, line: COLORS.bg });
  canvas.rect(0, 0, W, 0.36, { fill: COLORS.purple, line: COLORS.purple });
  canvas.rect(0, 0.36, W, 0.04, { fill: COLORS.cyan, line: COLORS.cyan, opacity: 0.85 });
  canvas.ellipse(10.5, -1.2, 4.4, 4.4, { fill: COLORS.purple2, line: COLORS.purple2, opacity: 0.08 });
  canvas.ellipse(-1.0, 4.8, 3.3, 3.3, { fill: COLORS.cyan, line: COLORS.cyan, opacity: 0.08 });
}

function addSectionTitle(canvas, title, subtitle) {
  canvas.text(title, 0.6, 0.62, 7.2, 0.42, {
    fontSize: 24,
    bold: true,
    color: COLORS.text,
  });
  if (subtitle) {
    canvas.text(subtitle, 0.6, 1.02, 8.2, 0.3, {
      fontSize: 10.5,
      color: COLORS.muted,
    });
  }
}

function iconBadge(canvas, x, y, size, label, fill, textColor = COLORS.white) {
  canvas.ellipse(x, y, size, size, { fill, line: fill });
  canvas.text(label, x, y + size * 0.22, size, size * 0.45, {
    fontSize: size < 0.4 ? 9 : 11,
    bold: true,
    color: textColor,
    align: "center",
  });
}

function metricCard(canvas, x, y, w, h, title, value, accent) {
  canvas.roundRect(x, y, w, h, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
  canvas.rect(x, y, w, 0.08, { fill: accent, line: accent });
  canvas.text(title, x + 0.18, y + 0.16, w - 0.36, 0.28, {
    fontSize: 10,
    bold: true,
    color: COLORS.muted,
  });
  canvas.text(value, x + 0.18, y + 0.42, w - 0.36, h - 0.52, {
    fontSize: 18,
    bold: true,
    color: COLORS.text,
  });
}

function slideFooter(canvas, slideNo, dark = false) {
  const color = dark ? COLORS.white : COLORS.muted;
  canvas.text("AI Movement Analysis & Prediction Platform", 0.6, 7.0, 4.8, 0.18, {
    fontSize: 8,
    color,
  });
  canvas.addPageNumber(slideNo, dark);
}

function miniBars(canvas, x, y, w, h, values, colors) {
  const max = Math.max(...values, 1);
  const gap = 0.08;
  const barW = (w - gap * (values.length - 1)) / values.length;
  values.forEach((v, i) => {
    const bh = (v / max) * h;
    canvas.roundRect(x + i * (barW + gap), y + h - bh, barW, bh, {
      fill: colors[i % colors.length],
      line: colors[i % colors.length],
      radius: 0.03,
    });
  });
}

function miniLine(canvas, x, y, w, h, points, color, dashedTail = false) {
  const maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(...points.map((p) => p.y));
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const mapX = (px) => x + ((px - minX) / Math.max(maxX - minX, 1)) * w;
  const mapY = (py) => y + h - ((py - minY) / Math.max(maxY - minY, 1)) * h;
  for (let i = 0; i < points.length - 1; i++) {
    canvas.line(mapX(points[i].x), mapY(points[i].y), mapX(points[i + 1].x), mapY(points[i + 1].y), {
      color,
      width: 1.6,
      dash: dashedTail && i >= points.length - 3 ? [4, 3] : undefined,
    });
  }
  points.forEach((p) => canvas.ellipse(mapX(p.x) - 0.035, mapY(p.y) - 0.035, 0.07, 0.07, { fill: color, line: color }));
}

function drawSlide1(canvas) {
  canvas.rect(0, 0, W, H, { fill: COLORS.navy, line: COLORS.navy });
  canvas.ellipse(9.7, -1.1, 4.1, 4.1, { fill: COLORS.purple2, line: COLORS.purple2, opacity: 0.22 });
  canvas.ellipse(-0.8, 4.4, 3.0, 3.0, { fill: COLORS.cyan, line: COLORS.cyan, opacity: 0.18 });
  drawTopBar(canvas, true);

  canvas.text("AI Movement Analysis & Prediction Platform", 0.75, 0.95, 5.9, 0.85, {
    fontSize: 28,
    bold: true,
    color: COLORS.white,
  });
  canvas.text(
    "Optimizing telecom field operations through movement intelligence",
    0.78,
    1.98,
    5.8,
    0.45,
    { fontSize: 13, color: "E2E8F0" },
  );

  const chipY = 2.62;
  const chips = [
    ["Movement Intelligence", COLORS.purple],
    ["Field Operations", COLORS.cyan],
    ["AI Forecasting", COLORS.teal],
  ];
  chips.forEach((chip, i) => {
    const x = 0.8 + i * 1.95;
    canvas.roundRect(x, chipY, 1.72, 0.45, { fill: chip[1], line: chip[1] });
    canvas.text(chip[0], x + 0.08, chipY + 0.12, 1.56, 0.18, {
      fontSize: 9.5,
      bold: true,
      color: COLORS.white,
      align: "center",
    });
  });

  // Right-side conceptual network
  canvas.roundRect(7.6, 0.82, 5.0, 5.55, { fill: "15213A", line: "294061", lineWidth: 1 });
  canvas.text("Operational signal flow", 8.0, 1.0, 3.0, 0.2, {
    fontSize: 11,
    bold: true,
    color: "E2E8F0",
  });

  // Tower
  canvas.line(10.9, 2.0, 10.3, 4.9, { color: COLORS.cyan, width: 2.2 });
  canvas.line(10.9, 2.0, 11.5, 4.9, { color: COLORS.cyan, width: 2.2 });
  canvas.line(10.65, 2.7, 11.15, 2.7, { color: COLORS.cyan, width: 1.6 });
  canvas.line(10.52, 3.3, 11.28, 3.3, { color: COLORS.cyan, width: 1.6 });
  canvas.line(10.37, 4.0, 11.43, 4.0, { color: COLORS.cyan, width: 1.6 });
  canvas.ellipse(10.82, 1.72, 0.16, 0.16, { fill: COLORS.amber, line: COLORS.amber });

  // Core chip
  canvas.roundRect(8.6, 3.1, 1.55, 0.9, { fill: COLORS.purple, line: COLORS.purple });
  canvas.text("AI Core", 8.95, 3.36, 0.85, 0.18, { fontSize: 14, bold: true, color: COLORS.white, align: "center" });
  canvas.text("predict • optimize • alert", 8.7, 3.68, 1.3, 0.16, { fontSize: 8, color: "EDE9FE", align: "center" });

  const nodes = [
    { x: 7.95, y: 2.1, label: "Sites", fill: COLORS.blue },
    { x: 11.35, y: 2.2, label: "Alarms", fill: COLORS.rose },
    { x: 7.95, y: 4.45, label: "GPS", fill: COLORS.teal },
    { x: 11.35, y: 4.45, label: "Reports", fill: COLORS.amber },
  ];
  nodes.forEach((n) => {
    canvas.roundRect(n.x, n.y, 1.0, 0.52, { fill: "20314F", line: "33507A", lineWidth: 1 });
    iconBadge(canvas, n.x + 0.06, n.y + 0.09, 0.34, n.label.slice(0, 2).toUpperCase(), n.fill);
    canvas.text(n.label, n.x + 0.44, n.y + 0.16, 0.48, 0.12, { fontSize: 9, bold: true, color: COLORS.white });
  });

  canvas.line(8.95, 2.62, 9.4, 3.1, { color: COLORS.cyan, width: 1.3, endArrowType: "triangle" });
  canvas.line(11.0, 2.62, 10.9, 3.1, { color: COLORS.rose, width: 1.3, endArrowType: "triangle" });
  canvas.line(8.95, 4.45, 9.4, 4.0, { color: COLORS.teal, width: 1.3, endArrowType: "triangle" });
  canvas.line(11.0, 4.45, 10.9, 4.0, { color: COLORS.amber, width: 1.3, endArrowType: "triangle" });

  // Mini output card
  canvas.roundRect(8.02, 5.25, 4.2, 0.82, { fill: "0F172A", line: "334155", lineWidth: 1 });
  canvas.text("Operational insight: dispatch the right team, to the right site, at the right time", 8.2, 5.52, 3.8, 0.18, {
    fontSize: 10,
    bold: true,
    color: COLORS.white,
    align: "center",
  });

  slideFooter(canvas, 1, true);
}

function drawSlide2(canvas) {
  drawLightBackground(canvas);
  addSectionTitle(canvas, "Operational Challenge", "Why telecom field teams need movement intelligence");

  canvas.ellipse(5.2, 2.1, 2.95, 2.95, { fill: COLORS.white, line: COLORS.line, lineWidth: 1 });
  canvas.text("Reactive\noperations", 5.86, 2.76, 1.6, 0.5, {
    fontSize: 16,
    bold: true,
    color: COLORS.red,
    align: "center",
  });
  canvas.text("limited visibility\nslow response\nweak planning", 5.7, 3.36, 1.95, 0.55, {
    fontSize: 9.5,
    color: COLORS.muted,
    align: "center",
  });
  canvas.line(4.8, 2.48, 8.05, 2.48, { color: COLORS.line, width: 1.2, dash: [3, 3] });
  canvas.line(4.8, 4.68, 8.05, 4.68, { color: COLORS.line, width: 1.2, dash: [3, 3] });

  const cards = [
    [0.7, 1.65, COLORS.red, "Visibility gaps", "Movement and asset status is scattered across tools."],
    [9.0, 1.65, COLORS.amber, "Dispatch inefficiency", "Teams are sent without a clear movement pattern."],
    [0.7, 4.5, COLORS.rose, "Slow incident response", "Field teams reach sites later than needed."],
    [9.0, 4.5, COLORS.purple, "No prediction layer", "There is no forward view of future movement demand."],
  ];
  cards.forEach((c, i) => {
    const [x, y, accent, title, body] = c;
    canvas.roundRect(x, y, 3.0, 1.55, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
    canvas.rect(x, y, 3.0, 0.08, { fill: accent, line: accent });
    iconBadge(canvas, x + 0.18, y + 0.22, 0.42, String(i + 1), accent);
    canvas.text(title, x + 0.72, y + 0.22, 2.0, 0.24, { fontSize: 11, bold: true, color: COLORS.text });
    canvas.text(body, x + 0.18, y + 0.72, 2.55, 0.48, { fontSize: 9.5, color: COLORS.muted });
  });

  // Tiny broken route at bottom
  canvas.line(3.65, 3.2, 5.0, 2.7, { color: COLORS.rose, width: 1.4, dash: [5, 4] });
  canvas.line(7.45, 2.7, 8.65, 3.2, { color: COLORS.rose, width: 1.4, dash: [5, 4] });
  canvas.line(3.65, 4.45, 5.0, 4.95, { color: COLORS.amber, width: 1.4, dash: [5, 4] });
  canvas.line(7.45, 4.95, 8.65, 4.45, { color: COLORS.amber, width: 1.4, dash: [5, 4] });

  slideFooter(canvas, 2);
}

function drawSlide3(canvas) {
  drawLightBackground(canvas);
  addSectionTitle(canvas, "Solution Overview", "From site data to operational insight in one connected flow");

  const flow = [
    [0.8, 2.4, "Site Data", "GPS + alarms + field logs", COLORS.blue],
    [3.5, 2.4, "Movement History", "Location changes over time", COLORS.teal],
    [6.2, 2.4, "AI Analysis", "Patterns, frequency, risk", COLORS.purple],
    [8.9, 2.4, "Operational Insights", "Better dispatch and planning", COLORS.green],
  ];
  flow.forEach((f) => {
    const [x, y, title, body, accent] = f;
    canvas.roundRect(x, y, 2.2, 1.45, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
    canvas.rect(x, y, 2.2, 0.08, { fill: accent, line: accent });
    iconBadge(canvas, x + 0.15, y + 0.22, 0.38, title.slice(0, 2).toUpperCase(), accent);
    canvas.text(title, x + 0.58, y + 0.2, 1.45, 0.22, { fontSize: 11, bold: true, color: COLORS.text });
    canvas.text(body, x + 0.18, y + 0.78, 1.84, 0.38, { fontSize: 9.2, color: COLORS.muted, align: "center" });
  });

  for (let i = 0; i < flow.length - 1; i++) {
    const x1 = flow[i][0] + 2.15;
    const y1 = flow[i][1] + 0.72;
    const x2 = flow[i + 1][0] - 0.08;
    const y2 = flow[i + 1][1] + 0.72;
    canvas.line(x1, y1, x2, y2, { color: COLORS.purple, width: 1.8, endArrowType: "triangle" });
  }

  canvas.roundRect(2.0, 4.55, 9.35, 1.1, { fill: "EEF2FF", line: "C7D2FE", lineWidth: 1 });
  canvas.text("Outcome", 2.25, 4.82, 1.0, 0.16, { fontSize: 11, bold: true, color: COLORS.purple });
  canvas.text(
    "Predict movement demand, reduce guesswork, and turn field activity into a measurable planning signal.",
    3.0,
    4.78,
    7.8,
    0.28,
    { fontSize: 11, color: COLORS.text, align: "center" },
  );

  slideFooter(canvas, 3);
}

function drawSlide4(canvas) {
  drawLightBackground(canvas);
  addSectionTitle(canvas, "Core Capabilities", "Four analysis layers that turn movement data into action");

  const cards = [
    [0.7, 1.6, COLORS.blue, "Historical movement analysis", "bars"],
    [6.65, 1.6, COLORS.purple, "AI-based movement prediction", "line"],
    [0.7, 4.0, COLORS.teal, "Technician deployment optimization", "route"],
    [6.65, 4.0, COLORS.amber, "Site activity monitoring", "radar"],
  ];

  cards.forEach((c) => {
    const [x, y, accent, title, kind] = c;
    canvas.roundRect(x, y, 5.85, 1.98, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
    canvas.rect(x, y, 5.85, 0.08, { fill: accent, line: accent });
    iconBadge(canvas, x + 0.18, y + 0.18, 0.38, title.slice(0, 2).toUpperCase(), accent);
    canvas.text(title, x + 0.66, y + 0.2, 4.6, 0.22, { fontSize: 11.5, bold: true, color: COLORS.text });

    if (kind === "bars") {
      miniBars(canvas, x + 0.3, y + 0.72, 1.95, 0.72, [3, 5, 4, 7, 6], [COLORS.blue, COLORS.cyan, COLORS.purple, COLORS.teal, COLORS.rose]);
      canvas.text("frequency over time", x + 0.35, y + 1.55, 1.8, 0.14, { fontSize: 8.3, color: COLORS.muted, align: "center" });
    }
    if (kind === "line") {
      miniLine(
        canvas,
        x + 0.3,
        y + 0.75,
        2.2,
        0.7,
        [
          { x: 0, y: 1 },
          { x: 1, y: 1.2 },
          { x: 2, y: 1.0 },
          { x: 3, y: 1.6 },
          { x: 4, y: 2.0 },
        ],
        COLORS.purple,
        true,
      );
      canvas.text("forecast trend", x + 0.3, y + 1.55, 1.8, 0.14, { fontSize: 8.3, color: COLORS.muted, align: "center" });
    }
    if (kind === "route") {
      canvas.line(x + 0.4, y + 1.48, x + 1.4, y + 0.98, { color: COLORS.teal, width: 1.8 });
      canvas.line(x + 1.4, y + 0.98, x + 2.2, y + 1.25, { color: COLORS.teal, width: 1.8 });
      canvas.line(x + 2.2, y + 1.25, x + 3.0, y + 0.88, { color: COLORS.teal, width: 1.8 });
      canvas.ellipse(x + 0.36, y + 1.43, 0.12, 0.12, { fill: COLORS.teal, line: COLORS.teal });
      canvas.ellipse(x + 1.35, y + 0.93, 0.12, 0.12, { fill: COLORS.blue, line: COLORS.blue });
      canvas.ellipse(x + 2.17, y + 1.2, 0.12, 0.12, { fill: COLORS.amber, line: COLORS.amber });
      canvas.ellipse(x + 2.96, y + 0.83, 0.12, 0.12, { fill: COLORS.rose, line: COLORS.rose });
      canvas.text("route balance", x + 0.3, y + 1.55, 1.8, 0.14, { fontSize: 8.3, color: COLORS.muted, align: "center" });
    }
    if (kind === "radar") {
      canvas.ellipse(x + 2.1, y + 0.67, 1.2, 1.2, { fill: "EFF6FF", line: COLORS.cyan, lineWidth: 1 });
      canvas.ellipse(x + 2.37, y + 0.94, 0.66, 0.66, { fill: "DBEAFE", line: COLORS.blue, lineWidth: 1 });
      canvas.ellipse(x + 2.56, y + 1.13, 0.28, 0.28, { fill: COLORS.amber, line: COLORS.amber });
      canvas.line(x + 1.95, y + 1.27, x + 3.52, y + 1.27, { color: COLORS.cyan, width: 1.0, dash: [3, 3] });
      canvas.line(x + 2.74, y + 0.45, x + 2.74, y + 2.0, { color: COLORS.cyan, width: 1.0, dash: [3, 3] });
      canvas.text("activity pulse", x + 0.3, y + 1.55, 1.8, 0.14, { fontSize: 8.3, color: COLORS.muted, align: "center" });
    }
    canvas.text(
      title.includes("analysis") ? "Understand what has already happened." : title.includes("prediction") ? "Estimate where movement pressure will rise." : title.includes("optimization") ? "Assign the right resources to the right site." : "Watch activity signals and respond earlier.",
      x + 2.48,
      y + 0.82,
      2.9,
      0.64,
      { fontSize: 9.4, color: COLORS.muted, align: "left" },
    );
  });

  slideFooter(canvas, 4);
}

function drawSlide5(canvas) {
  drawLightBackground(canvas);
  addSectionTitle(canvas, "Data Sources", "Multiple operational inputs are combined into one analysis layer");

  const sources = [
    [0.75, 1.8, COLORS.blue, "GPS movement logs", "location tracks"],
    [0.75, 4.2, COLORS.teal, "Maintenance visit records", "service activity"],
    [10.0, 1.8, COLORS.rose, "Site alarm history", "fault + outage signals"],
    [10.0, 4.2, COLORS.amber, "Field operation reports", "team observations"],
  ];
  sources.forEach((s) => {
    const [x, y, accent, title, sub] = s;
    canvas.roundRect(x, y, 2.55, 1.5, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
    canvas.rect(x, y, 2.55, 0.08, { fill: accent, line: accent });
    iconBadge(canvas, x + 0.16, y + 0.2, 0.4, title.slice(0, 2).toUpperCase(), accent);
    canvas.text(title, x + 0.66, y + 0.18, 1.7, 0.24, { fontSize: 10.5, bold: true, color: COLORS.text });
    canvas.text(sub, x + 0.18, y + 0.76, 2.18, 0.2, { fontSize: 9, color: COLORS.muted, align: "center" });
  });

  canvas.roundRect(4.55, 2.35, 4.2, 2.2, { fill: "EFF6FF", line: "BFDBFE", lineWidth: 1 });
  canvas.rect(4.55, 2.35, 4.2, 0.08, { fill: COLORS.purple, line: COLORS.purple });
  canvas.text("Unified data core", 5.45, 2.72, 2.4, 0.18, { fontSize: 13, bold: true, color: COLORS.purple, align: "center" });
  canvas.text("clean • align • predict", 5.55, 3.02, 2.2, 0.16, { fontSize: 10, color: COLORS.muted, align: "center" });
  iconBadge(canvas, 6.16, 3.48, 0.75, "AI", COLORS.purple);
  canvas.text("Movement intelligence", 5.35, 4.38, 2.6, 0.18, { fontSize: 10.5, bold: true, color: COLORS.text, align: "center" });

  // connectors
  canvas.line(3.3, 2.55, 4.55, 3.0, { color: COLORS.blue, width: 1.6, endArrowType: "triangle" });
  canvas.line(3.3, 4.95, 4.55, 4.1, { color: COLORS.teal, width: 1.6, endArrowType: "triangle" });
  canvas.line(10.0, 2.55, 8.75, 3.0, { color: COLORS.rose, width: 1.6, endArrowType: "triangle" });
  canvas.line(10.0, 4.95, 8.75, 4.1, { color: COLORS.amber, width: 1.6, endArrowType: "triangle" });

  canvas.text("All inputs become one operational picture for managers and field teams.", 3.5, 5.28, 6.3, 0.2, {
    fontSize: 11,
    color: COLORS.muted,
    align: "center",
  });

  slideFooter(canvas, 5);
}

function drawSlide6(canvas) {
  drawLightBackground(canvas);
  addSectionTitle(canvas, "Operational Workflow", "A simple loop from data capture to better decisions");

  const steps = [
    [0.75, 2.1, "1", "Collect", "movement + alarm data", COLORS.blue],
    [3.45, 2.1, "2", "Analyze", "find patterns and gaps", COLORS.teal],
    [6.15, 2.1, "3", "Predict", "forecast deployment needs", COLORS.purple],
    [8.85, 2.1, "4", "Decide", "act faster and with confidence", COLORS.green],
  ];

  steps.forEach((s) => {
    const [x, y, num, title, body, accent] = s;
    canvas.roundRect(x, y, 2.2, 1.9, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
    canvas.rect(x, y, 2.2, 0.08, { fill: accent, line: accent });
    iconBadge(canvas, x + 0.86, y + 0.18, 0.46, num, accent);
    canvas.text(title, x + 0.52, y + 0.74, 1.16, 0.2, { fontSize: 12, bold: true, color: COLORS.text, align: "center" });
    canvas.text(body, x + 0.15, y + 1.18, 1.9, 0.34, { fontSize: 9.2, color: COLORS.muted, align: "center" });
  });

  for (let i = 0; i < steps.length - 1; i++) {
    const x1 = steps[i][0] + 2.2;
    const y1 = steps[i][1] + 0.95;
    const x2 = steps[i + 1][0] - 0.1;
    const y2 = steps[i + 1][1] + 0.95;
    canvas.line(x1, y1, x2, y2, { color: COLORS.purple, width: 2, endArrowType: "triangle" });
  }

  // feedback loop
  canvas.line(11.1, 4.15, 11.1, 5.3, { color: COLORS.cyan, width: 1.4, dash: [4, 4] });
  canvas.line(11.1, 5.3, 1.85, 5.3, { color: COLORS.cyan, width: 1.4, dash: [4, 4], endArrowType: "triangle" });
  canvas.text("continuous learning loop", 4.9, 5.48, 3.1, 0.16, { fontSize: 9.5, color: COLORS.cyan, bold: true, align: "center" });

  slideFooter(canvas, 6);
}

function drawSlide7(canvas) {
  drawLightBackground(canvas);
  addSectionTitle(canvas, "Operational Benefits", "What telecom teams gain from movement intelligence");

  const benefits = [
    [0.8, 1.9, COLORS.blue, "Faster incident response", "↓ response time"],
    [6.55, 1.9, COLORS.teal, "Optimized technician routes", "↓ travel waste"],
    [0.8, 4.05, COLORS.purple, "Reduced operational costs", "↓ dispatch overhead"],
    [6.55, 4.05, COLORS.amber, "Improved resource planning", "↑ forecast accuracy"],
  ];

  benefits.forEach((b) => {
    const [x, y, accent, title, metric] = b;
    canvas.roundRect(x, y, 5.85, 1.8, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
    canvas.rect(x, y, 5.85, 0.08, { fill: accent, line: accent });
    iconBadge(canvas, x + 0.2, y + 0.24, 0.5, "KPI", accent);
    canvas.text(title, x + 0.84, y + 0.23, 2.6, 0.22, { fontSize: 11.5, bold: true, color: COLORS.text });
    canvas.roundRect(x + 3.75, y + 0.35, 1.68, 0.9, { fill: "F8FAFC", line: "CBD5E1", lineWidth: 1 });
    canvas.text(metric, x + 3.92, y + 0.62, 1.32, 0.18, { fontSize: 11, bold: true, color: accent, align: "center" });
    canvas.text(
      title.includes("response")
        ? "teams arrive earlier"
        : title.includes("routes")
          ? "less driving, more site time"
          : title.includes("costs")
            ? "lower waste across dispatch"
            : "better coverage planning",
      x + 0.84,
      y + 0.78,
      2.5,
      0.34,
      { fontSize: 9.3, color: COLORS.muted },
    );

    // small arrow / trend
    canvas.line(x + 0.35, y + 1.42, x + 1.45, y + 1.15, { color: accent, width: 1.4 });
    canvas.line(x + 1.45, y + 1.15, x + 2.1, y + 1.28, { color: accent, width: 1.4 });
    canvas.line(x + 2.1, y + 1.28, x + 2.82, y + 1.02, { color: accent, width: 1.4 });
    canvas.line(x + 2.82, y + 1.02, x + 3.35, y + 1.05, { color: accent, width: 1.4, dash: [3, 3] });
  });

  slideFooter(canvas, 7);
}

function drawSlide8(canvas) {
  drawLightBackground(canvas);
  addSectionTitle(canvas, "Future Potential", "Where the platform can grow next");

  canvas.line(1.0, 4.8, 12.0, 2.0, { color: COLORS.purple, width: 2.2, dash: [2, 3] });
  canvas.ellipse(1.0, 4.62, 0.18, 0.18, { fill: COLORS.blue, line: COLORS.blue });
  canvas.ellipse(5.2, 3.4, 0.18, 0.18, { fill: COLORS.teal, line: COLORS.teal });
  canvas.ellipse(8.8, 2.55, 0.18, 0.18, { fill: COLORS.purple, line: COLORS.purple });
  canvas.ellipse(12.0, 1.95, 0.18, 0.18, { fill: COLORS.green, line: COLORS.green });

  const nodes = [
    [1.0, 4.85, COLORS.blue, "Predictive dispatch automation", "auto-assign teams when demand rises"],
    [4.55, 3.55, COLORS.teal, "Monitoring system integration", "connect alarms, tickets, and movement"],
    [8.05, 2.72, COLORS.purple, "Smart planning dashboards", "one view for operations leaders"],
  ];
  nodes.forEach((n) => {
    const [x, y, accent, title, body] = n;
    canvas.roundRect(x, y, 3.3, 1.1, { fill: COLORS.card, line: COLORS.line, lineWidth: 1 });
    canvas.rect(x, y, 3.3, 0.08, { fill: accent, line: accent });
    iconBadge(canvas, x + 0.16, y + 0.19, 0.38, "AI", accent);
    canvas.text(title, x + 0.62, y + 0.18, 2.3, 0.22, { fontSize: 10.5, bold: true, color: COLORS.text });
    canvas.text(body, x + 0.18, y + 0.62, 2.9, 0.24, { fontSize: 9, color: COLORS.muted, align: "center" });
  });

  canvas.roundRect(9.35, 4.95, 2.8, 1.35, { fill: "EEF2FF", line: "C7D2FE", lineWidth: 1 });
  canvas.text("Future impact", 9.72, 5.18, 1.8, 0.18, { fontSize: 11, bold: true, color: COLORS.purple, align: "center" });
  canvas.text("from insight to semi-autonomous operations", 9.55, 5.55, 2.25, 0.34, {
    fontSize: 9.3,
    color: COLORS.muted,
    align: "center",
  });

  slideFooter(canvas, 8);
}

function buildPptx() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Builder.io";
  pptx.company = "Builder.io";
  pptx.subject = "AI Movement Analysis & Prediction Platform";
  pptx.title = "AI Movement Analysis & Prediction Platform";
  pptx.lang = "en-US";

  const slides = [drawSlide1, drawSlide2, drawSlide3, drawSlide4, drawSlide5, drawSlide6, drawSlide7, drawSlide8];
  slides.forEach((draw, index) => {
    const slide = pptx.addSlide();
    const canvas = makePptCanvas(slide, pptx);
    draw(canvas, index + 1);
  });

  return pptx.writeFile({ fileName: PPTX_FILE });
}

function buildPdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [pt(W), pt(H)], margin: 0, autoFirstPage: false });
    const stream = fs.createWriteStream(PDF_FILE);
    doc.pipe(stream);

    const slides = [drawSlide1, drawSlide2, drawSlide3, drawSlide4, drawSlide5, drawSlide6, drawSlide7, drawSlide8];
    slides.forEach((draw, index) => {
      doc.addPage({ size: [pt(W), pt(H)], margin: 0 });
      const canvas = makePdfCanvas(doc);
      draw(canvas, index + 1);
    });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  ensureDir(OUTPUT_DIR);
  await buildPptx();
  await buildPdf();
  console.log(`✅ Deck created:\n- ${PPTX_FILE}\n- ${PDF_FILE}`);
}

main().catch((error) => {
  console.error("Failed to generate presentation deck:", error);
  process.exit(1);
});
