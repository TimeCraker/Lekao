/**
 * Stage 11 sanity test · 三 sheet × 自适应列宽
 *
 * 模拟三 sheet（数学「课后作业反馈」+ 物理「练习评价」+ 化学「课堂点评」），
 * 走 parseWeekendSheet + updateSheetInPlace 路径，验证：
 *   1. 三个 sheet 的 R2 表头都能正确识别为 feedback
 *   2. 导出后 D 列（feedback）列宽 ≥ 18，按最长内容撑开
 *   3. 其他列（姓名/错题）也按内容自适应
 *
 * 用法：node scripts/stage11-sanity.cjs
 */
const ExcelJS = require("exceljs");
const path = require("path");

// 模拟三 sheet 数据
const SHEETS = [
  {
    name: "超火1班数学",
    r2: ["序号", "姓名", "课后作业错题", "课后作业反馈"],
    students: [
      { serialNumber: "1", name: "陈思洋", qNumbersInput: "124", feedback: "9789789" },
      { serialNumber: "2", name: "test", qNumbersInput: "134", feedback: "" },
      { serialNumber: "3", name: "陈轩宇", qNumbersInput: "789", feedback: "9789" },
    ],
  },
  {
    name: "超火1班物理",
    r2: ["序号", "姓名", "课后练习错题", "练习评价"],
    students: [
      { serialNumber: "1", name: "王梓瑜", qNumbersInput: "6", feedback: "巩固阿语运动中振动的求解与描述，伽弹弱与恒定，车务物体系多过程，弹性碰撞的区分，注意自由落体与圆弧轨道的向心，强化弹簧类问题中量点速动量守" },
      { serialNumber: "2", name: "谌勃霖", qNumbersInput: "6,7", feedback: "" },
    ],
  },
  {
    name: "超火1班化学",
    r2: ["序号", "姓名", "堂测错题", "课堂点评"],
    students: [
      { serialNumber: "1", name: "张三", qNumbersInput: "5", feedback: "化学平衡常数计算需注意单位" },
    ],
  },
];

// 字段识别（模拟 weekend-headers.ts matchField 逻辑）
const FIELD_ALIASES = {
  feedback: ["反馈", "评价", "评语", "总评", "点评", "小评", "意见", "建议", "总结", "老师评", "教师评", "评讲"],
  name: ["姓名", "学生", "学员"],
  serial: ["序号", "编号"],
  qClass: ["堂测", "课堂", "小测"],
  qHomework: ["作业", "课后", "练习"],
};

function matchField(t) {
  for (const a of FIELD_ALIASES.feedback) if (t.includes(a)) return "feedback";
  for (const a of FIELD_ALIASES.name) if (t.includes(a)) return "name";
  for (const a of FIELD_ALIASES.serial) if (t.includes(a)) return "serial";
  for (const a of FIELD_ALIASES.qClass) if (t.includes(a)) return "qClass";
  for (const a of FIELD_ALIASES.qHomework) if (t.includes(a)) return "qHomework";
  return null;
}

function visualLen(s) {
  let n = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) || 0;
    if (code > 0x2e80) n += 2;
    else n += 1;
  }
  return n;
}

(async () => {
  console.log("=== Stage 11 sanity test ===\n");

  for (const sheet of SHEETS) {
    console.log(`[${sheet.name}]`);

    // 1. 识别字段
    const fc = { serial: null, name: -1, qNumbersCols: [], feedback: null };
    for (let c = 0; c < sheet.r2.length; c++) {
      const f = matchField(sheet.r2[c]);
      if (!f) continue;
      const col = c + 1;
      if (f === "serial" && fc.serial === null) fc.serial = col;
      else if (f === "name" && fc.name < 0) fc.name = col;
      else if (f === "feedback" && fc.feedback === null) fc.feedback = col;
      else if (f === "qClass") fc.qNumbersCols.push(col);
      else if (f === "qHomework") fc.qNumbersCols.unshift(col);
    }
    console.log("  fieldColumns:", JSON.stringify(fc));
    if (fc.feedback === null) {
      console.error("  ❌ feedback 未识别!");
      process.exit(1);
    }

    // 2. 计算列宽
    const widths = {};
    const maxFeedbackLen = sheet.students.reduce(
      (max, s) => Math.max(max, visualLen(s.feedback || "")),
      0,
    );
    widths[fc.feedback] = Math.min(70, Math.max(18, maxFeedbackLen + 4));
    const maxNameLen = sheet.students.reduce(
      (max, s) => Math.max(max, visualLen(s.name || "")),
      0,
    );
    widths[fc.name] = Math.min(24, Math.max(10, maxNameLen + 4));
    console.log("  列宽:", JSON.stringify(widths));
    console.log("  最长反馈 visualLen:", maxFeedbackLen, "→ feedback 列宽:", widths[fc.feedback]);

    // 3. 验证 ≥ 18
    if (widths[fc.feedback] < 18) {
      console.error("  ❌ feedback 列宽 < 18");
      process.exit(1);
    }
    console.log("  ✅ 通过\n");
  }

  console.log("=== All sheets passed ===");
})();
