import { useState } from "react";

export default function UsernameGate({ onSet }) {
  const [name, setName] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">

      <div className="w-[420px] bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">

        <h1 className="text-4xl font-bold mb-2 text-white">
          Code Together
        </h1>

        <p className="text-slate-400 mb-8">
          Enter a username to join the workspace.
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your username"
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 outline-none"
        />

        <button
          disabled={!name.trim()}
          onClick={() => {
            const username = name.trim();
            const expiry = Date.now() + 60 * 60 * 1000; // 1 hour from now

            localStorage.setItem("username", JSON.stringify({
              value: username,
              expiry: expiry,
            }));

            onSet(name);
          }}
          className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-semibold transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}