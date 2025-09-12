import { useEffect, useState } from "react";
import AxiosInstance from "../../api/AxiosInstance";
import { Paperclip, SquarePen, Trash2, Check } from "lucide-react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { API_URL, WS_URL } from "../../config";

type JwtPayload = {
  sub: string;
  exp: number;
  iat: number;
};

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
};

type Attachment = {
  filename: string;
  file_path: string;
};

type Message = {
  id: number;
  user_id: number;
  receiver_id: number;
  message: string | null;
  created_at: string;
  attachments?: Attachment[];
};

export default function ChatPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const token = Cookies.get("access_token");
  const [userId, setUserId] = useState<number | null>(null);

  // Получаем userId из токена
  useEffect(() => {
    if (token) {
      const decoded = jwtDecode<JwtPayload>(token);
      setUserId(Number(decoded.sub));
    }
  }, [token]);

  // WebSocket подключение
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    console.log("Opening WS...");

    ws.onopen = () => console.log("WS connected");
    ws.onclose = () => console.log("WS disconnected");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data) return;

      // Обработка нового сообщения
      if (data.user_id && data.receiver_id && selectedUser) {
        const isRelevant =
          (data.user_id === selectedUser.id && data.receiver_id === userId) ||
          (data.user_id === userId && data.receiver_id === selectedUser.id);
        if (isRelevant) {
          setMessages((prev) => [...prev, data]);
        }
      }
    };

    /*setMessages((prev) => {
        const isRelevant =
          selectedUser &&
          ((data.user_id === selectedUser.id && data.receiver_id === userId) ||
            (data.user_id === userId && data.receiver_id === selectedUser.id)); 

        return isRelevant ? [...prev, data] : prev;
      });
    };*/

    setSocket(ws);

    return () => {
      console.log("Closing WS...");
      ws.close();
    };
  }, [token]);

  // Загружаем список пользователей
  useEffect(() => {
    if (!token) return;
    AxiosInstance.get("/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setUsers(res.data))
      .catch(console.error);
  }, [token]);

  // Загружаем историю сообщений при смене пользователя
  useEffect(() => {
    if (!selectedUser || !token) return;

    AxiosInstance.get(`/chat/messages/${selectedUser.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => setMessages(res.data))
      .catch(console.error);
  }, [selectedUser, token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;

    if (newMessage.length > 500) {
      setError("Сообщение не может быть длиннее 500 символов");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("message", newMessage);
      formData.append("receiver_id", selectedUser.id.toString());
      files.forEach((file) => formData.append("files", file));

      const res = await AxiosInstance.post("/chat/messages", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const msg: Message = res.data;
      setMessages((prev) => [...prev, msg]);

      // Отправляем через WS для синхронизации с другим клиентом
      socket?.send(JSON.stringify(msg));

      setNewMessage("");
      setFiles([]);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Не удалось отправить сообщение. Попробуйте ещё раз.");
    }
  };

  const startEditing = (m: Message) => {
    setEditingMessageId(m.id);
    setEditingText(m.message || "");
  };

  const saveEdit = async (id: number) => {
    try {
      const res = await AxiosInstance.put(
        `/chat/messages/${id}`,
        { message: editingText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, message: res.data.message } : m))
      );
      setEditingMessageId(null);
      setEditingText("");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMessage = async (id: number) => {
    try {
      await AxiosInstance.delete(`/chat/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Список пользователей */}
      <div className="w-1/4 border-r p-4 border-gray-200">
        <h2 className="text-lg font-bold mb-4">Users</h2>
        <ul>
          {users.map((u) => (
            <li
              key={u.id}
              className={`p-2 rounded cursor-pointer text-purple-950 ${
                selectedUser?.id === u.id ? "bg-blue-200" : "hover:bg-gray-200"
              }`}
              onClick={() => setSelectedUser(u)}
            >
              {u.first_name} {u.last_name}
            </li>
          ))}
        </ul>
      </div>

      {/* Чат */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((m) => {
                const isMine = m.user_id === userId;
                return (
                  <div
                    key={m.id}
                    className={`flex mb-2 ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`p-2 max-w-2xl break-words ${
                        isMine
                          ? "bg-purple-500 text-white rounded-bl-lg rounded-tl-lg rounded-tr-lg"
                          : "bg-gray-200 text-gray-800 rounded-br-lg rounded-tr-lg rounded-tl-lg"
                      }`}
                    >
                      {editingMessageId === m.id ? (
                        <div className="flex gap-1">
                          <input
                            className="flex-1 rounded p-1 text-black"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                          />
                          <button onClick={() => saveEdit(m.id)}>
                            <Check className="w-5 h-5 text-green-500" />
                          </button>
                        </div>
                      ) : (
                        <p>{m.message}</p>
                      )}

                      {m.attachments?.map((a, i) => (
                        <a
                          key={i}
                          href={`${API_URL}/${a.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm underline block mt-1 ${
                            isMine ? "text-purple-200" : "text-blue-600"
                          }`}
                        >
                          📎 {a.filename}
                        </a>
                      ))}

                      <span className="text-xs text-gray-400 block mt-1 text-right">
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {isMine && editingMessageId !== m.id && (
                        <div className="flex gap-2 mt-1">
                          <SquarePen
                            className="w-4 h-4 cursor-pointer text-white hover:text-yellow-300"
                            onClick={() => startEditing(m)}
                          />
                          <Trash2
                            className="w-4 h-4 cursor-pointer text-white hover:text-red-500"
                            onClick={() => deleteMessage(m.id)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Форма ввода */}
            <div className="p-4 border-t flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer">
                  <Paperclip className="w-6 h-6 text-gray-600" />
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {files.length > 0 && (
                  <div className="text-sm text-gray-600">
                    {files.map((f) => f.name).join(", ")}
                  </div>
                )}

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    if (e.target.value.length <= 500) setError(null);
                    else
                      setError("Сообщение не может быть длиннее 500 символов");
                  }}
                  placeholder="Type a message..."
                  className="flex-1 border rounded p-2"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  disabled={!newMessage.trim() || !!error}
                >
                  Send
                </button>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <p className="text-base text-white text-right">
                {newMessage.length}/500
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white">Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
