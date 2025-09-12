import Chat from "../features/chat/Chat";
export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Welcome to Chat App</h1>
      <p className="text-gray-600">Select a chat or register/login</p>
      <Chat />
    </div>
  );
}
