// Cloudflare Pages Function - 销售排队系统备用服务

const BASE_URL = "https://docs.qq.com/openapi/spreadsheet/v3";
const FILE_ID = "DRnhDemRIS25mdnFF";
const SHEET_ID = "000007";
const MODEL_SHEET_ID = "000002";

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

function parseCellValue(cellValue) {
  if (!cellValue) return "";
  if (cellValue.text !== undefined) return cellValue.text;
  if (cellValue.number !== undefined) return String(cellValue.number);
  if (cellValue.time) {
    const t = cellValue.time;
    return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
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
      if (!hasData) return actualRow;
    }
  }
  return 2001;
}

async function batchUpdate(body) {
  const url = `${BASE_URL}/files/${FILE_ID}/sheets/${SHEET_ID}/batchUpdate`;
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
  cell.textFormat = { fontSize: 14 };
  return cell;
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
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const method = request.method;

  // CORS
  if (method === "OPTIONS") {
    return new Response("", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, X-Access-Password"
      }
    });
  }

  // 静态文件请求直接放行（让Pages处理）
  if (url.pathname === "/" || url.pathname === "/index.html" || url.pathname.startsWith("/static/")) {
    return await next();
  }

  // API认证
  const auth = request.headers.get("X-Access-Password") || "";
  if (auth !== env.ACCESS_PASSWORD) {
    return jsonResponse({ success: false, error: "未授权" }, 401);
  }

  // API路由
  if (url.pathname === "/api/models" && method === "GET") {
    return await apiGetModels();
  }
  if (url.pathname === "/api/orders" && method === "GET") {
    return await apiGetOrders(url);
  }
  if (url.pathname === "/api/orders" && method === "POST") {
    return await apiCreateOrder(request);
  }
  if (url.pathname === "/api/orders" && method === "DELETE") {
    return await apiDeleteOrder(request);
  }
  if (url.pathname === "/api/calculate-date" && method === "POST") {
    return await apiCalculateDate(request);
  }
  if (url.pathname === "/api/feedback" && method === "POST") {
    return await apiFeedback(request);
  }

  return jsonResponse({ success: false, error: "Not found" }, 404);
}

async function apiGetModels() {
  try {
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
    return jsonResponse({ success: true, models });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiGetOrders(url) {
  try {
    const submitterId = url.searchParams.get("submitter_id") || "";
    const viewMode = url.searchParams.get("view_mode") || "all";
    const page = parseInt(url.searchParams.get("page") || "1");
    const perPage = parseInt(url.searchParams.get("per_page") || "20");

    const gridData = await readSheetRange(SHEET_ID, "A2:L2000");
    const rows = gridData.rows || [];

    const orders = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i].values || [];
      if (!values.length) continue;

      const getCol = (idx) => {
        if (idx < values.length) {
          const cv = values[idx].cellValue;
          if (cv) return parseCellValue(cv);
        }
        return "";
      };

      const rowData = [];
      for (let j = 0; j < 12; j++) rowData.push(getCol(j));
      if (!rowData[0]) continue;

      const expectedDateStr = rowData[3];
      if (expectedDateStr) {
        try {
          if (expectedDateStr < todayStr) continue;
        } catch (e) {}
      }

      orders.push({
        row_index: i + 2,
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

    return jsonResponse({
      success: true,
      orders: paginated,
      is_admin: true,
      view_mode: viewMode,
      pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) }
    });
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
    const submitTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

    let writeRowIdx;
    let serialNo;
    if (rowIndex > 0) {
      writeRowIdx = rowIndex - 1;
      serialNo = String(rowIndex);
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
        return jsonResponse({ success: true, message: "订单创建成功" });
      }
      return jsonResponse({ success: false, error: "写入0个单元格" });
    }
    return jsonResponse({ success: false, error: JSON.stringify(result) });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}

async function apiDeleteOrder(request) {
  try {
    const data = await request.json();
    const rowIndex = data.row_index || 0;
    if (rowIndex <= 0) {
      return jsonResponse({ success: false, error: "无效的行号" });
    }

    const body = {
      requests: [{
        deleteDimensionRequest: {
          sheetId: SHEET_ID,
          dimension: "ROW",
          startIndex: rowIndex,
          endIndex: rowIndex + 1
        }
      }]
    };

    const url = `${BASE_URL}/files/${FILE_ID}/sheets/${SHEET_ID}/batchUpdate`;
    const resp = await fetch(url, {
      method: "POST",
      headers: TENCENT_HEADERS,
      body: JSON.stringify(body)
    });

    if (resp.status === 200) {
      cache = {};
      return jsonResponse({ success: true, message: "删除成功" });
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
      const gridData = await readSheetRange(SHEET_ID, "A3:F200");
      const rows = gridData.rows || [];
      for (let i = 0; i < rows.length; i++) {
        const values = rows[i].values || [];
        const rowData = [];
        for (const v of values) {
          const cv = v.cellValue;
          rowData.push(cv ? parseCellValue(cv) : "");
        }
        const aVal = rowData[0] || "";
        const fVal = rowData[5] || "";
        if (aVal === model && !fVal.trim()) {
          targetRow = i + 3;
          break;
        }
      }
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

async function apiFeedback(request) {
  try {
    const data = await request.json();
    return jsonResponse({ success: true, message: "反馈已提交" });
  } catch (e) {
    return jsonResponse({ success: false, error: e.message });
  }
}
