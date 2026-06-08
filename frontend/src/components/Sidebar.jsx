import { useEffect, useState } from "react";
import { api } from "../api";
import { useNavigate, useParams } from "react-router-dom";

export default function Sidebar({ username }) {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState("");
  const [lang, setLang] = useState("javascript");

  const nav = useNavigate();
  const { fileId } = useParams();

  const refresh = () => {
    api.list().then(setFiles);
  };

  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    if (!name.trim()) return;

    try {
      const file = await api.create(name.trim(), lang);

      setName("");
      refresh();

      nav(`/room/${file._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const copyLink = (id) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/room/${id}`
    );

    alert("Room link copied!");
  };

  return (
    <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">

      {/* Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold">
            {username?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <h1 className="text-lg font-bold text-white">
              LiveCode
            </h1>

            <p className="text-sm text-slate-400">
              @{username}
            </p>
          </div>

        </div>
      </div>

      {/* Create File */}
      <div className="p-4 border-b border-slate-800">

        <h2 className="text-sm font-medium text-slate-300 mb-3">
          Create New File
        </h2>

        <div className="space-y-3">

          <input
            type="text"
            placeholder="filename.js"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="
              w-full
              px-4
              py-3
              rounded-xl
              bg-slate-800
              border
              border-slate-700
              focus:border-indigo-500
              focus:outline-none
              text-sm
            "
          />

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="
              w-full
              px-4
              py-3
              rounded-xl
              bg-slate-800
              border
              border-slate-700
              focus:border-indigo-500
              focus:outline-none
              text-sm
            "
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
          </select>

          <button
            onClick={create}
            className="
              w-full
              bg-indigo-600
              hover:bg-indigo-500
              transition
              py-3
              rounded-xl
              font-medium
            "
          >
            + Create File
          </button>

        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto p-3">

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-400">
            Files
          </h2>

          <span className="text-xs text-slate-500">
            {files.length}
          </span>
        </div>

        <div className="space-y-2">

          {files.length === 0 && (
            <div className="text-center text-slate-500 text-sm mt-10">
              No files created yet
            </div>
          )}

          {files.map((f) => (
            <div
              key={f._id}
              onClick={() => nav(`/room/${f._id}`)}
              className={`
                group
                p-3
                rounded-xl
                cursor-pointer
                border
                transition-all

                ${
                  fileId === f._id
                    ? "bg-indigo-600/20 border-indigo-500"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
                }
              `}
            >
              <div className="flex justify-between items-center">

                <div className="overflow-hidden">

                  <h3 className="font-medium text-white truncate">
                    {f.name}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1">
                    {f.language}
                  </p>

                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLink(f._id);
                  }}
                  className="
                    opacity-0
                    group-hover:opacity-100
                    transition
                    text-lg
                  "
                >
                  🔗
                </button>

              </div>
            </div>
          ))}

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">

        <div className="bg-slate-800 rounded-xl p-3">

          <p className="text-xs text-slate-400">
            Collaboration Ready
          </p>

          <p className="text-sm mt-1">
            Share room links and code together.
          </p>

        </div>

      </div>

    </aside>
  );
}