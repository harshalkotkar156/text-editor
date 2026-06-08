
import { useState } from "react";
import { useParams } from "react-router-dom";
import UsernameGate from "./components/UsernameGate";
import Sidebar from "./components/Sidebar";
import CodeEditor from "./components/Editor";


export default function App() {
  function getUsername() {
    console.log('Hell')
  const raw = localStorage.getItem("username");
  if (!raw) return null;

  try {
    const { value, expiry } = JSON.parse(raw);

    if (Date.now() > expiry) {
      // expired — remove it
      localStorage.removeItem("username");
      return null;
    }

    return value;
  } catch {
    // old format or corrupted — remove it
    localStorage.removeItem("username");
    return null;
  }
}
  const [username, setUsername] = useState(getUsername());

  const { fileId } = useParams();

  if (!username) {
    return <UsernameGate onSet={setUsername} />;
  }

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden">
      <div className="flex h-full">
        <Sidebar username={username} />

        {fileId ? (
          <CodeEditor
            key={fileId}
            fileId={fileId}
            username={username}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">
                Collaborative Editor
              </h1>

              <p className="text-slate-400">
                Create a file or join a room to start collaborating.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}