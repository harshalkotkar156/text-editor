// import { useEffect, useRef, useState } from "react";
// import Editor from "@monaco-editor/react";
// import * as Y from "yjs";
// import { MonacoBinding } from "y-monaco";
// import { io } from "socket.io-client";
// import { api, SOCKET_URL } from "../api";

// const colorFor = (id) => {
//   let h = 0;
//   for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
//   return `hsl(${h},80%,60%)`;
// };

// export default function CodeEditor({ fileId, username }) {
//   const [file, setFile] = useState(null);
//   const [peers, setPeers] = useState({});
//   const editorRef = useRef(null);
//   const monacoRef = useRef(null);
//   const ydocRef = useRef(null);
//   const bindingRef = useRef(null);
//   const socketRef = useRef(null);
//   const decorationsRef = useRef([]);

//   // Load file metadata
//   useEffect(() => {
//     setFile(null);
//     api.get(fileId).then(setFile);
//   }, [fileId]);

//   // Wire Yjs + socket once editor mounts and file is loaded
//   const handleMount = (editor, monaco) => {
//     editorRef.current = editor;
//     monacoRef.current = monaco;
//     setup();
//   };

//   const setup = () => {
//     if (!editorRef.current || !file) return;

//     // Tear down previous
//     bindingRef.current?.destroy();
//     ydocRef.current?.destroy();
//     socketRef.current?.disconnect();

//     const ydoc = new Y.Doc();
//     ydocRef.current = ydoc;
//     const ytext = ydoc.getText("monaco");

//     const socket = io(SOCKET_URL, { transports: ["websocket"] });
//     socketRef.current = socket;

//     socket.emit("join-room", { fileId, name: username });

//     // Initial full state from server
//     socket.on("yjs-sync", (update) => {
//       Y.applyUpdate(ydoc, new Uint8Array(update), "server");
//     });

//     // Incremental updates from peers
//     socket.on("yjs-update", (update) => {
//       Y.applyUpdate(ydoc, new Uint8Array(update), "remote");
//     });

//     // Local changes -> send to server
//     ydoc.on("update", (update, origin) => {
//       if (origin === "server" || origin === "remote") return;
//       socket.emit("yjs-update", update);
//     });

//     // Bind to Monaco — this is where CRDT magic plugs into the editor
//     bindingRef.current = new MonacoBinding(
//       ytext,
//       editorRef.current.getModel(),
//       new Set([editorRef.current])
//     );

//     // Cursor / presence
//     editorRef.current.onDidChangeCursorPosition((e) => {
//       socket.emit("awareness", {
//         cursor: { lineNumber: e.position.lineNumber, column: e.position.column },
//         color: colorFor(socket.id || username),
//       });
//     });

//     socket.on("awareness", (data) => {
//       setPeers((prev) => ({ ...prev, [data.id]: data }));
//     });
//     socket.on("user-left", ({ id }) => {
//       setPeers((prev) => {
//         const n = { ...prev }; delete n[id]; return n;
//       });
//     });
//   };

//   useEffect(() => { setup(); /* eslint-disable-next-line */ }, [file]);

//   // Render remote cursors as Monaco decorations
//   useEffect(() => {
//     if (!editorRef.current || !monacoRef.current) return;
//     const monaco = monacoRef.current;
//     const decos = Object.values(peers)
//       .filter((p) => p.cursor)
//       .map((p) => ({
//         range: new monaco.Range(
//           p.cursor.lineNumber, p.cursor.column,
//           p.cursor.lineNumber, p.cursor.column
//         ),
//         options: {
//           className: "remote-cursor",
//           afterContentClassName: "remote-cursor-label",
//           hoverMessage: { value: p.username },
//           after: {
//             content: ` ${p.username} `,
//             inlineClassName: "bg-indigo-500 text-white px-1 rounded text-xs",
//           },
//         },
//       }));
//     decorationsRef.current = editorRef.current.deltaDecorations(
//       decorationsRef.current, decos
//     );
//   }, [peers]);

//   useEffect(() => () => {
//     bindingRef.current?.destroy();
//     ydocRef.current?.destroy();
//     socketRef.current?.disconnect();
//   }, []);

//   if (!file) return <div className="p-8 text-slate-400">Loading…</div>;

//   return (
//     <div className="flex-1 flex flex-col">
//       <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
//         <div className="font-semibold">{file.name}</div>
//         <div className="flex gap-2 text-xs">
//           {Object.values(peers).map((p) => (
//             <span
//               key={p.id}
//               className="px-2 py-1 rounded"
//               style={{ background: p.color || "#6366f1" }}
//             >{p.username}</span>
//           ))}
//         </div>
//       </div>
//       <Editor
//         height="calc(100vh - 44px)"
//         theme="vs-dark"
//         language={file.language}
//         defaultValue=""
//         onMount={handleMount}
//         options={{ fontSize: 14, minimap: { enabled: false } }}
//       />
//     </div>
//   );
// }


import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { io } from "socket.io-client";
import { api, SOCKET_URL } from "../api";

const colorFor = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return `hsl(${h},80%,60%)`;
};

export default function CodeEditor({ fileId, username }) {
  const [file, setFile] = useState(null);
  const [peers, setPeers] = useState({});
  const [connected, setConnected] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const socketRef = useRef(null);

  const decorationsRef = useRef([]);

  useEffect(() => {
    setFile(null);
    api.get(fileId).then(setFile);
  }, [fileId]);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    setupEditor();
  };

  const setupEditor = () => {
    if (!editorRef.current || !file) return;

    bindingRef.current?.destroy();
    ydocRef.current?.destroy();
    socketRef.current?.disconnect();

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const ytext = ydoc.getText("monaco");

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      socket.emit("join-room", {
        fileId,
        name: username,
      });
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("yjs-sync", (update) => {
      Y.applyUpdate(
        ydoc,
        new Uint8Array(update),
        "server"
      );
    });

    socket.on("yjs-update", (update) => {
      Y.applyUpdate(
        ydoc,
        new Uint8Array(update),
        "remote"
      );
    });

    ydoc.on("update", (update, origin) => {
      if (
        origin === "server" ||
        origin === "remote"
      ) {
        return;
      }

      socket.emit("yjs-update", update);
    });

    bindingRef.current = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current])
    );

    editorRef.current.onDidChangeCursorPosition(
      (e) => {
        socket.emit("awareness", {
          username,
          color: colorFor(socket.id || username),
          cursor: {
            lineNumber: e.position.lineNumber,
            column: e.position.column,
          },
        });
      }
    );

    socket.on("awareness", (data) => {
      setPeers((prev) => ({
        ...prev,
        [data.id]: data,
      }));
    });

    socket.on("user-left", ({ id }) => {
      setPeers((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });
  };

  useEffect(() => {
    setupEditor();
  }, [file]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current)
      return;

    const monaco = monacoRef.current;

    const decorations = Object.values(peers)
      .filter((peer) => peer.cursor)
      .map((peer) => ({
        range: new monaco.Range(
          peer.cursor.lineNumber,
          peer.cursor.column,
          peer.cursor.lineNumber,
          peer.cursor.column
        ),
        options: {
          className: "remote-cursor",
          hoverMessage: {
            value: peer.username,
          },
        },
      }));

    decorationsRef.current =
      editorRef.current.deltaDecorations(
        decorationsRef.current,
        decorations
      );
  }, [peers]);

  useEffect(() => {
    return () => {
      bindingRef.current?.destroy();
      ydocRef.current?.destroy();
      socketRef.current?.disconnect();
    };
  }, []);

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>

          <p className="mt-4 text-slate-400">
            Loading file...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-950">

      {/* Header */}

      <div className="h-14 border-b border-slate-800 bg-slate-900 px-5 flex items-center justify-between">

        <div>
          <h2 className="font-semibold text-white">
            {file.name}
          </h2>

          <div className="text-xs text-slate-400">
            {file.language}
          </div>
        </div>

        <div className="flex items-center gap-4">

          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                connected
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />

            <span className="text-xs text-slate-400">
              {connected
                ? "Connected"
                : "Disconnected"}
            </span>
          </div>

          <div className="flex gap-2">
            {Object.values(peers).map((peer) => (
              <div
                key={peer.id}
                className="px-3 py-1 rounded-full text-xs font-medium text-white"
                style={{
                  backgroundColor:
                    peer.color || "#6366f1",
                }}
              >
                {peer.username}
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Monaco */}

      <div className="flex-1">

        <Editor
          height="100%"
          language={file.language}
          theme="vs-dark"
          defaultValue=""
          onMount={handleMount}
          options={{
            fontSize: 15,

            fontFamily:
              "'JetBrains Mono', monospace",

            minimap: {
              enabled: false,
            },

            smoothScrolling: true,

            scrollBeyondLastLine: false,

            automaticLayout: true,

            wordWrap: "on",

            lineNumbers: "on",

            roundedSelection: true,

            cursorBlinking: "smooth",

            padding: {
              top: 16,
            },
          }}
        />

      </div>

    </div>
  );
}