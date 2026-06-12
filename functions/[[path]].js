// Cloudflare Pages Function - 销售排队系统备用服务

const BASE_URL = "https://docs.qq.com/openapi/spreadsheet/v3";
const FILE_ID = "DRnhDemRIS25mdnFF";
const SHEET_ID = "000007";
const MODEL_SHEET_ID = "000002";
const USER_SHEET_ID = "s9osf8";

const TENCENT_HEADERS = {
  "Content-Type": "application/json",
  "Access-Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbHQiOiJkYTgxNWQxMjI3Mjk0NDU3YjQzNDEzYmRjMTZlM2U5MCIsInR5cCI6MSwiZXhwIjoxNzgyMDk0NTcyLjEwODc1MywiaWF0IjoxNzc5NTAyNTcyLjEwODc1Mywic3ViIjoiOWJjMTcyZTUzMzgxNDdkOGEzNWMxNDM4ZWE4ZDE1NzcifQ.rm3BIdD1V7FrCwdToT2arErs06xWF7hTqAh0KsCKsdw",
  "Open-Id": "9bc172e5338147d8a35c1438ea8d1577",
  "Client-Id": "da815d1227294457b43413bdc16e3e90"
};

const MODEL_CONFIG = {
  "F5631":  { sheetId: "000005", startRow: 6,  capCol: "J",  limitCell: "M1",  rowCount: 179 },
  "F3500":  { sheetId: "000005", startRow: 6,  capCol: "K",  limitCell: "N1",  rowCount: 179 },
  "C210":   { sheetId: "000003", startRow: 4,  capCol: "AC", limitCell: "E1",  rowCount: 180 },
  "C220":   { sheetId: "000003", startRow: 4,  capCol: "AD", limitCell: "F1",  rowCount: 180 },
  "C230":   { sheetId: "000003", startRow: 4,  capCol: "AE", limitCell: "G1",  rowCount: 180 },
  "C240A":  { sheetId: "000003", startRow: 4,  capCol: "AF", limitCell: "H1",  rowCount: 180 },
  "C3050A": { sheetId: "000003", startRow: 4,  capCol: "AG", limitCell: "I1",  rowCount: 180 },
  "C280":   { sheetId: "000003", startRow: 4,  capCol: "AH", limitCell: "J1",  rowCount: 180 },
  "330N":   { sheetId: "00000a", startRow: 3,  capCol: "H",  limitCell: "I1",  rowCount: 216 },
  "F3600":  { sheetId: "00000a", startRow: 3,  capCol: "M",  limitCell: "O1",  rowCount: 216 },
  "C204":   { sheetId: "000006", startRow: 4,  capCol: "AA", limitCell: "F2",  rowCount: 225 },
  "C307":   { sheetId: "000006", startRow: 4,  capCol: "AB", limitCell: "G2",  rowCount: 225 },
  "C305":   { sheetId: "000006", startRow: 4,  capCol: "AC", limitCell: "H2",  rowCount: 225 },
  "C310":   { sheetId: "000006", startRow: 4,  capCol: "AD", limitCell: "I2",  rowCount: 225 },
  "4110B":  { sheetId: "000001", startRow: 4,  capCol: "AB", limitCell: "I2",  rowCount: 185 },
  "5118G":  { sheetId: "000001", startRow: 4,  capCol: "AD", limitCell: "L2",  rowCount: 185 },
  "R4110":  { sheetId: "000001", startRow: 4,  capCol: "AE", limitCell: "K2",  rowCount: 185 },
  "6001C":  { sheetId: "000001", startRow: 4,  capCol: "AF", limitCell: "M2",  rowCount: 185 },
  "R403":   { sheetId: "000001", startRow: 4,  capCol: "AJ", limitCell: "AK1", rowCount: 185 },
  "R6207":  { sheetId: "000004", startRow: 3,  capCol: "O",  limitCell: "I1",  rowCount: 201 },
  "R6205":  { sheetId: "000004", startRow: 3,  capCol: "S",  limitCell: "J1",  rowCount: 201 },
  "R6048":  { sheetId: "000004", startRow: 3,  capCol: "W",  limitCell: "K1",  rowCount: 201 },
  "304铁桶": { sheetId: "00000c", startRow: 3,  capCol: "I",  limitCell: "L1",  rowCount: 186 },
  "304吨桶": { sheetId: "00000c", startRow: 3,  capCol: "J",  limitCell: "M1",  rowCount: 186 },
  "350T":   { sheetId: "000009", startRow: 3,  capCol: "N",  limitCell: "K1",  rowCount: 241 },
  "8001A":  { sheetId: "000009", startRow: 3,  capCol: "Q",  limitCell: "O1",  rowCount: 241 },
};

let cache = {};
const CACHE_TTL = 60;
const USER_CACHE_TTL = 120;
const MODEL_CACHE_TTL = 300;
const ORDER_CACHE_TTL = 45;
const PENDING_CACHE_TTL = 30;

let usersCache = { data: null, time: 0 };
let modelsCache = { data: null, time: 0 };
let ordersCache = { data: null, time: 0 };
let pendingRowsCache = { data: null, time: 0 };

function isCacheValid(entry, ttlSeconds) {
  return entry.data !== null && (Date.now() / 1000 - entry.time) < ttlSeconds;
}

function clearOrderCaches() {
  ordersCache = { data: null, time: 0 };
  pendingRowsCache = { data: null, time: 0 };
}

function clearUserCaches() {
  usersCache = { data: null, time: 0 };
}

function parseCellValue(cellValue) {
  if (!cellValue) return "";
  if (cellValue.text !== undefined) return cellValue.text;
  if (cellValue.number !== undefined) return String(cellValue.number);
  if (cellValue.formattedText !== undefined) return String(cellValue.formattedText);
  if (cellValue.stringValue !== undefined) return String(cellValue.stringValue);
  if (cellValue.value !== undefined && typeof cellValue.value !== "object") return String(cellValue.value);
  if (cellValue.time) {
    const t = cellValue.time;
    return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
  }
  if (cellValue.select?.value?.length) return String(cellValue.select.value[0]);
  if (cellValue.link) return String(cellValue.link.text || cellValue.link.url || "");
  if (Array.isArray(cellValue.richText)) {
    return cellValue.richText.map(item => item.text || item.value || "").join("");
  }
  return "";
}

function colLetterToIndex(col) {
  let result = 0;
  for (const c of col) {
    result = result * 26 + (c.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

async function readSheetRange(sheetId, rangeStr) {
  const url = `${BASE_URL}/files/${FILE_ID}/${sheetId}/${rangeStr}`;
  const resp = await fetch(url, { headers: TENCENT_HEADERS });
  if (resp.status === 200) {
    const data = await resp.json();
    return data.gridData || {};
  }
  return {};
}

async function readSingleCell(sheetId, cell) {
  const gridData = await readSheetRange(sheetId, `${cell}:${cell}`);
  const rows = gridData.rows || [];
  if (rows.length > 0) {
    for (const v of rows[0].values || []) {
      const cv = v.cellValue;
      if (cv) return parseCellValue(cv);
    }
  }
  return "";
}

async function getSheetData(sheetId, startRow, capacityCol, limitCell, rowCount) {
  const cacheKey = `${sheetId}:${startRow}:${capacityCol}:${limitCell}`;
  const now = Date.now() / 1000;
  if (cache[cacheKey] && (now - cache[cacheKey].time) < CACHE_TTL) {
    return cache[cacheKey].data;
  }

  const endRow = startRow + rowCount - 1;
  const rangeStr = `A${startRow}:${capacityCol}${endRow}`;
  const gridData = await readSheetRange(sheetId, rangeStr);
  const rows = gridData.rows || [];

  const capacityColIndex = colLetterToIndex(capacityCol);
  const dateCapacityMap = {};

  for (const row of rows) {
    const values = row.values || [];
    if (values.length < capacityColIndex + 1) continue;

    let dateVal = "";
    for (const v of values.slice(0, 1)) {
      const cv = v.cellValue;
      if (cv) {
        dateVal = parseCellValue(cv);
        break;
      }
    }

    let capVal = null;
    if (values.length > capacityColIndex) {
      const cv = values[capacityColIndex].cellValue;
      if (cv) {
        const capStr = parseCellValue(cv);
        capVal = parseFloat(capStr);
      }
    }

    if (dateVal && capVal !== null && !isNaN(capVal)) {
      dateCapacityMap[dateVal] = capVal;
    }
  }

  const limitDateStr = await readSingleCell(sheetId, limitCell);

  const result = { dateCapacityMap, limitDate: limitDateStr };
  cache[cacheKey] = { data: result, time: now };
  return result;
}

async function calculateDeliveryDate(model, tonnageStr, expectedDateStr) {
  if (!MODEL_CONFIG[model]) {
    return ["请联系商务支持", `型号 ${model} 暂无排产数据`];
  }

  const tonnage = parseFloat(tonnageStr);
  if (!tonnage || tonnage <= 0) {
    return ["", "吨位不能为空"];
  }

  if (!expectedDateStr || !expectedDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return ["", "期望发货日期不能为空"];
  }

  const config = MODEL_CONFIG[model];
  const sheetData = await getSheetData(config.sheetId, config.startRow, config.capCol, config.limitCell, config.rowCount);
  const dateCapacityMap = sheetData.dateCapacityMap;
  const limitDateStr = sheetData.limitDate;

  if (!dateCapacityMap || Object.keys(dateCapacityMap).length === 0) {
    return ["请联系商务支持", "工作表数据为空"];
  }

  if (!limitDateStr) {
    return ["请联系商务支持", "上限日期未设置"];
  }

  const filteredCaps = [];
  const lowCapDates = [];

  for (const [d, cap] of Object.entries(dateCapacityMap)) {
    if (d >= expectedDateStr && d <= limitDateStr) {
      filteredCaps.push(cap);
      if (cap < tonnage) {
        lowCapDates.push(d);
      }
    }
  }

  if (filteredCaps.length === 0) {
    return ["请联系商务支持", "期望日期超出可排产范围"];
  }

  if (Math.min(...filteredCaps) >= tonnage) {
    return [expectedDateStr, ""];
  }

  if (lowCapDates.length === 0) {
    return ["请联系商务支持", "无满足条件的排产日期"];
  }

  const maxLowDate = lowCapDates.sort().pop();
  const resultDate = new Date(maxLowDate);
  resultDate.setDate(resultDate.getDate() + 1);
  const resultStr = resultDate.toISOString().split('T')[0];

  if (resultStr > limitDateStr) {
    return ["请联系商务支持", "计算日期超出上限"];
  }

  return [resultStr, ""];
}

async function getNextEmptyRow() {
  if (isCacheValid(pendingRowsCache, PENDING_CACHE_TTL)) {
    return pendingRowsCache.data;
  }

  const batchSize = 200;
  for (let offset = 0; offset < 2000; offset += batchSize) {
    const start = offset + 1;
    const end = offset + batchSize;
    const gridData = await readSheetRange(SHEET_ID, `A${start}:A${end}`);
    const rows = gridData.rows || [];

    for (let i = 0; i < rows.length; i++) {
      const actualRow = start + i;
      if (actualRow < 2) continue;
      const values = rows[i].values || [];
      let hasData = false;
      for (const v of values) {
        const cv = v.cellValue;
        if (cv) {
          const text = parseCellValue(cv);
          if (text.trim()) {
            hasData = true;
            break;
          }
        }
      }
      if (!hasData) {
        pendingRowsCache = { data: actualRow, time: Date.now() / 1000 };
        return actualRow;
      }
    }
  }
  pendingRowsCache = { data: 2001, time: Date.now() / 1000 };
  return 2001;
}

async function batchUpdate(body) {
  const url = `${BASE_URL}/files/${FILE_ID}/batchUpdate`;
  const resp = await fetch(url, {
    method: "POST",
    headers: TENCENT_HEADERS,
    body: JSON.stringify(body)
  });
  return resp;
}

function buildCellValue(value, isDate = false, isNumber = false) {
  let cell = {};
  if (!value || String(value).trim() === "") {
    cell = { cellValue: { text: "" } };
  } else if (isNumber) {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      cell = { cellValue: { number: num } };
    } else {
      cell = { cellValue: { text: String(value) } };
    }
  } else if (isDate) {
    const parts = String(value).split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      cell = { cellValue: { time: { year: parseInt(parts[0]), month: parseInt(parts[1]), day: parseInt(parts[2]) } } };
    } else {
      cell = { cellValue: { text: String(value) } };
    }
  } else {
    cell = { cellValue: { text: String(value) } };
  }
  const textFormat = { fontSize: 14, font: "SimSun" };
  cell.cellFormat = { textFormat };
  cell.textFormat = textFormat;
  return cell;
}

function getBeijingTimeString() {
  const beijingTime = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().replace('T', ' ').slice(0, 19);
}

async function writeOrderRow(rowIndex0Based, model, tonnage, customer, expectedDate, calculatedDate, queueDate, submitter, remark, serialNo, submitterId, submitTime) {
  const queueDateIsDate = queueDate && queueDate.match(/^\d{4}-\d{2}-\d{2}$/);

  let eValue;
  if (calculatedDate && calculatedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    eValue = buildCellValue(calculatedDate, true);
  } else if (calculatedDate) {
    eValue = buildCellValue(calculatedDate);
  } else {
    eValue = buildCellValue("");
  }

  const rowValues = [
    buildCellValue(model),
    buildCellValue(tonnage, false, true),
    buildCellValue(customer),
    buildCellValue(expectedDate, true),
    eValue,
    buildCellValue(queueDate, queueDateIsDate),
    buildCellValue(submitter),
    buildCellValue(remark),
    buildCellValue(serialNo),
    buildCellValue(""),
    buildCellValue(submitterId),
    buildCellValue(submitTime),
  ];

  const body = {
    requests: [{
      updateRangeRequest: {
        sheetId: SHEET_ID,
        gridData: {
          startRow: rowIndex0Based,
          startColumn: 0,
          rows: [{ values: rowValues }]
        }
      }
    }]
  };
  return await batchUpdate(body);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}

async function readUsers() {
  if (isCacheValid(usersCache, USER_CACHE_TTL)) {
    return usersCache.data;
  }

  const url = `${BASE_URL}/files/${FILE_ID}/${USER_SHEET_ID}/A2:D200`;
  const resp = await fetch(url, {
    headers: TENCENT_HEADERS,
    cf: { cacheTtl: 0, cacheEverything: false }
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`读取用户表失败: ${resp.status} ${text.slice(0, 120)}`);
  }

  const data = await resp.json();
  const rows = data.gridData?.rows || data.gridData?.[0]?.rows || data.rows || [];
  const users = [];
  for (const row of rows) {
    const values = row.values || [];
    const name = parseCellValue(values[0]?.cellValue || values[0]);
    const employeeId = parseCellValue(values[1]?.cellValue || values[1]);
    const password = parseCellValue(values[2]?.cellValue || values[2]);
    const adminText = parseCellValue(values[3]?.cellValue || values[3]).trim();
    if (name && employeeId) {
      const canViewAll = ["管理员", "经理", "是", "全部", "全部排队", "可查看全部", "admin", "Admin", "ADMIN"].includes(adminText);
      users.push({
        name,
        employee_id: employeeId,
        password,
        is_admin: canViewAll,
        permission: adminText
      });
    }
  }
  if (users.length === 0) {
    throw new Error(`用户表为空或未读取到员工姓名/员工号，返回行数: ${rows.length}`);
  }
  usersCache = { data: users, time: Date.now() / 1000 };
  return users;
}

async function isUserAdmin(employeeId) {
  const users = await readUsers();
  const user = users.find(u => normalizeUserKey(u.employee_id) === normalizeUserKey(employeeId));
  return Boolean(user?.is_admin);
}

function normalizeUserKey(value) {
  let text = String(value || "").trim();
  if (text.endsWith(".0")) text = text.slice(0, -2);
  return text;
}

function isSameSubmitter(order, submitterId, submitterName) {
  const currentId = normalizeUserKey(submitterId);
  const rowId = normalizeUserKey(order.submitter_id);
  const currentName = String(submitterName || "").trim();
  const rowName = String(order.submitter || "").trim();

  if (currentId && rowId && currentId === rowId) return true;
  if (currentName && rowName && currentName === rowName) return true;
  return false;
}

function orderMatchesExpected(order, expected = {}) {
  const keys = ["model", "customer", "submitter_id", "submit_time"];
  for (const key of keys) {
    const expectedValue = String(expected[key] || "").trim();
    if (expectedValue && String(order[key] || "").trim() !== expectedValue) {
      return false;
    }
  }
  return true;
}

async function resolveSubmitterName(submitterId, submitterName = "") {
  const name = String(submitterName || "").trim();
  if (name && name !== "用户") return name;

  const currentId = normalizeUserKey(submitterId);
  if (!currentId) return name;
  const users = await readUsers();
  const user = users.find(u => normalizeUserKey(u.employee_id) === currentId);
  return String(user?.name || name || "").trim();
}

async function readOrderByRow(rowIndex) {
  if (!Number.isInteger(rowIndex) || rowIndex < 2) {
    return null;
  }
  const gridData = await readSheetRange(SHEET_ID, `A${rowIndex}:L${rowIndex}`);
  const rows = gridData.rows || [];
  if (!rows.length) return null;
  const values = rows[0].values || [];
  const getCol = (idx) => {
    const cv = values[idx]?.cellValue;
    return cv ? parseCellValue(cv) : "";
  };
  const rowData = [];
  for (let i = 0; i < 12; i++) rowData.push(getCol(i));
  if (!rowData[0]) return null;
  return {
    row_index: rowIndex,
    model: rowData[0],
    tonnage: rowData[1],
    customer: rowData[2],
    expected_date: rowData[3],
    calculated_date: rowData[4],
    queue_date: rowData[5],
    submitter: rowData[6],
    remark: rowData[7],
    serial_no: rowData[8],
    last_entry: rowData[9],
    submitter_id: rowData[10],
    submit_time: rowData[11]
  };
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const method = request.method;
  const accessPassword = env.ACCESS_PASSWORD || "queue2025";

  // CORS
  if (method === "OPTIONS") {
    return new Response("", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, X-Access-Password, X-Employee-Id"
      }
    });
  }

  // 静态文件请求直接放行（让Pages处理）
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.startsWith("/css/") || url.pathname.startsWith("/js/")) {
    return await next();
  }

  // 登录相关接口必须在鉴权前处理，否则登录页无法加载员工列表
  if (url.pathname === "/auth/users" && method === "GET") {
    return await apiGetAuthUsers();
  }
  if (url.pathname === "/auth/login" && method === "POST") {
    return await apiAuthLogin(request, accessPassword);
  }
  if (url.pathname === "/auth/check" && method === "GET") {
    const auth = request.headers.get("X-Access-Password") || "";
    return jsonResponse({ authorized: auth === accessPassword });
  }

  // API认证
  const auth = request.headers.get("X-Access-Password") || "";
  if (auth !== accessPassword) {
    return jsonResponse({ success: false, error: "未授权" }, 401);
  }

  const orderMatch = url.pathname.match(/^\/api\/orders\/(\d+)$/);
  if (orderMatch) {
    const rowIndex = parseInt(orderMatch[1], 10);
    if (method === "GET") {
      return await apiGetOrder(url, rowIndex);
    }
    if (method === "PUT") {
      return await apiUpdateOrder(request, rowIndex);
    }
    if (method === "DELETE") {
      return await apiDeleteOrder(request, url, rowIndex);
    }
  }

  // API路由
  if (url.pathname === "/api/models" && method === "GET") {
    return await apiGetModels();
  }
  if (url.pathname === "/api/orders" && method === "GET") {
    return await apiGetOrders(request, url);
  }
  if (url.pathname === "/api/orders" && method === "POST") {
    return await apiCreateOrder(request);
  }
  if (url.pathname === "/api/orders" && method === "DELETE") {
    return await apiDeleteOrder(request, url, 0);
  }
  if (url.pathname === "/api/calculate-date" && method === "POST") {
    return await apiCalculateDate(request);
  }
  if (url.pathname === "/api/feedback" && method === "POST") {
    return await apiFeedback(request);
  }
  if (url.pathname === "/api/users/password" && method === "PUT") {
    return await apiUpdatePassword(request);
  }
  return jsonResponse({ success: false, error: "Not found" }, 404);
}

async function apiGetModels() {
  try {
    if (isCacheValid(modelsCache, MODEL_CACHE_TTL)) {
      return jsonResponse({ success: true, models: modelsCache.data });
    }

    const gridData = await readSheetRange(MODEL_SHEET_ID, "A1:A100");
    const rows = gridData.rows || [];
    const models = [];
    for (const row of rows) {
      for (const v of row.values || []) {
        const cv = v.cellValue;
        if (cv) {
          const text = parseCellValue(cv);
          if (text) models.push(text);
        }
      }
    }
    modelsCache = { data: models, time: Date.now() / 1000 };
    return jsonResponse({ success: true, models });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function fetchAllOrdersRaw() {
  if (isCacheValid(ordersCache, ORDER_CACHE_TTL)) {
    return ordersCache.data;
  }

  const orders = [];
  const todayStr = new Date().toISOString().split('T')[0];

  const scanRanges = [];
  for (let start = 1; start <= 2000; start += 500) {
    scanRanges.push({ start, end: Math.min(start + 499, 2000) });
  }

  const scanBatches = await Promise.all(
    scanRanges.map(async ({ start, end }) => ({
      start,
      gridData: await readSheetRange(SHEET_ID, `A${start}:A${end}`)
    }))
  );

  let lastDataRow = 1;
  for (const { start, gridData } of scanBatches) {
    const rows = gridData.rows || [];
    for (let i = 0; i < rows.length; i++) {
      const cv = rows[i].values?.[0]?.cellValue;
      if (cv && parseCellValue(cv).trim()) {
        lastDataRow = Math.max(lastDataRow, start + i);
      }
    }
  }

  if (lastDataRow <= 1) {
    ordersCache = { data: [], time: Date.now() / 1000 };
    return [];
  }

  const dataRanges = [];
  for (let start = 2; start <= lastDataRow; start += 200) {
    dataRanges.push({ start, end: Math.min(start + 199, lastDataRow) });
  }

  const batches = await Promise.all(
    dataRanges.map(async ({ start, end }) => ({
      start,
      gridData: await readSheetRange(SHEET_ID, `A${start}:L${end}`)
    }))
  );

  for (const { start, gridData } of batches) {
    const rows = gridData.rows || [];

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i].values || [];
      if (!values.length) continue;

      const getCol = (idx) => {
        const cv = values[idx]?.cellValue;
        return cv ? parseCellValue(cv) : "";
      };

      const rowData = [];
      for (let j = 0; j < 12; j++) rowData.push(getCol(j));
      if (!rowData[0]) continue;

      const expectedDateStr = rowData[3];
      if (expectedDateStr && expectedDateStr < todayStr) continue;

      orders.push({
        row_index: start + i,
        model: rowData[0],
        tonnage: rowData[1],
        customer: rowData[2],
        expected_date: rowData[3],
        calculated_date: rowData[4],
        queue_date: rowData[5],
        submitter: rowData[6],
        remark: rowData[7],
        serial_no: rowData[8],
        last_entry: rowData[9],
        submitter_id: rowData[10],
        submit_time: rowData[11]
      });
    }
  }

  ordersCache = { data: orders, time: Date.now() / 1000 };
  return orders;
}

async function apiGetOrders(request, url) {
  try {
    const submitterId = url.searchParams.get("submitter_id") || "";
    let submitterName = url.searchParams.get("submitter_name") || "";
    const isAdmin = await isUserAdmin(submitterId);
    const requestedViewMode = url.searchParams.get("view_mode") || "mine";
    const viewMode = isAdmin ? requestedViewMode : "mine";
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "20");
    const canUseEdgeCache = !url.searchParams.get("_ts") && url.searchParams.get("refresh") !== "1" && typeof caches !== "undefined";
    const edgeCacheKey = new Request(url.toString(), { method: "GET" });

    if (canUseEdgeCache) {
      const cached = await caches.default.match(edgeCacheKey);
      if (cached) {
        return cached;
      }
    }

    if (url.searchParams.get("_ts") || url.searchParams.get("refresh") === "1") {
      clearOrderCaches();
    }

    submitterName = await resolveSubmitterName(submitterId, submitterName);
    const allOrders = await fetchAllOrdersRaw();
    const orders = [];

    for (const order of allOrders) {

      if (!isAdmin && !isSameSubmitter(order, submitterId, submitterName)) {
        continue;
      }
      if (isAdmin && viewMode === "mine" && !isSameSubmitter(order, submitterId, submitterName)) {
        continue;
      }

      orders.push(order);
    }

    orders.sort((a, b) => {
      const qa = a.queue_date || "";
      const qb = b.queue_date || "";
      if (qa && qb) return qa.localeCompare(qb);
      if (qa) return -1;
      if (qb) return 1;
      return 0;
    });

    const total = orders.length;
    const startIdx = (page - 1) * perPage;
    const paginated = orders.slice(startIdx, startIdx + perPage);

    const payload = {
      success: true,
      orders: paginated,
      is_admin: isAdmin,
      view_mode: viewMode,
      pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) }
    };

    if (canUseEdgeCache) {
      const response = new Response(JSON.stringify(payload), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=30"
        }
      });
      await caches.default.put(edgeCacheKey, response.clone());
      return response;
    }

    return jsonResponse(payload);
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiCreateOrder(request) {
  try {
    const data = await request.json();
    const model = data.model || "";
    const tonnage = data.tonnage || "";
    const customer = data.customer || "";
    const expectedDate = data.expected_date || "";
    const queueDate = data.queue_date || "";
    const submitter = data.submitter || "未知用户";
    const submitterId = data.submitter_id || "";
    const rowIndex = data.row_index || 0;

    const remark = `${tonnage}${customer}`;
    const submitTime = getBeijingTimeString();

    let writeRowIdx;
    let serialNo;
    if (rowIndex > 0) {
      const existing = await readOrderByRow(rowIndex);
      if (!existing) {
        writeRowIdx = rowIndex - 1;
        serialNo = String(rowIndex);
      } else {
        const emptyRow = await getNextEmptyRow();
        writeRowIdx = emptyRow - 1;
        serialNo = String(emptyRow);
      }
    } else {
      const emptyRow = await getNextEmptyRow();
      writeRowIdx = emptyRow - 1;
      serialNo = String(emptyRow);
    }

    const [calcDateForWrite] = await calculateDeliveryDate(model, tonnage, expectedDate);

    const resp = await writeOrderRow(
      writeRowIdx, model, tonnage, customer, expectedDate,
      calcDateForWrite, queueDate, submitter, remark, serialNo, submitterId, submitTime
    );
    const result = await resp.json();

    if (result.responses) {
      const updated = result.responses[0]?.updateRangeResponse?.updatedCells || 0;
      if (updated > 0) {
        cache = {};
        clearOrderCaches();
        return jsonResponse({ success: true, message: "订单创建成功" });
      }
      return jsonResponse({ success: false, error: "写入0个单元格" });
    }
    return jsonResponse({ success: false, error: JSON.stringify(result) });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiGetOrder(url, rowIndex) {
  try {
    const submitterId = url.searchParams.get("submitter_id") || "";
    const submitterName = url.searchParams.get("submitter_name") || "";
    const isAdmin = await isUserAdmin(submitterId);
    const order = await readOrderByRow(rowIndex);
    if (!order) {
      return jsonResponse({ success: false, error: "订单不存在" });
    }
    if (!isAdmin && !isSameSubmitter(order, submitterId, submitterName)) {
      return jsonResponse({ success: false, error: "无权查看他人订单" }, 403);
    }
    return jsonResponse({ success: true, order });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiUpdateOrder(request, rowIndex) {
  try {
    if (!Number.isInteger(rowIndex) || rowIndex < 2) {
      return jsonResponse({ success: false, error: "无效的行号" });
    }
    const data = await request.json();
    const submitterId = data.submitter_id || "";
    const submitterName = data.submitter || "";
    const isAdmin = await isUserAdmin(submitterId);
    const original = await readOrderByRow(rowIndex);
    if (!original) {
      return jsonResponse({ success: false, error: "订单不存在" });
    }
    if (!isAdmin && !isSameSubmitter(original, submitterId, submitterName)) {
      return jsonResponse({ success: false, error: "无权修改他人订单" }, 403);
    }
    const newTonnage = parseFloat(data.tonnage || "0");
    const oldTonnage = parseFloat(original.tonnage || "0");
    if (!isNaN(newTonnage) && !isNaN(oldTonnage) && newTonnage > oldTonnage) {
      return jsonResponse({ success: false, error: "吨位只能改小不能改大" });
    }

    const model = data.model || "";
    const tonnage = data.tonnage || "";
    const customer = data.customer || "";
    const expectedDate = data.expected_date || "";
    const queueDate = data.queue_date || "";
    const submitter = data.submitter || original.submitter || "未知用户";
    const remark = `${tonnage}${customer}`;
    const submitTime = getBeijingTimeString();
    const [calcDateForWrite] = await calculateDeliveryDate(model, tonnage, expectedDate);

    const resp = await writeOrderRow(
      rowIndex - 1, model, tonnage, customer, expectedDate,
      calcDateForWrite, queueDate, submitter, remark, String(rowIndex), submitterId, submitTime
    );
    const result = await resp.json();
    if (result.responses) {
      cache = {};
      clearOrderCaches();
      return jsonResponse({ success: true, message: "订单修改成功" });
    }
    return jsonResponse({ success: false, error: JSON.stringify(result) });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiDeleteOrder(request, url, rowIndexFromPath = 0) {
  try {
    let data = {};
    try {
      data = await request.json();
    } catch (e) {
      data = {};
    }
    const rowIndex = rowIndexFromPath || data.row_index || 0;
    const submitterId = url.searchParams.get("submitter_id") || data.submitter_id || request.headers.get("X-Employee-Id") || "";
    const submitterName = url.searchParams.get("submitter_name") || data.submitter || "";
    if (!Number.isInteger(rowIndex) || rowIndex < 2) {
      return jsonResponse({ success: false, error: "无效的行号" });
    }

    const isAdmin = await isUserAdmin(submitterId);
    const original = await readOrderByRow(rowIndex);
    if (!original) {
      return jsonResponse({ success: false, error: "订单不存在" });
    }
    const expectedOrder = data.order || data;
    if (!orderMatchesExpected(original, expectedOrder)) {
      return jsonResponse({ success: false, error: "订单行号已变化，请刷新后重试，未执行删除" });
    }
    if (!isAdmin && !isSameSubmitter(original, submitterId, submitterName)) {
      return jsonResponse({ success: false, error: "无权删除他人订单" }, 403);
    }

    const emptyValues = Array.from({ length: 12 }, () => buildCellValue(""));

    const body = {
      requests: [{
        updateRangeRequest: {
          sheetId: SHEET_ID,
          gridData: {
            startRow: rowIndex - 1,
            startColumn: 0,
            rows: [{ values: emptyValues }]
          }
        }
      }]
    };

    const batchUrl = `${BASE_URL}/files/${FILE_ID}/batchUpdate`;
    const resp = await fetch(batchUrl, {
      method: "POST",
      headers: TENCENT_HEADERS,
      body: JSON.stringify(body)
    });

    if (resp.status === 200) {
      cache = {};
      clearOrderCaches();
      return jsonResponse({ success: true, message: "订单删除成功" });
    }
    return jsonResponse({ success: false, error: `删除失败: ${resp.status}` });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiCalculateDate(request) {
  try {
    const data = await request.json();
    const model = data.model || "";
    const tonnage = data.tonnage || "";
    const expectedDate = data.expected_date || "";
    const pendingRowIndex = data.pending_row_index || 0;

    const [calculatedDate] = await calculateDeliveryDate(model, tonnage, expectedDate);

    let targetRow = 0;
    if (pendingRowIndex > 0) {
      targetRow = pendingRowIndex;
    } else {
      const pendingRows = await getPendingRowsByModel();
      targetRow = pendingRows[model] || 0;
    }

    return jsonResponse({
      success: true,
      calculated_date: calculatedDate,
      row_index: targetRow
    });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function getPendingRowsByModel() {
  const cacheKey = "pendingRowsByModel";
  if (cache[cacheKey] && (Date.now() / 1000 - cache[cacheKey].time) < PENDING_CACHE_TTL) {
    return cache[cacheKey].data;
  }

  const gridData = await readSheetRange(SHEET_ID, "A3:F500");
  const rows = gridData.rows || [];
  const pending = {};
  for (let i = 0; i < rows.length; i++) {
    const values = rows[i].values || [];
    const getCol = (idx) => {
      const cv = values[idx]?.cellValue;
      return cv ? parseCellValue(cv) : "";
    };
    const model = getCol(0);
    const queueDate = getCol(5);
    if (model && !queueDate.trim()) {
      pending[model] = i + 3;
    }
  }
  cache[cacheKey] = { data: pending, time: Date.now() / 1000 };
  return pending;
}

async function apiFeedback(request) {
  try {
    const data = await request.json();
    return jsonResponse({ success: true, message: "反馈已提交" });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiGetAuthUsers() {
  try {
    const users = await readUsers();
    return jsonResponse({
      success: true,
      count: users.length,
      users: users.map(user => ({
        name: user.name,
        employee_id: user.employee_id
      }))
    });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiAuthLogin(request, accessPassword) {
  try {
    const data = await request.json();
    const employeeId = data.employee_id || "";
    const password = data.password || "";
    const users = await readUsers();
    const user = users.find(u => normalizeUserKey(u.employee_id) === normalizeUserKey(employeeId));
    if (!user) {
      return jsonResponse({ success: false, error: "员工号不存在" });
    }
    if (user.password !== password) {
      return jsonResponse({ success: false, error: "密码错误" });
    }
    return jsonResponse({
      success: true,
      user: {
        name: user.name,
        employee_id: user.employee_id
      },
      access_password: accessPassword
    });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiUpdatePassword(request) {
  try {
    const data = await request.json();
    const employeeId = data.employee_id || "";
    const oldPassword = data.old_password || "";
    const newPassword = data.new_password || "";

    if (!employeeId || !oldPassword || !newPassword) {
      return jsonResponse({ success: false, error: "参数不完整" });
    }
    if (newPassword.length < 6) {
      return jsonResponse({ success: false, error: "新密码至少6位" });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return jsonResponse({ success: false, error: "密码必须同时包含字母和数字" });
    }

    const gridData = await readSheetRange(USER_SHEET_ID, "A2:C200");
    const rows = gridData.rows || [];
    let targetRow = 0;
    for (let i = 0; i < rows.length; i++) {
      const values = rows[i].values || [];
      const rowEmployeeId = values[1]?.cellValue ? parseCellValue(values[1].cellValue) : "";
      const rowPassword = values[2]?.cellValue ? parseCellValue(values[2].cellValue) : "";
      if (normalizeUserKey(rowEmployeeId) === normalizeUserKey(employeeId)) {
        if (rowPassword !== oldPassword) {
          return jsonResponse({ success: false, error: "旧密码错误" });
        }
        targetRow = i + 2;
        break;
      }
    }

    if (!targetRow) {
      return jsonResponse({ success: false, error: "员工号不存在" });
    }

    const body = {
      requests: [{
        updateRangeRequest: {
          sheetId: USER_SHEET_ID,
          gridData: {
            startRow: targetRow - 1,
            startColumn: 2,
            rows: [{ values: [{ cellValue: { text: newPassword } }] }]
          }
        }
      }]
    };
    const resp = await batchUpdate(body);
    const result = await resp.json();
    if (result.responses) {
      clearUserCaches();
      return jsonResponse({ success: true, message: "密码修改成功" });
    }
    return jsonResponse({ success: false, error: JSON.stringify(result) });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}
