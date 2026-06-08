import { Server } from "socket.io";
import * as Y from "yjs";
import File from "./models/File.js";

/**
 * One Y.Doc per room (fileId) on the server.
 * Clients send binary Yjs updates -> server applies, rebroadcasts, and persists.
 * Redis is used for pub/sub across multiple node instances + cached hot state.
 */
export function attachSocket(httpServer, redisPub, redisSub, origin) {
  const io = new Server(httpServer, { cors: { origin, methods: ["GET", "POST"] } });

  const docs = new Map(); // fileId -> Y.Doc
  const saveTimers = new Map();

  const getDoc = async (fileId) => {
    if (docs.has(fileId)) return docs.get(fileId);
    const ydoc = new Y.Doc();
    // Try Redis cache first
    const cached = await redisPub.getBuffer(`ydoc:${fileId}`);
    if (cached) {
      Y.applyUpdate(ydoc, cached);
    } else {
      const file = await File.findById(fileId);
      if (file?.ydocState) Y.applyUpdate(ydoc, file.ydocState);
    }
    docs.set(fileId, ydoc);
    return ydoc;
  };

  const scheduleSave = (fileId) => {
    if (saveTimers.has(fileId)) return;
    saveTimers.set(
      fileId,
      setTimeout(async () => {
        saveTimers.delete(fileId);
        const ydoc = docs.get(fileId);
        if (!ydoc) return;
        const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
        const preview = ydoc.getText("monaco").toString().slice(0, 500);
        await File.findByIdAndUpdate(fileId, {
          ydocState: state,
          contentPreview: preview,
        });
        await redisPub.set(`ydoc:${fileId}`, state, "EX", 3600);
      }, 1500) // debounce 1.5s
    );
  };

  // Cross-instance fanout
  redisSub.psubscribe("yupdate:*");
  redisSub.on("pmessageBuffer", (_pattern, channel, message) => {
    const fileId = channel.toString().split(":")[1];
    const doc = docs.get(fileId);
    if (doc) Y.applyUpdate(doc, message, "redis");
    io.to(fileId).emit("yjs-update", message);
  });

  io.on("connection", (socket) => {
    let currentRoom = null;
    let username = "Anonymous";

    socket.on("join-room", async ({ fileId, name }) => {
      username = name || "Anonymous";
      currentRoom = fileId;
      socket.join(fileId);

      const ydoc = await getDoc(fileId);
      // Send full state to the newcomer
      const state = Y.encodeStateAsUpdate(ydoc);
      socket.emit("yjs-sync", state);

      socket.to(fileId).emit("user-joined", { id: socket.id, username });
      io.to(fileId).emit("presence", { id: socket.id, username });
    });

    socket.on("yjs-update", async (update) => {
      if (!currentRoom) return;
      const ydoc = await getDoc(currentRoom);
      Y.applyUpdate(ydoc, new Uint8Array(update), "client");
      socket.to(currentRoom).emit("yjs-update", update);
      // fanout to other node instances
      redisPub.publish(`yupdate:${currentRoom}`, Buffer.from(update));
      scheduleSave(currentRoom);
    });

    socket.on("awareness", (data) => {
      if (!currentRoom) return;
      socket.to(currentRoom).emit("awareness", {
        id: socket.id,
        username,
        ...data, // { cursor: {lineNumber, column}, color }
      });
    });

    socket.on("disconnect", () => {
      if (currentRoom) io.to(currentRoom).emit("user-left", { id: socket.id });
    });
  });

  return io;
}
