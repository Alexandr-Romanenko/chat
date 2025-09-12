import React, { useState } from "react";

type Props = {
  onSent?: (message: any) => void;
  token: string; // JWT
};

export default function MessageInput({ onSent, token }: Props) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      // MessageCreate fields: message
      form.append("message", text);

      if (files) {
        for (let i = 0; i < files.length; i++) {
          form.append("files", files.item(i)!); // несколько полей "files"
        }
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // не ставим Content-Type — браузер поставит нужный multipart boundary
        },
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data && data.detail) || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setText("");
      setFiles(null);
      if (onSent) onSent(data);
    } catch (err: any) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
        maxLength={500}
        placeholder="Write a message..."
        className="w-full p-2 border rounded mb-2"
      />
      <div className="flex items-center gap-2">
        <input type="file" multiple onChange={handleFileChange} />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
      {files && files.length > 0 && (
        <div className="mt-2">
          <strong>Files:</strong>
          <ul>
            {Array.from(files).map((f, i) => (
              <li key={i}>
                {f.name} ({Math.round(f.size / 1024)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
