import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ENV_FILES = [".env.mcp", ".env.local", ".env"];
const PROTOCOL_VERSION = "2025-03-26";

loadEnvFiles();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  writeMessage({
    jsonrpc: "2.0",
    method: "notifications/message",
    params: {
      level: "error",
      data: "SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY または SUPABASE_ANON_KEY が必要です。",
    },
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const serverInfo = {
  name: "warito-supabase-mcp",
  version: "0.1.0",
};

const tools = [
  {
    name: "supabase_select",
    title: "Supabase Select",
    description: "Supabase テーブルから行を取得します。",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        columns: { type: "string", default: "*" },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              operator: {
                type: "string",
                enum: [
                  "eq",
                  "neq",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "like",
                  "ilike",
                  "in",
                  "contains",
                  "containedBy",
                  "overlaps",
                  "is",
                  "textSearch",
                ],
              },
              value: {},
            },
            required: ["column", "operator"],
            additionalProperties: false,
          },
        },
        orderBy: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              ascending: { type: "boolean", default: true },
            },
            required: ["column"],
            additionalProperties: false,
          },
        },
        limit: { type: "integer", minimum: 1 },
        single: { type: "boolean", default: false },
      },
      required: ["table"],
      additionalProperties: false,
    },
  },
  {
    name: "supabase_insert",
    title: "Supabase Insert",
    description: "Supabase テーブルに行を追加します。",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        values: {
          oneOf: [
            { type: "object", additionalProperties: true },
            {
              type: "array",
              items: { type: "object", additionalProperties: true },
              minItems: 1,
            },
          ],
        },
      },
      required: ["table", "values"],
      additionalProperties: false,
    },
  },
  {
    name: "supabase_update",
    title: "Supabase Update",
    description: "Supabase テーブルの行を更新します。",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        values: { type: "object", additionalProperties: true },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              operator: {
                type: "string",
                enum: [
                  "eq",
                  "neq",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "like",
                  "ilike",
                  "in",
                  "contains",
                  "containedBy",
                  "overlaps",
                  "is",
                  "textSearch",
                ],
              },
              value: {},
            },
            required: ["column", "operator"],
            additionalProperties: false,
          },
        },
      },
      required: ["table", "values", "filters"],
      additionalProperties: false,
    },
  },
  {
    name: "supabase_delete",
    title: "Supabase Delete",
    description: "Supabase テーブルの行を削除します。",
    inputSchema: {
      type: "object",
      properties: {
        table: { type: "string" },
        filters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              operator: {
                type: "string",
                enum: [
                  "eq",
                  "neq",
                  "gt",
                  "gte",
                  "lt",
                  "lte",
                  "like",
                  "ilike",
                  "in",
                  "contains",
                  "containedBy",
                  "overlaps",
                  "is",
                  "textSearch",
                ],
              },
              value: {},
            },
            required: ["column", "operator"],
            additionalProperties: false,
          },
        },
      },
      required: ["table", "filters"],
      additionalProperties: false,
    },
  },
  {
    name: "supabase_rpc",
    title: "Supabase RPC",
    description: "Supabase の RPC 関数を実行します。",
    inputSchema: {
      type: "object",
      properties: {
        functionName: { type: "string" },
        args: { type: "object", additionalProperties: true, default: {} },
      },
      required: ["functionName"],
      additionalProperties: false,
    },
  },
];

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  consumeBuffer();
});

process.stdin.on("end", () => {
  process.exit(0);
});

async function handleMessage(message) {
  if (message.method === "initialize") {
    return sendResponse(message.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo,
    });
  }

  if (message.method === "notifications/initialized") {
    return;
  }

  if (message.method === "tools/list") {
    return sendResponse(message.id, { tools });
  }

  if (message.method === "tools/call") {
    try {
      const result = await callTool(message.params?.name, message.params?.arguments || {});
      return sendResponse(message.id, {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      });
    } catch (error) {
      return sendError(message.id, -32000, error instanceof Error ? error.message : String(error));
    }
  }

  if (message.id !== undefined) {
    return sendError(message.id, -32601, `Unsupported method: ${message.method}`);
  }
}

async function callTool(name, args) {
  switch (name) {
    case "supabase_select":
      return handleSelect(args);
    case "supabase_insert":
      return handleInsert(args);
    case "supabase_update":
      return handleUpdate(args);
    case "supabase_delete":
      return handleDelete(args);
    case "supabase_rpc":
      return handleRpc(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handleSelect(args) {
  let query = supabase.from(args.table).select(args.columns || "*");
  query = applyFilters(query, args.filters);
  query = applyOrder(query, args.orderBy);
  if (typeof args.limit === "number") {
    query = query.limit(args.limit);
  }
  if (args.single) {
    query = query.single();
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function handleInsert(args) {
  const { data, error } = await supabase.from(args.table).insert(args.values).select();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function handleUpdate(args) {
  let query = supabase.from(args.table).update(args.values);
  query = applyFilters(query, args.filters);
  const { data, error } = await query.select();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function handleDelete(args) {
  let query = supabase.from(args.table).delete();
  query = applyFilters(query, args.filters);
  const { data, error } = await query.select();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function handleRpc(args) {
  const { data, error } = await supabase.rpc(args.functionName, args.args || {});
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

function applyFilters(query, filters = []) {
  let nextQuery = query;
  for (const filter of filters) {
    const operator = filter.operator;
    const value = filter.value;
    switch (operator) {
      case "eq":
      case "neq":
      case "gt":
      case "gte":
      case "lt":
      case "lte":
      case "like":
      case "ilike":
      case "is":
        nextQuery = nextQuery[operator](filter.column, value);
        break;
      case "in":
        nextQuery = nextQuery.in(filter.column, Array.isArray(value) ? value : []);
        break;
      case "contains":
        nextQuery = nextQuery.contains(filter.column, value);
        break;
      case "containedBy":
        nextQuery = nextQuery.containedBy(filter.column, value);
        break;
      case "overlaps":
        nextQuery = nextQuery.overlaps(filter.column, value);
        break;
      case "textSearch":
        nextQuery = nextQuery.textSearch(filter.column, value);
        break;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }
  return nextQuery;
}

function applyOrder(query, orderBy = []) {
  let nextQuery = query;
  for (const order of orderBy) {
    nextQuery = nextQuery.order(order.column, { ascending: order.ascending ?? true });
  }
  return nextQuery;
}

function loadEnvFiles() {
  for (const file of ENV_FILES) {
    const envPath = path.resolve(process.cwd(), file);
    if (!existsSync(envPath)) {
      continue;
    }
    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

function consumeBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }
    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      throw new Error("Missing Content-Length header");
    }
    const contentLength = Number(match[1]);
    const totalLength = headerEnd + 4 + contentLength;
    if (buffer.length < totalLength) {
      return;
    }
    const body = buffer.slice(headerEnd + 4, totalLength);
    buffer = buffer.slice(totalLength);
    const message = JSON.parse(body);
    Promise.resolve(handleMessage(message)).catch((error) => {
      if (message.id !== undefined) {
        sendError(message.id, -32000, error instanceof Error ? error.message : String(error));
      }
    });
  }
}

function sendResponse(id, result) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result,
  });
}

function sendError(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
}

function writeMessage(payload) {
  const body = JSON.stringify(payload);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}
