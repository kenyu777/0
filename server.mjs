import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)));
const dataFile = resolve(root, process.env.DATA_FILE || "data/posts.json");
const uploadDirectory = resolve(root, process.env.UPLOAD_DIR || "data/uploads");
const maxImageBytes = 2 * 1024 * 1024;
const maxSubmissionImageBytes = 4 * 1024 * 1024;
const maxStoredImageBytes = 300 * 1024 * 1024;
const mimeTypes = { ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

async function loadEnvFile() {
  try {
    const content = await readFile(resolve(root, ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadEnvFile();
const adminToken = process.env.ADMIN_TOKEN || "";
if (adminToken.length < 32) {
  console.error("Set ADMIN_TOKEN to a random secret of at least 32 characters in .env or the host environment.");
  process.exit(1);
}

const postHash = (key) => createHash("sha256").update(key).digest("hex");
const sendJson = (response, status, payload) => {
  response.writeHead(status, { "content-type": mimeTypes[".json"], "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
};

async function readJson(request, maxBytes = 20_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("请求内容过大。"), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("请求内容不是有效 JSON。"), { status: 400 }); }
}

async function readPosts() {
  try {
    const raw = await readFile(dataFile, "utf8");
    const posts = JSON.parse(raw);
    if (!Array.isArray(posts)) throw new Error("Post store must be a JSON array.");
    return posts;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writePosts(posts) {
  await mkdir(resolve(dataFile, ".."), { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(posts, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryFile, dataFile);
}

let writeQueue = Promise.resolve();
function updatePosts(mutator) {
  const createdPaths = [];
  const operation = writeQueue.then(async () => {
    const posts = await readPosts();
    const result = await mutator(posts, createdPaths);
    await writePosts(posts);
    return result;
  }).catch(async (error) => {
    await Promise.allSettled(createdPaths.map((path) => unlink(path)));
    throw error;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

function isAdmin(request) {
  const provided = request.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  const actual = Buffer.from(provided);
  const expected = Buffer.from(adminToken);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parseImageUploads(input) {
  const items = input ?? [];
  if (!Array.isArray(items) || items.length > 3) throw Object.assign(new Error("最多可附加 3 张图片。"), { status: 400 });
  let totalSize = 0;
  return items.map((item) => {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(item?.dataUrl || ""));
    if (!match) throw Object.assign(new Error("图片格式仅支持 JPG、PNG 或 WebP。"), { status: 400 });
    const [, mimeType, encoded] = match;
    const buffer = Buffer.from(encoded, "base64");
    if (!buffer.length || buffer.length > maxImageBytes || buffer.toString("base64") !== encoded) {
      throw Object.assign(new Error("每张图片需小于 2 MB，且文件内容必须有效。"), { status: 400 });
    }
    totalSize += buffer.length;
    if (totalSize > maxSubmissionImageBytes) throw Object.assign(new Error("每次发布的图片总大小不能超过 4 MB。"), { status: 400 });
    const isJpeg = mimeType === "image/jpeg" && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = mimeType === "image/webp" && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) throw Object.assign(new Error("图片文件内容与扩展类型不匹配。"), { status: 400 });
    const name = basename(String(item.name || "图片")).replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 80) || "图片";
    return { id: randomUUID(), name, mimeType, size: buffer.length, buffer };
  });
}

async function saveImageFiles(files, createdPaths) {
  await mkdir(uploadDirectory, { recursive: true });
  try {
    for (const file of files) {
      const finalPath = resolve(uploadDirectory, file.id);
      const temporaryPath = `${finalPath}.tmp`;
      await writeFile(temporaryPath, file.buffer, { flag: "wx", mode: 0o600 });
      await rename(temporaryPath, finalPath);
      createdPaths.push(finalPath);
    }
  } catch (error) {
    const cleanupPaths = files.flatMap(({ id }) => [resolve(uploadDirectory, id), resolve(uploadDirectory, `${id}.tmp`)]);
    await Promise.allSettled(cleanupPaths.map((path) => unlink(path)));
    throw error;
  }
}

function imageOwner(posts, imageId, statusFilter, ownerKeyHash = null) {
  return posts.find((post) => (!statusFilter || post.moderationStatus === statusFilter)
    && (!ownerKeyHash || post.ownerKeyHash === ownerKeyHash)
    && (post.attachments || []).some((attachment) => attachment.id === imageId));
}

async function sendImage(response, attachmentId, attachment) {
  try {
    const contents = await readFile(resolve(uploadDirectory, attachmentId));
    response.writeHead(200, { "content-type": attachment.mimeType, "content-length": contents.length, "cache-control": "no-store", "x-content-type-options": "nosniff" });
    response.end(contents);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    sendJson(response, 404, { error: "图片不存在。" });
  }
}

function validPost(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Object.assign(new Error("发布信息格式无效。"), { status: 400 });
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  const category = String(input.category || "").trim();
  if (title.length < 2 || title.length > 60) throw Object.assign(new Error("活动名称需为 2–60 个字符。"), { status: 400 });
  if (body.length < 5 || body.length > 500) throw Object.assign(new Error("活动介绍需为 5–500 个字符。"), { status: 400 });
  if (!category || category.length > 24) throw Object.assign(new Error("请选择有效的活动类型。"), { status: 400 });
  const start = input.start ? String(input.start) : null;
  if (start && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start) || Number.isNaN(Date.parse(start)))) {
    throw Object.assign(new Error("开始时间格式无效。"), { status: 400 });
  }
  const ownerKey = String(input.ownerKey || "");
  if (!/^[a-f0-9-]{36}$/i.test(ownerKey)) throw Object.assign(new Error("当前浏览器发布凭据无效，请刷新页面后重试。"), { status: 400 });
  const uploads = parseImageUploads(input.attachments);
  return {
    id: randomUUID(), title, body, category, start,
    location: String(input.location || "").trim().slice(0, 80) || "未提供",
    audience: String(input.audience || "").trim().slice(0, 80) || "未注明",
    sourceType: "student", source: "学生发布", kind: "student-post", deadline: null,
    attention: ["学生自主发布信息；参与前请核实活动细节。"], related: [],
    attachments: uploads.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size })),
    uploads,
    createdAt: new Date().toISOString(), moderationStatus: "pending",
    ownerKeyHash: postHash(ownerKey),
  };
}

function publicPost(post) {
  const { ownerKeyHash, moderationStatus, reviewedAt, reviewNote, ...visible } = post;
  return { ...visible, moderationStatus: "approved" };
}

function validateStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const filePath = resolve(root, `.${requested}`);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) return null;
  if (requested.split("/").some((part) => part.startsWith(".")) || filePath.endsWith(".mjs") || filePath.includes(`${sep}data${sep}`) || filePath.includes(`${sep}node_modules${sep}`)) return null;
  return filePath;
}

const server = createServer(async (request, response) => {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("content-security-policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  try {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      if (request.method === "GET" && url.pathname === "/api/posts") {
        const posts = await readPosts();
        return sendJson(response, 200, { posts: posts.filter((post) => post.moderationStatus === "approved").map(publicPost) });
      }

      if (request.method === "POST" && url.pathname === "/api/posts") {
        const input = await readJson(request, 8_000_000);
        const post = await updatePosts(async (posts, createdPaths) => {
          if (posts.filter((existing) => existing.moderationStatus === "pending").length >= 300) {
            throw Object.assign(new Error("待审核队列较满，请稍后再提交。"), { status: 429 });
          }
          const newPost = validPost(input);
          const currentImageBytes = posts.reduce((sum, existing) => sum + (existing.attachments || []).reduce((fileSum, file) => fileSum + Number(file.size || 0), 0), 0);
          const newImageBytes = newPost.uploads.reduce((sum, file) => sum + file.size, 0);
          if (currentImageBytes + newImageBytes > maxStoredImageBytes) throw Object.assign(new Error("本地图片存储空间已满，请联系管理员清理旧内容。"), { status: 507 });
          const { uploads, ...postRecord } = newPost;
          await saveImageFiles(uploads, createdPaths);
          posts.push(postRecord);
          return postRecord;
        });
        const { ownerKeyHash, ...submission } = post;
        return sendJson(response, 201, { post: submission });
      }

      if (request.method === "GET" && url.pathname === "/api/mine") {
        const ownerKey = request.headers["x-owner-key"] || "";
        if (!/^[a-f0-9-]{36}$/i.test(ownerKey)) return sendJson(response, 401, { error: "找不到本机发布凭据。" });
        const posts = await readPosts();
        const mine = posts.filter((post) => post.ownerKeyHash === postHash(ownerKey)).map(({ ownerKeyHash, ...post }) => post);
        return sendJson(response, 200, { posts: mine });
      }

      const ownImageMatch = /^\/api\/mine\/uploads\/([a-f0-9-]{36})$/i.exec(url.pathname);
      if (request.method === "GET" && ownImageMatch) {
        const ownerKey = request.headers["x-owner-key"] || "";
        if (!/^[a-f0-9-]{36}$/i.test(ownerKey)) return sendJson(response, 404, { error: "图片不存在。" });
        const posts = await readPosts();
        const owner = imageOwner(posts, ownImageMatch[1], null, postHash(ownerKey));
        const attachment = owner?.attachments.find((file) => file.id === ownImageMatch[1]);
        if (!attachment) return sendJson(response, 404, { error: "图片不存在。" });
        return sendImage(response, ownImageMatch[1], attachment);
      }

      if (url.pathname.startsWith("/api/admin/")) {
        if (!isAdmin(request)) return sendJson(response, 401, { error: "审核口令不正确。" });
        const adminImageMatch = /^\/api\/admin\/uploads\/([a-f0-9-]{36})$/i.exec(url.pathname);
        if (request.method === "GET" && adminImageMatch) {
          const posts = await readPosts();
          const owner = imageOwner(posts, adminImageMatch[1], null);
          const attachment = owner?.attachments.find((file) => file.id === adminImageMatch[1]);
          if (!attachment) return sendJson(response, 404, { error: "图片不存在。" });
          return sendImage(response, adminImageMatch[1], attachment);
        }
        if (request.method === "GET" && url.pathname === "/api/admin/posts") {
          const posts = await readPosts();
          const visible = posts.map(({ ownerKeyHash, ...post }) => post).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
          return sendJson(response, 200, { posts: visible });
        }
        const match = /^\/api\/admin\/posts\/([a-f0-9-]+)$/.exec(url.pathname);
        if (request.method === "PATCH" && match) {
          const input = await readJson(request, 4_000);
          if (!input || typeof input !== "object" || Array.isArray(input)) return sendJson(response, 400, { error: "审核内容格式无效。" });
          if (!["approved", "rejected"].includes(input.status)) return sendJson(response, 400, { error: "审核状态无效。" });
          const updated = await updatePosts((posts) => {
            const index = posts.findIndex((post) => post.id === match[1]);
            if (index < 0) return null;
            posts[index] = { ...posts[index], moderationStatus: input.status, reviewedAt: new Date().toISOString(), reviewNote: String(input.note || "").trim().slice(0, 240) };
            return posts[index];
          });
          if (!updated) return sendJson(response, 404, { error: "没有找到这条发布。" });
          const { ownerKeyHash, ...publicUpdated } = updated;
          return sendJson(response, 200, { post: publicUpdated });
        }
        return sendJson(response, 404, { error: "找不到这个审核接口。" });
      }

      return sendJson(response, 404, { error: "找不到这个接口。" });
    }

    const publicImageMatch = /^\/uploads\/([a-f0-9-]{36})$/i.exec(url.pathname);
    if (request.method === "GET" && publicImageMatch) {
      const posts = await readPosts();
      const owner = imageOwner(posts, publicImageMatch[1], "approved");
      const attachment = owner?.attachments.find((file) => file.id === publicImageMatch[1]);
      if (!attachment) return sendJson(response, 404, { error: "图片不存在。" });
      return sendImage(response, publicImageMatch[1], attachment);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { allow: "GET, HEAD" });
      return response.end("Method not allowed");
    }
    const filePath = validateStaticPath(url.pathname);
    if (!filePath) return sendJson(response, 404, { error: "找不到这个页面。" });
    let contents;
    try { contents = await readFile(filePath); }
    catch (error) {
      if (error.code !== "ENOENT" && error.code !== "EISDIR") throw error;
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return response.end("Not found");
    }
    response.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream", "cache-control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=300" });
    return response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    console.error("Request failed:", error.message);
    return sendJson(response, error.status || 500, { error: error.status ? error.message : "服务器暂时无法处理请求。" });
  }
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () => {
  console.log(`Campus opportunities server listening on ${host}:${port}`);
  if (host === "0.0.0.0") {
    const addresses = Object.values(networkInterfaces()).flatMap((items) => items || [])
      .filter((item) => item.family === "IPv4" && !item.internal)
      .filter((item) => /^10\./.test(item.address) || /^192\.168\./.test(item.address) || /^172\.(1[6-9]|2\d|3[01])\./.test(item.address))
      .map((item) => `http://${item.address}:${port}/`);
    for (const address of addresses) console.log(`LAN demo: ${address}`);
  }
});
server.on("error", (error) => {
  console.error(`Unable to listen on ${host}:${port} (${error.code}). Stop the existing service or choose another PORT.`);
  process.exitCode = 1;
});
